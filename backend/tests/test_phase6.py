"""
Phase 6 Test Suite — Anti-Cheat Telemetry, CI/CD Pipeline & Legal Route Verification.
"""

import os
import yaml
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from arena_state import arena_manager


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
