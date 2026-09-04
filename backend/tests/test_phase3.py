"""
Phase 3 Test Suite — Real-Time Multiplayer Arena Hardening, Elo Rating & WebSocket Synchronization.
"""

import pytest
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from arena_state import arena_manager, calculate_elo_change


# ─── 1. Elo Rating Calculations ─────────────────────────────────────────

def test_elo_calculation_equal_ratings():
    """Equal ratings (1200 vs 1200): Winner gains +16, Loser drops -16."""
    delta_a, delta_b = calculate_elo_change(1200, 1200, 1.0, k_factor=32)
    assert delta_a == 16
    assert delta_b == -16


def test_elo_calculation_underdog_win():
    """Underdog (1000) beats Master (1400): Winner gets large boost, loser drops."""
    delta_underdog, delta_master = calculate_elo_change(1000, 1400, 1.0, k_factor=32)
    assert delta_underdog > 25
    assert delta_master < -25
    assert delta_underdog + delta_master == 0


def test_elo_calculation_draw():
    """Equal ratings draw results in 0 change."""
    delta_a, delta_b = calculate_elo_change(1200, 1200, 0.5, k_factor=32)
    assert delta_a == 0
    assert delta_b == 0


# ─── 2. WebSocket 1v1 Arena Match Lifecycle ─────────────────────────────

def test_arena_full_1v1_match_flow():
    """Simulate 2 concurrent players matching, typing, evaluating, and winning."""
    # Reset arena state
    arena_manager.waiting_queue.clear()
    arena_manager.private_rooms.clear()
    arena_manager.active_matches.clear()
    arena_manager.user_to_match.clear()

    mock_convex = MagicMock()
    mock_convex.query.side_effect = lambda query_name, args=None: (
        [{"_id": "kd7prob1", "title": "Two Sum", "slug": "two-sum"}]
        if "problems" in query_name
        else {"userId": args.get("userId"), "username": f"User_{args.get('userId')}", "eloRating": 1200}
    )
    mock_convex.mutation.return_value = "kd7match123"

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)

        with client.websocket_connect("/api/arena/ws/player_1") as ws1:
            # Player 1 enters queue
            msg1 = ws1.receive_json()
            assert msg1["type"] == "waiting"

            with client.websocket_connect("/api/arena/ws/player_2") as ws2:
                # Player 2 enters queue -> Match found!
                match_msg1 = ws1.receive_json()
                match_msg2 = ws2.receive_json()

                assert match_msg1["type"] == "match_found"
                assert match_msg2["type"] == "match_found"
                assert match_msg1["match_id"] == match_msg2["match_id"]
                assert match_msg1["countdown_seconds"] == 3

                # Test typing event forward
                ws1.send_json({"type": "typing"})
                opp_event = ws2.receive_json()
                assert opp_event["type"] == "opponent_event"
                assert opp_event["event"] == "typing"
                assert opp_event["user_id"] == "player_1"

                # Test intermediate test evaluation forward
                ws2.send_json({"type": "evaluated", "status": "wrong_answer", "passed_count": 2, "total_count": 5})
                opp_eval = ws1.receive_json()
                assert opp_eval["type"] == "opponent_evaluated"
                assert opp_eval["status"] == "wrong_answer"
                assert opp_eval["passed_count"] == 2

                # Player 1 submits accepted solution -> Victory!
                ws1.send_json({"type": "evaluated", "status": "accepted", "passed_count": 5, "total_count": 5})

                # ws2 receives opponent progress notification first
                opp_solved_notice = ws2.receive_json()
                assert opp_solved_notice["type"] == "opponent_evaluated"
                assert opp_solved_notice["status"] == "accepted"

                # Both players receive match_ended event
                end_msg1 = ws1.receive_json()
                end_msg2 = ws2.receive_json()

                assert end_msg1["type"] == "match_ended"
                assert end_msg2["type"] == "match_ended"
                assert end_msg1["winner_id"] == "player_1"
                assert end_msg1["reason"] == "solved"
                assert "elo" in end_msg1
                assert end_msg1["elo"]["player_1"]["delta"] == 16
                assert end_msg1["elo"]["player_2"]["delta"] == -16


def test_arena_private_room_and_forfeit():
    """Test private room joining and forfeit handling."""
    arena_manager.waiting_queue.clear()
    arena_manager.private_rooms.clear()
    arena_manager.active_matches.clear()
    arena_manager.user_to_match.clear()

    mock_convex = MagicMock()
    mock_convex.query.side_effect = lambda query_name, args=None: (
        [{"_id": "kd7prob1", "title": "Reverse String", "slug": "reverse-string"}]
        if "problems" in query_name
        else {"userId": args.get("userId"), "username": f"User_{args.get('userId')}", "eloRating": 1300}
    )

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)

        with client.websocket_connect("/api/arena/ws/host_user?room_code=SECRET123") as ws1:
            msg1 = ws1.receive_json()
            assert msg1["type"] == "waiting_private"
            assert msg1["room_code"] == "SECRET123"

            with client.websocket_connect("/api/arena/ws/guest_user?room_code=SECRET123") as ws2:
                match_msg1 = ws1.receive_json()
                match_msg2 = ws2.receive_json()
                assert match_msg1["type"] == "match_found"
                assert match_msg2["type"] == "match_found"

                # Guest leaves -> Host wins by forfeit
                ws2.send_json({"type": "leave"})

                end_msg1 = ws1.receive_json()
                assert end_msg1["type"] == "match_ended"
                assert end_msg1["winner_id"] == "host_user"
                assert end_msg1["reason"] == "forfeit"


def test_arena_heartbeat_ping_pong():
    """Test WebSocket heartbeat ping-pong."""
    arena_manager.waiting_queue.clear()
    mock_convex = MagicMock()
    mock_convex.query.return_value = {"userId": "ping_user", "username": "Pinger", "eloRating": 1200}

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)
        with client.websocket_connect("/api/arena/ws/ping_user") as ws:
            ws.receive_json() # waiting
            ws.send_json({"type": "ping"})
            pong = ws.receive_json()
            assert pong["type"] == "pong"
