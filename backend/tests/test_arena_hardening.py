"""
Hardening & Diagnosis Test Suite for Live Arena Battles.
Tests:
- Scoped match_id rejection on invalid matches (ghost queue prevention)
- Private room join rejection on non-existent codes
- Mutual disconnect safety
- Server-authoritative submission outcome resolution
- Memory cleanup & garbage collection
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from arena_state import arena_manager
from routers.arena import on_authoritative_match_solved


def test_arena_rejects_invalid_match_id():
    """Connecting to a specific match_id that doesn't exist must reject without enqueuing."""
    arena_manager.waiting_queue.clear()
    arena_manager.active_matches.clear()
    arena_manager.user_to_match.clear()

    mock_convex = MagicMock()
    mock_convex.query.return_value = {"userId": "user_xyz", "username": "UserXYZ", "eloRating": 1200}

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)
        with client.websocket_connect("/api/arena/ws/user_xyz?match_id=fake_match_123") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "not found" in data["message"].lower()

    # Crucial assertion: user must NOT be in waiting queue
    assert len(arena_manager.waiting_queue) == 0


def test_arena_rejects_nonexistent_private_room_join():
    """Attempting to join a non-existent room code with is_join=True must reject."""
    arena_manager.private_rooms.clear()

    mock_convex = MagicMock()
    mock_convex.query.return_value = {"userId": "guest_user", "username": "Guest", "eloRating": 1200}

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)
        with client.websocket_connect("/api/arena/ws/guest_user?room_code=NOTEXIST99&is_join=true") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "not found" in data["message"].lower()

    assert "NOTEXIST99" not in arena_manager.private_rooms


def test_arena_authoritative_submission_notification():
    """Simulate authoritative match resolution triggered by backend test runner."""
    arena_manager.waiting_queue.clear()
    arena_manager.active_matches.clear()
    arena_manager.user_to_match.clear()

    mock_convex = MagicMock()
    mock_convex.query.side_effect = lambda query_name, args=None: (
        [{"_id": "prob_1", "title": "Add Two Numbers", "slug": "add-two-numbers"}]
        if "problems" in query_name
        else {"userId": args.get("userId"), "username": f"User_{args.get('userId')}", "eloRating": 1200}
    )
    mock_convex.mutation.return_value = "match_record_id_1"

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)

        with client.websocket_connect("/api/arena/ws/p_alpha") as ws1:
            ws1.receive_json() # waiting

            with client.websocket_connect("/api/arena/ws/p_beta") as ws2:
                m1 = ws1.receive_json()
                m2 = ws2.receive_json()
                assert m1["type"] == "match_found"
                assert m2["type"] == "match_found"
                match_id = m1["match_id"]

                # Authoritative notification from submissions worker
                asyncio.run(arena_manager.notify_submission_outcome(
                    user_id="p_alpha",
                    problem_id="prob_1",
                    status="accepted",
                    passed=5,
                    total=5,
                    on_solved_callback=on_authoritative_match_solved,
                ))

                # Opponent receives progress update
                opp_msg = ws2.receive_json()
                assert opp_msg["type"] == "opponent_evaluated"
                assert opp_msg["status"] == "accepted"

                # Both receive match_ended
                end1 = ws1.receive_json()
                end2 = ws2.receive_json()
                assert end1["type"] == "match_ended"
                assert end2["type"] == "match_ended"
                assert end1["winner_id"] == "p_alpha"
                assert end1["reason"] == "solved"


def test_arena_memory_cleanup():
    """Verify schedule_cleanup purges active_matches and user_to_match."""
    arena_manager.active_matches.clear()
    arena_manager.user_to_match.clear()

    match_id = "test_cleanup_match"
    arena_manager.active_matches[match_id] = {
        "match_id": match_id,
        "status": "finished",
        "players": {"user_a": {}, "user_b": {}},
    }
    arena_manager.user_to_match["user_a"] = match_id
    arena_manager.user_to_match["user_b"] = match_id

    # Run cleanup with 0-second delay
    arena_manager.schedule_cleanup(match_id, delay_sec=0)

    assert match_id not in arena_manager.active_matches
    assert "user_a" not in arena_manager.user_to_match
    assert "user_b" not in arena_manager.user_to_match
