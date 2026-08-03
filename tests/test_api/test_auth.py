import pytest
from httpx import AsyncClient

from src.services.redis_service import get_cache


@pytest.mark.asyncio
async def test_register_user_creates_unverified_account(client: AsyncClient):
    payload = {
        "email": "unverified@example.com",
        "password": "Password123!",
        "full_name": "Unverified User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "unverified@example.com"
    assert data["full_name"] == "Unverified User"
    assert data["is_active"] is True
    assert data["is_verified"] is False
    assert "id" in data

    # Verify OTP code was generated in Redis
    otp_code = await get_cache("verify_code:unverified@example.com")
    assert otp_code is not None
    assert len(otp_code) == 6


@pytest.mark.asyncio
async def test_unverified_user_login_fails_with_403(client: AsyncClient):
    email = "unverified_login@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Test User"},
    )

    # Attempt login without email verification
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert login_res.status_code == 403
    assert "chưa được xác thực" in login_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_verify_email_and_login_success(client: AsyncClient):
    email = "verifyme@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Verify Me"},
    )

    # Fetch OTP from Redis
    otp_code = await get_cache(f"verify_code:{email}")
    assert otp_code is not None

    # Submit verification
    verify_res = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": otp_code},
    )
    assert verify_res.status_code == 200
    assert "thành công" in verify_res.json()["message"].lower()

    # Now login should succeed
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["is_verified"] is True


@pytest.mark.asyncio
async def test_resend_verification_code_cooldown(client: AsyncClient):
    email = "resend@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Resend Test"},
    )

    # Immediate resend attempt should hit 429 cooldown
    resend_res = await client.post(
        "/api/v1/auth/resend-verification-code",
        json={"email": email},
    )
    assert resend_res.status_code == 429
    assert "60 giây" in resend_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_3_step_forgot_and_reset_password_flow(client: AsyncClient):
    email = "forgot3step@example.com"
    # Register & verify email
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "OldPassword123!", "full_name": "Forgot 3Step"},
    )
    otp_verify = await get_cache(f"verify_code:{email}")
    await client.post("/api/v1/auth/verify-email", json={"email": email, "code": otp_verify})

    # Step 1: Request Forgot Password
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    reset_otp = await get_cache(f"reset_code:{email}")
    assert reset_otp is not None
    assert len(reset_otp) == 6

    # Step 2: Verify Reset Code
    verify_step2 = await client.post(
        "/api/v1/auth/verify-reset-code",
        json={"email": email, "code": reset_otp},
    )
    assert verify_step2.status_code == 200
    reset_token = verify_step2.json().get("details")
    assert reset_token is not None

    # Step 3: Reset Password
    reset_step3 = await client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "code": reset_token, "new_password": "NewSecretPassword123!"},
    )
    assert reset_step3.status_code == 200
    assert "thành công" in reset_step3.json()["message"].lower()

    # Old password login should fail
    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "OldPassword123!"},
    )
    assert old_login.status_code == 401

    # New password login should succeed
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "NewSecretPassword123!"},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


@pytest.mark.asyncio
async def test_google_auth_missing_credentials_fails(client: AsyncClient):
    res = await client.post("/api/v1/auth/google", json={})
    assert res.status_code == 400
    assert "vui lòng cung cấp" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_google_auth_mocked_success(client: AsyncClient, monkeypatch):
    import httpx

    fake_google_user = {
        "email": "googleuser@example.com",
        "name": "Google User Test",
        "sub": "google-sub-12345",
        "email_verified": True,
    }

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json = json_data

        def json(self):
            return self._json

    async def mock_get(self, url, params=None, **kwargs):
        if "tokeninfo" in url:
            return MockResponse(200, fake_google_user)
        return MockResponse(404, {})

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = await client.post("/api/v1/auth/google", json={"id_token": "valid-fake-google-token"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "googleuser@example.com"
    assert data["user"]["full_name"] == "Google User Test"
    assert data["user"]["is_verified"] is True

