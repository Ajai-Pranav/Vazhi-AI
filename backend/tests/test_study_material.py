"""
tests/test_study_material.py
────────────────────────────────────────────────────────────────────────────
Integration tests for the /study-material endpoints.

Uses the shared conftest.py fixtures (SQLite, rolled-back per-test session,
TestClient with cookie-based auth).  The Groq LLM call is mocked so tests
run instantly without a real API key.
"""

import pytest
from unittest.mock import patch, AsyncMock

# ── Helpers ───────────────────────────────────────────────────────────────────

SIGNUP_PAYLOAD = {
    "email": "studymaterial@example.com",
    "password": "TestPass123",
    "name": "Study Tester",
}

VALID_REQUEST = {
    "topics": ["Python Basics"],
    "difficulty": "Comprehensive",
    "output_length": "Short",
    "language": "English",
}

MOCK_MARKDOWN = (
    "## Introduction\nPython is a versatile language.\n\n"
    "## Fundamental Concepts\n- Variables\n- Data types\n\n"
    "## Core Theory\nDynamic typing.\n\n"
    "## Detailed Explanations\nMore details here.\n\n"
    "## Practical Examples\n```python\nprint('Hello')\n```\n\n"
    "## Diagrams & Flowchart Suggestions\nFlowchart of execution.\n\n"
    "## Real-World Applications\nWeb, data science, automation.\n\n"
    "## Common Mistakes & Misconceptions\nMutable default args.\n\n"
    "## Best Practices\n- [ ] Use virtual environments\n\n"
    "## Interview & Exam Questions\n**Q:** What is GIL?\n**A:** ...\n\n"
    "## Summary\nPython is great.\n\n"
    "## Key Takeaways\n- Simple syntax\n\n"
    "## References & Further Learning\n- [Docs](https://docs.python.org)\n"
)


def _signup_and_login(client):
    """Register a fresh user and return an authenticated client."""
    client.post("/auth/signup", json=SIGNUP_PAYLOAD)
    client.post("/auth/login", json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]})
    return client


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestGenerateStudyMaterial:
    """POST /study-material/generate"""

    def test_generate_success(self, client):
        """Valid request returns 201 with markdown_content."""
        _signup_and_login(client)
        with patch(
            "routes.study_material.generate_study_material",
            new=AsyncMock(return_value=MOCK_MARKDOWN),
        ):
            res = client.post("/study-material/generate", json=VALID_REQUEST)
        assert res.status_code == 201
        data = res.json()
        assert "id" in data
        assert data["markdown_content"] == MOCK_MARKDOWN
        assert data["topics"] == ["Python Basics"]
        assert data["difficulty"] == "Comprehensive"

    def test_generate_unauthenticated(self, client):
        """Unauthenticated request returns 401."""
        res = client.post("/study-material/generate", json=VALID_REQUEST)
        assert res.status_code == 401

    def test_generate_empty_topics(self, client):
        """Empty topics list returns 422 validation error."""
        _signup_and_login(client)
        res = client.post("/study-material/generate", json={**VALID_REQUEST, "topics": []})
        assert res.status_code == 422

    def test_generate_too_many_topics(self, client):
        """More than 5 topics returns 422 validation error."""
        _signup_and_login(client)
        payload = {**VALID_REQUEST, "topics": ["T1", "T2", "T3", "T4", "T5", "T6"]}
        res = client.post("/study-material/generate", json=payload)
        assert res.status_code == 422

    def test_generate_invalid_difficulty(self, client):
        """Invalid difficulty value returns 422 validation error."""
        _signup_and_login(client)
        res = client.post("/study-material/generate", json={**VALID_REQUEST, "difficulty": "Expert"})
        assert res.status_code == 422

    def test_generate_invalid_output_length(self, client):
        """Invalid output_length value returns 422 validation error."""
        _signup_and_login(client)
        res = client.post("/study-material/generate", json={**VALID_REQUEST, "output_length": "Extreme"})
        assert res.status_code == 422

    def test_generate_multiple_topics(self, client):
        """Up to 5 topics is accepted."""
        _signup_and_login(client)
        payload = {**VALID_REQUEST, "topics": ["Python", "FastAPI", "SQL"]}
        with patch(
            "routes.study_material.generate_study_material",
            new=AsyncMock(return_value=MOCK_MARKDOWN),
        ):
            res = client.post("/study-material/generate", json=payload)
        assert res.status_code == 201
        assert res.json()["topics"] == ["Python", "FastAPI", "SQL"]

    def test_generate_llm_failure_returns_502(self, client):
        """If Groq LLM raises an exception, the endpoint returns 502."""
        _signup_and_login(client)
        with patch(
            "routes.study_material.generate_study_material",
            new=AsyncMock(side_effect=Exception("Groq timeout")),
        ):
            res = client.post("/study-material/generate", json=VALID_REQUEST)
        assert res.status_code == 502


class TestStudyMaterialHistory:
    """GET /study-material/history"""

    def test_history_empty(self, client):
        """Newly registered user has no history."""
        _signup_and_login(client)
        res = client.get("/study-material/history")
        assert res.status_code == 200
        assert res.json() == []

    def test_history_after_generation(self, client):
        """After generating, history contains one entry."""
        _signup_and_login(client)
        with patch(
            "routes.study_material.generate_study_material",
            new=AsyncMock(return_value=MOCK_MARKDOWN),
        ):
            client.post("/study-material/generate", json=VALID_REQUEST)
        res = client.get("/study-material/history")
        assert res.status_code == 200
        assert len(res.json()) == 1
        # History items should NOT include markdown_content (bandwidth saving)
        assert "markdown_content" not in res.json()[0]

    def test_history_unauthenticated(self, client):
        """Unauthenticated request returns 401."""
        res = client.get("/study-material/history")
        assert res.status_code == 401


class TestFetchAndDeleteStudyMaterial:
    """GET /study-material/{id} and DELETE /study-material/{id}"""

    def _generate_one(self, client):
        with patch(
            "routes.study_material.generate_study_material",
            new=AsyncMock(return_value=MOCK_MARKDOWN),
        ):
            res = client.post("/study-material/generate", json=VALID_REQUEST)
        return res.json()["id"]

    def test_fetch_existing(self, client):
        _signup_and_login(client)
        material_id = self._generate_one(client)
        res = client.get(f"/study-material/{material_id}")
        assert res.status_code == 200
        assert res.json()["markdown_content"] == MOCK_MARKDOWN

    def test_fetch_not_found(self, client):
        _signup_and_login(client)
        res = client.get("/study-material/nonexistent-id-12345")
        assert res.status_code == 404

    def test_delete_existing(self, client):
        _signup_and_login(client)
        material_id = self._generate_one(client)
        res = client.delete(f"/study-material/{material_id}")
        assert res.status_code == 204
        # Confirm it's gone
        res2 = client.get(f"/study-material/{material_id}")
        assert res2.status_code == 404

    def test_delete_not_found(self, client):
        _signup_and_login(client)
        res = client.delete("/study-material/nonexistent-id-12345")
        assert res.status_code == 404
