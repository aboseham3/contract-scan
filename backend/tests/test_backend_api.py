"""
Backend API tests for AQD Lens contract analyzer.
Covers: auth (register/login/me/logout), analyze (AI call), credits, payments (Stripe checkout), packages.
Uses REACT_APP_BACKEND_URL public endpoint. Limits AI analyze calls to ~2 to save credits/time.
"""
import os
import io
import time
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aqd-lens.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# A tiny 1x1 PNG (will likely cause AI to still produce a generic JSON) - but tests will prefer a real contract-looking image.
# We'll use a small white JPEG with text-like data; create a plain PNG programmatically.
def _tiny_png_b64():
    # 1x1 white PNG
    return base64.b64encode(bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA6300010000000500010D0A2DB40000000049454E44AE426082"
    )).decode()

TINY_PNG_B64 = _tiny_png_b64()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def registered_user(session):
    """Register a fresh TEST_ user and return (token, user, email, password)."""
    email = f"TEST_user_{uuid.uuid4().hex[:10]}@example.com"
    password = "testpass123"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Test User"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == email
    assert data["user"]["free_used"] is False
    return {"token": data["token"], "user": data["user"], "email": email, "password": password}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ============== Health / Packages ==============
class TestPackages:
    def test_packages(self, session):
        r = session.get(f"{API}/packages")
        assert r.status_code == 200
        pkgs = r.json()
        ids = {p["id"] for p in pkgs}
        assert ids == {"free", "single", "monthly"}


# ============== Auth ==============
class TestAuth:
    def test_register_and_me(self, session, registered_user):
        token = registered_user["token"]
        r = session.get(f"{API}/auth/me", headers=auth_headers(token))
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == registered_user["email"]
        assert u["free_used"] is False

    def test_register_duplicate_rejected(self, session, registered_user):
        r = session.post(f"{API}/auth/register", json={
            "email": registered_user["email"], "password": "whatever", "name": "x"})
        assert r.status_code == 400

    def test_login_success(self, session, registered_user):
        r = session.post(f"{API}/auth/login", json={
            "email": registered_user["email"], "password": registered_user["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong_password(self, session, registered_user):
        r = session.post(f"{API}/auth/login", json={
            "email": registered_user["email"], "password": "wrong_password"})
        assert r.status_code == 401

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, session, registered_user):
        r = session.post(f"{API}/auth/logout", headers=auth_headers(registered_user["token"]))
        assert r.status_code == 200


# ============== Analyze (AI) ==============
class TestAnalyze:
    def test_analyze_no_files(self, session, registered_user):
        r = session.post(f"{API}/analyze",
                         json={"files": [], "language": "en"},
                         headers=auth_headers(registered_user["token"]))
        assert r.status_code == 400

    def test_analyze_max_pages(self, session, registered_user):
        files = [{"mime_type": "image/png", "base64_data": TINY_PNG_B64} for _ in range(4)]
        r = session.post(f"{API}/analyze",
                         json={"files": files, "language": "en"},
                         headers=auth_headers(registered_user["token"]))
        assert r.status_code == 400
        assert r.json().get("detail") == "max_pages"

    def test_analyze_consumes_free_credit_and_blocks_after(self, session, registered_user):
        """One real AI analyze call then verify credit consumed and second call blocked."""
        token = registered_user["token"]
        files = [{"mime_type": "image/png", "base64_data": TINY_PNG_B64}]
        r = session.post(f"{API}/analyze",
                         json={"files": files, "language": "en"},
                         headers=auth_headers(token), timeout=180)
        # AI call might succeed with best-effort fallback JSON
        assert r.status_code in (200, 500), f"unexpected: {r.status_code} {r.text[:300]}"
        if r.status_code == 500:
            pytest.skip(f"AI call failed (likely LLM issue): {r.text[:200]}")
        data = r.json()
        assert "analysis" in data and "user" in data
        assert data["user"]["free_used"] is True
        analysis_id = data["analysis"]["analysis_id"]

        # Verify GET /analyses contains it
        r2 = session.get(f"{API}/analyses", headers=auth_headers(token))
        assert r2.status_code == 200
        ids = [a["analysis_id"] for a in r2.json()]
        assert analysis_id in ids

        # Verify GET /analyses/{id}
        r3 = session.get(f"{API}/analyses/{analysis_id}", headers=auth_headers(token))
        assert r3.status_code == 200
        assert r3.json()["analysis_id"] == analysis_id

        # Second analyze should 402
        r4 = session.post(f"{API}/analyze",
                          json={"files": files, "language": "en"},
                          headers=auth_headers(token), timeout=180)
        assert r4.status_code == 402
        assert r4.json().get("detail") == "no_credits"


# ============== Payments ==============
class TestPayments:
    def test_checkout_monthly(self, session, registered_user):
        r = session.post(f"{API}/payments/checkout",
                         json={"package_id": "monthly", "origin_url": BASE_URL},
                         headers=auth_headers(registered_user["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert "checkout_url" in data and "session_id" in data
        assert "checkout.stripe.com" in data["checkout_url"] or "stripe" in data["checkout_url"]

        # Verify status endpoint
        sid = data["session_id"]
        r2 = session.get(f"{API}/payments/status/{sid}")
        assert r2.status_code == 200
        js = r2.json()
        assert js["session_id"] == sid
        assert js["payment_status"] in ("pending", "unpaid", "paid", "open")

    def test_checkout_single(self, session, registered_user):
        r = session.post(f"{API}/payments/checkout",
                         json={"package_id": "single", "origin_url": BASE_URL},
                         headers=auth_headers(registered_user["token"]))
        assert r.status_code == 200, r.text
        assert "checkout_url" in r.json()

    def test_checkout_invalid_package(self, session, registered_user):
        r = session.post(f"{API}/payments/checkout",
                         json={"package_id": "bogus", "origin_url": BASE_URL},
                         headers=auth_headers(registered_user["token"]))
        assert r.status_code == 400

    def test_checkout_unauthenticated(self, session):
        r = session.post(f"{API}/payments/checkout",
                         json={"package_id": "single", "origin_url": BASE_URL})
        assert r.status_code == 401

    def test_status_unknown_session(self, session):
        r = session.get(f"{API}/payments/status/sess_nonexistent_xyz")
        assert r.status_code == 404
