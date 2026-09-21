"""
Phase 6 Test Suite — Anti-Cheat Telemetry, CI/CD Pipeline & Legal Route Verification.
"""

import os
import time
import yaml
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from arena_state import arena_manager
from database import get_convex


# ─── 1. Anti-Cheat Telemetry Verification ───────────────────────────────

def test_arena_anticheat_telemetry_event_forwarding():
    """Verify tab switch and large paste anti-cheat events are captured and forwarded."""
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

    with patch("routers.arena.ConvexClient", return_value=mock_convex):
        client = TestClient(app)

        with client.websocket_connect("/api/arena/ws/player_a") as ws_a:
            ws_a.receive_json() # waiting

            with client.websocket_connect("/api/arena/ws/player_b") as ws_b:
                match_a = ws_a.receive_json()
                match_b = ws_b.receive_json()
                match_id = match_a["match_id"]

                # Player A switches tab -> sends anticheat_event
                ws_a.send_json({
                    "type": "anticheat_event",
                    "event": "tab_switch",
                    "details": "User switched browser tab",
                })

                # Player B receives anticheat_warning
                warn_b = ws_b.receive_json()
                assert warn_b["type"] == "anticheat_warning"
                assert warn_b["user_id"] == "player_a"
                assert warn_b["event"] == "tab_switch"

                # Check match internal state
                match = arena_manager.active_matches[match_id]
                flags = match["players"]["player_a"].get("anticheat_flags", [])
                assert len(flags) == 1
                assert flags[0]["event"] == "tab_switch"


# ─── 2. CI/CD Workflow Syntax Verification ──────────────────────────────

def test_github_actions_workflow_syntax():
    """Verify .github/workflows/ci.yml exists and has valid YAML structure."""
    workflow_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", ".github", "workflows", "ci.yml")
    normalized_path = os.path.abspath(workflow_path)

    assert os.path.exists(normalized_path), f"CI workflow missing at {normalized_path}"

    with open(normalized_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "name" in data
    assert "jobs" in data
    assert "backend-tests" in data["jobs"]
    assert "frontend-build" in data["jobs"]


# ─── 3. User Profile Endpoint Verification ─────────────────────────────

def test_get_user_profile_success():
    """Verify GET /api/users/profile/{username} returns user stats, streak, badges, and submissions."""
    mock_convex = MagicMock()
    
    def mock_query(name, args=None):
        if name == "users:getByUsername":
            if args and args.get("username") == "alice":
                return {
                    "_id": "user_doc_1",
                    "userId": "user_alice_123",
                    "username": "alice",
                    "displayName": "Alice Smith",
                    "avatarUrl": "https://example.com/alice.png",
                    "_creationTime": 1718000000000,
                }
            return None
        elif name == "streaks:getByUserId":
            return {
                "userId": "user_alice_123",
                "currentStreak": 7,
                "longestStreak": 14,
                "totalSolves": 25,
                "lastSolveDate": "2026-09-21",
            }
        elif name == "submissions:listByUser":
            return [{
                "_id": "sub_1",
                "problemId": "prob_1",
                "language": "python",
                "status": "accepted",
                "runtimeMs": 42,
                "passedCount": 5,
                "totalCount": 5,
                "_creationTime": 1718000000000,
            }]
        elif name == "badges:listForUser":
            return [{
                "_id": "b_1",
                "name": "Speed Demon",
                "description": "Solved in < 50ms",
                "iconName": "Flame",
                "conditionType": "fast_solve",
                "conditionValue": 1,
                "awardedAt": 1718000000000,
            }]
        return []

    mock_convex.query.side_effect = mock_query

    app.dependency_overrides[get_convex] = lambda: mock_convex
    try:
        client = TestClient(app)
        res = client.get("/api/users/profile/alice")
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "alice"
        assert data["display_name"] == "Alice Smith"
        assert data["avatar_url"] == "https://example.com/alice.png"
        assert data["streak"]["current_streak"] == 7
        assert data["streak"]["total_solves"] == 25
        assert len(data["submissions"]) == 1
        assert data["submissions"][0]["status"] == "accepted"
        assert len(data["badges"]) == 1
        assert data["badges"][0]["badge"]["name"] == "Speed Demon"
    finally:
        app.dependency_overrides.clear()


def test_get_user_profile_not_found():
    """Verify GET /api/users/profile/{username} returns 404 for non-existent users."""
    mock_convex = MagicMock()
    mock_convex.query.return_value = None

    app.dependency_overrides[get_convex] = lambda: mock_convex
    try:
        client = TestClient(app)
        res = client.get("/api/users/profile/nonexistent_coder_xyz")
        assert res.status_code == 404
        assert res.json()["detail"] == "User not found"
    finally:
        app.dependency_overrides.clear()


# ─── 4. Real-time Presence Verification (Online vs Offline) ───────────

def test_presence_manager_lifecycle():
    """Verify PresenceManager records heartbeats, detects timeouts, and handles explicit offline."""
    from presence import PresenceManager
    pm = PresenceManager(timeout_seconds=2)
    
    # Initially offline
    assert not pm.is_online("user_bob")
    assert pm.get_last_seen("user_bob") is None

    # Record heartbeat -> Online
    pm.record_activity("user_bob")
    assert pm.is_online("user_bob")
    assert pm.get_last_seen("user_bob") is not None
    assert "user_bob" in pm.get_all_online_users()

    # Explicit offline
    pm.set_offline("user_bob")
    assert not pm.is_online("user_bob")

    # Re-activate and timeout
    pm.record_activity("user_bob")
    assert pm.is_online("user_bob")
    # Simulate past timestamp beyond timeout
    pm._last_seen["user_bob"] = time.time() - 10
    assert not pm.is_online("user_bob")


def test_presence_heartbeat_and_offline_endpoints():
    """Verify heartbeat and offline API endpoints update user presence."""
    from presence import presence_manager
    from auth import get_current_user
    
    app.dependency_overrides[get_current_user] = lambda: {"id": "user_test_presence"}
    try:
        client = TestClient(app)
        
        # Call heartbeat
        res = client.post("/api/users/heartbeat")
        assert res.status_code == 200
        assert res.json()["is_online"] is True
        assert presence_manager.is_online("user_test_presence") is True

        # Call offline
        res = client.post("/api/users/offline")
        assert res.status_code == 200
        assert res.json()["is_online"] is False
        assert presence_manager.is_online("user_test_presence") is False
    finally:
        app.dependency_overrides.clear()


def test_friends_and_profile_reflect_online_offline():
    """Verify friends list and user profile accurately report online vs offline status."""
    from presence import presence_manager
    from auth import get_required_user

    mock_convex = MagicMock()
    mock_convex.query.side_effect = lambda name, args=None: (
        [{
            "id": "f_1",
            "user_id": "user_me",
            "friend_id": "user_friend",
            "status": "accepted",
            "friend_username": "charlie",
            "friend_display_name": "Charlie Coder",
            "friend_avatar_url": None,
            "created_at": 1718000000000,
        }]
        if name == "friends:listAllForUser"
        else {
            "_id": "doc_charlie",
            "userId": "user_friend",
            "username": "charlie",
            "displayName": "Charlie Coder",
        }
        if name == "users:getByUsername"
        else {}
    )

    app.dependency_overrides[get_convex] = lambda: mock_convex
    app.dependency_overrides[get_required_user] = lambda: {"id": "user_me"}
    try:
        client = TestClient(app)

        # 1. Charlie is currently OFFLINE
        presence_manager.set_offline("user_friend")
        res_friends = client.get("/api/friends/")
        assert res_friends.status_code == 200
        friends_data = res_friends.json()
        assert len(friends_data) == 1
        assert friends_data[0]["friend_username"] == "charlie"
        assert friends_data[0]["is_online"] is False

        res_profile = client.get("/api/users/profile/charlie")
        assert res_profile.status_code == 200
        assert res_profile.json()["is_online"] is False

        # 2. Charlie comes ONLINE (sends heartbeat)
        presence_manager.record_activity("user_friend")
        res_friends_online = client.get("/api/friends/")
        assert res_friends_online.status_code == 200
        assert res_friends_online.json()[0]["is_online"] is True

        res_profile_online = client.get("/api/users/profile/charlie")
        assert res_profile_online.status_code == 200
        assert res_profile_online.json()["is_online"] is True
    finally:
        app.dependency_overrides.clear()


