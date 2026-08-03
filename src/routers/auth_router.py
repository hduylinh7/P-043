from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import decode_token
from src.db.database import get_db
from src.models.auth import (
    AuthMessageResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
    VerifyResetCodeRequest,
)
from src.repositories.user_repository import UserRepository
from src.services.auth_service import AuthService
from src.services.redis_service import get_cache, set_cache

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Dependency to retrieve current authenticated user using JWT bearer token & Redis cache."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ hoặc đã hết hạn: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token phải là Access Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Payload token không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Try Redis cache first
    user_cache_key = f"user_cache:{user_id}"
    cached_user = await get_cache(user_cache_key)
    if cached_user:
        try:
            return UserResponse.model_validate_json(cached_user)
        except Exception:
            pass

    # 2. Fallback to DB
    user = await UserRepository.get_by_id(db, user_id)
    if not user or not user.is_active or not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại, chưa xác thực hoặc bị khóa",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_dto = UserResponse.model_validate(user)
    await set_cache(user_cache_key, user_dto.model_dump_json(), expire_seconds=1800)
    return user_dto


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    """Register new user with is_verified=False and dispatch 6-digit OTP code to email."""
    return await AuthService.register(db, payload)


@router.post("/verify-email", response_model=AuthMessageResponse)
async def verify_email(
    payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)
):
    """Verify email using 6-digit OTP code sent to user email."""
    res = await AuthService.verify_email(db, payload.email, payload.code)
    return AuthMessageResponse(message=res["message"])


@router.post("/resend-verification-code", response_model=AuthMessageResponse)
async def resend_verification_code(
    payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)
):
    """Resend 6-digit verification code with 60s cooldown limit."""
    res = await AuthService.resend_verification_code(db, payload.email)
    return AuthMessageResponse(message=res["message"])


@router.post("/login", response_model=TokenResponse)
async def login_user(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT access and refresh tokens (requires is_verified=True)."""
    return await AuthService.login(db, payload.email, payload.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
):
    """Obtain new access token using a valid refresh token."""
    return await AuthService.refresh_tokens(db, payload.refresh_token)


@router.post("/forgot-password", response_model=AuthMessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """Step 1: Request 6-digit OTP password reset code sent via email."""
    res = await AuthService.request_forgot_password(db, payload.email)
    return AuthMessageResponse(message=res["message"])


@router.post("/verify-reset-code", response_model=AuthMessageResponse)
async def verify_reset_code(
    payload: VerifyResetCodeRequest,
):
    """Step 2: Verify 6-digit OTP reset code and return reset session token."""
    res = await AuthService.verify_reset_code(payload.email, payload.code)
    return AuthMessageResponse(message=res["message"], details=res.get("details"))


@router.post("/reset-password", response_model=AuthMessageResponse)
async def reset_password(
    payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """Step 3: Update user password, invalidate reset token and revoke all previous sessions."""
    res = await AuthService.reset_password(db, payload.email, payload.code, payload.new_password)
    return AuthMessageResponse(message=res["message"])


@router.post("/logout", response_model=AuthMessageResponse)
async def logout_user(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
):
    """Logout current user and clear Redis session cache."""
    res = await AuthService.logout(current_user.id, credentials.credentials)
    return AuthMessageResponse(message=res["message"])


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)
):
    """Authenticate or register user using Google OAuth ID Token or Authorization Code."""
    return await AuthService.google_auth(db, payload)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[UserResponse, Depends(get_current_user)]):
    """Get authenticated user profile."""
    return current_user

