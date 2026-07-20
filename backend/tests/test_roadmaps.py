"""
tests/test_roadmaps.py
──────────────────────
Integration tests for roadmap endpoints:
  POST /roadmaps
  GET  /roadmaps/active
  POST /roadmaps/active/confirm
  POST /roadmaps/active/confirm-custom  (LLM call mocked)
"""

from unittest.mock import patch, AsyncMock


# ── Helpers ───────────────────────────────────────────────────────────────────

def _signup_and_login(client, email="rmuser@example.com"):
    """Sign up (which also sets auth cookies) and return the user payload."""
    res = client.post("/auth/signup", json={
        "email": email,
        "password": "securepassword123",
        "name": "Roadmap User",
        "educational_status": "Student",
        "field": "Computer Science / IT",
    })
    assert res.status_code == 200, f"Signup failed: {res.text}"
    return res.json()["user"]


def _post_roadmap(client, title="Learn FastAPI"):
    return client.post("/roadmaps", json={
        "title": title,
        "description": "Integration testing",
        "required_skills": ["Python", "FastAPI"],
        "roadmap_steps": ["Step 1", "Step 2"],
        "estimated_timeline": "1 week",
        "difficulty": "Medium",
    })


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_save_roadmap(client):
    _signup_and_login(client, email="saveroadmap@example.com")

    res = _post_roadmap(client)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["title"] == "Learn FastAPI"
    assert data["is_active"] is True
    assert data["is_confirmed"] is False


def test_get_active_roadmap(client):
    _signup_and_login(client, email="getrm@example.com")
    _post_roadmap(client, title="Active Roadmap")

    res = client.get("/roadmaps/active")
    assert res.status_code == 200, res.text
    assert res.json()["title"] == "Active Roadmap"


def test_get_active_roadmap_not_found(client):
    _signup_and_login(client, email="noroadmap@example.com")
    res = client.get("/roadmaps/active")
    assert res.status_code == 404


def test_confirm_roadmap(client):
    _signup_and_login(client, email="confirmrm@example.com")
    _post_roadmap(client, title="Confirm Me")

    res = client.post("/roadmaps/active/confirm")
    assert res.status_code == 200, res.text
    assert res.json()["is_confirmed"] is True


def test_save_roadmap_requires_auth(client):
    """Without a prior signup/login, roadmap save should return 401."""
    res = _post_roadmap(client)
    assert res.status_code == 401


@patch("routes.roadmaps.generate_roadmap_outline", new_callable=AsyncMock)
def test_confirm_custom_roadmap(mock_generate, client):
    """
    Confirm-custom endpoint should kick off background outline generation.
    The endpoint returns 202 Accepted immediately with a processing status.
    We mock the async LLM call to avoid real network I/O.
    """
    mock_generate.return_value = [
        {
            "day": 1,
            "title": "Day 1: Intro",
            "focus": "Basics",
            "module": "Module 1",
            "difficulty": "Easy",
        }
    ]

    _signup_and_login(client, email="customrm@example.com")
    _post_roadmap(client, title="Custom Roadmap")

    config = {
        "duration_weeks": 4,
        "experience_level": "Beginner",
        "available_time": "2 hours",
        "learning_pace": "Standard",
    }
    res = client.post("/roadmaps/active/confirm-custom", json=config)
    # The endpoint is async and returns 202 Accepted immediately
    assert res.status_code == 202, res.text
    data = res.json()
    assert data["generation_status"] == "processing"
    assert "roadmap_id" in data
    assert data["message"] == "Roadmap outline generation started in background."
