import sys
import os
from fastapi.testclient import TestClient

# Add parent dir to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

print("--- Testing Login with a dummy user ---")
try:
    response = client.post("/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "wrongpassword"
    })
    print("Login Response Status:", response.status_code)
    print("Login Response Content:", response.json())
except Exception as e:
    print("Login request raised exception:", e)

print("\n--- Testing Signup with new user ---")
try:
    response = client.post("/auth/signup", json={
        "email": "newtestuser@example.com",
        "password": "securepassword123",
        "name": "New Test User",
        "educational_status": "Student",
        "field": "Computer Science / IT"
    })
    print("Signup Response Status:", response.status_code)
    print("Signup Response Content:", response.json())
except Exception as e:
    print("Signup request raised exception:", e)
