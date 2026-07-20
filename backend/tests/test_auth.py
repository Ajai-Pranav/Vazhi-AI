"""
tests/test_auth.py
──────────────────
Integration tests for authentication endpoints:
  POST /auth/signup
  POST /auth/login
  GET  /auth/me
  PUT  /auth/profile
"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def _signup(client, email="test@example.com", password="securepassword123",
            name="Test User", status="Student", field="Computer Science / IT"):
    return client.post("/auth/signup", json={
        "email": email,
        "password": password,
        "name": name,
        "educational_status": status,
        "field": field,
    })


def _login(client, email, password="securepassword123"):
    return client.post("/auth/login", json={"email": email, "password": password})


# ── Signup tests ──────────────────────────────────────────────────────────────

def test_signup_success(client):
    res = _signup(client, email="signupok@example.com")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "signupok@example.com"
    assert data["user"]["name"] == "Test User"
    assert data["user"]["has_profile"] is False


def test_signup_duplicate_email(client):
    _signup(client, email="dup@example.com")
    res = _signup(client, email="dup@example.com")
    assert res.status_code == 400
    assert res.json()["detail"] == "Email already registered"


def test_signup_short_password(client):
    res = client.post("/auth/signup", json={
        "email": "short@example.com",
        "password": "abc",
        "name": "Short Pass",
    })
    assert res.status_code == 422   # Pydantic validation error


# ── Login tests ───────────────────────────────────────────────────────────────

def test_login_success(client):
    _signup(client, email="loginok@example.com")
    res = _login(client, email="loginok@example.com")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "loginok@example.com"


def test_login_wrong_password(client):
    _signup(client, email="wrongpw@example.com")
    res = client.post("/auth/login", json={
        "email": "wrongpw@example.com",
        "password": "totally_wrong"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password"


def test_login_nonexistent_user(client):
    res = _login(client, email="ghost@example.com")
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password"


# ── Profile tests ─────────────────────────────────────────────────────────────

def test_get_me_returns_profile(client):
    _signup(client, email="meuser@example.com", name="Me User")
    # Cookie is set; GET /auth/me should work
    res = client.get("/auth/me")
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Me User"


def test_update_profile(client):
    _signup(client, email="upduser@example.com", name="Upd User")

    res = client.put("/auth/profile", json={
        "name": "Updated Name",
        "dream_job": "Staff Engineer",
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["name"] == "Updated Name"
    assert data["dream_job"] == "Staff Engineer"


def test_get_me_without_auth_returns_401(client):
    # Fresh client has no cookies — not authenticated
    res = client.get("/auth/me")
    assert res.status_code == 401
