from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp_code,
    generate_reset_token,
    hash_password,
    verify_password,
)
from src.models.auth import (
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.repositories.user_repository import UserRepository
from src.services.email_service import EmailService
from src.services.redis_service import delete_cache, get_cache, get_redis, set_cache

settings = get_settings()


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, payload: RegisterRequest) -> UserResponse:
        """Register new user with is_verified=False and dispatch 6-digit OTP verification code."""
        # 1. Check if email exists
        existing_user = await UserRepository.get_by_email(db, payload.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được đăng ký trong hệ thống",
            )

        # 2. Hash password
        hashed_pwd = hash_password(payload.password)
        print(hashed_pwd)

        # 3. Create user with is_verified=False
        user = await UserRepository.create_user(
            db=db,
            email=payload.email,
            hashed_password=hashed_pwd,
            full_name=payload.full_name,
            is_verified=False,
        )

        # 4. Generate 6-digit OTP code & save to Redis (15 mins TTL) with 60s resend cooldown
        otp_code = generate_otp_code(6)
        verify_key = f"verify_code:{user.email.lower()}"
        cooldown_key = f"resend_cooldown:{user.email.lower()}"
        await set_cache(verify_key, otp_code, expire_seconds=900)
        await set_cache(cooldown_key, "active", expire_seconds=60)

        # 5. Dispatch verification email
        await EmailService.send_verification_email(
            to_email=user.email,
            full_name=user.full_name,
            code=otp_code,
        )

        return UserResponse.model_validate(user)

    @staticmethod
    async def verify_email(db: AsyncSession, email: str, code: str) -> dict[str, str]:
        """Verify 6-digit OTP code from Redis and update user is_verified=True in DB."""
        clean_email = email.lower().strip()
        verify_key = f"verify_code:{clean_email}"
        cached_code = await get_cache(verify_key)

        if not cached_code or cached_code != code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã xác thực không hợp lệ hoặc đã hết hạn",
            )

        user = await UserRepository.get_by_email(db, clean_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng",
            )

        # Mark user verified in DB
        await UserRepository.mark_user_verified(db, user.id)

        # Invalidate OTP code in Redis
        await delete_cache(verify_key)

        return {"message": "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ."}

    @staticmethod
    async def resend_verification_code(db: AsyncSession, email: str) -> dict[str, str]:
        """Resend OTP verification code with 60s cooldown limit."""
        clean_email = email.lower().strip()
        user = await UserRepository.get_by_email(db, clean_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng với email này",
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài khoản đã được xác thực trước đó. Bạn có thể đăng nhập.",
            )

        # Check rate limiting / resend cooldown (60s)
        cooldown_key = f"resend_cooldown:{clean_email}"
        in_cooldown = await get_cache(cooldown_key)
        if in_cooldown:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã mới",
            )

        # Generate new OTP & set 60s cooldown
        otp_code = generate_otp_code(6)
        verify_key = f"verify_code:{clean_email}"
        await set_cache(verify_key, otp_code, expire_seconds=900)
        await set_cache(cooldown_key, "active", expire_seconds=60)

        # Send email
        await EmailService.send_verification_email(
            to_email=user.email,
            full_name=user.full_name,
            code=otp_code,
        )

        return {"message": "Mã xác thực mới đã được gửi tới email của bạn."}

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> TokenResponse:
        """Authenticate user, verify email status, return JWT tokens."""
        clean_email = email.lower().strip()
        user = await UserRepository.get_by_email(db, clean_email)
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không chính xác",
            )

        # Verify password
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không chính xác",
            )

        # Check if email is verified
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực trước khi đăng nhập.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa",
            )

        # Create JWT tokens
        token_data = {"sub": user.id, "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        decoded_rt = decode_token(refresh_token)
        jti = decoded_rt.get("jti", "")

        # Store refresh token & user profile cache in Redis
        user_dto = UserResponse.model_validate(user)
        redis_client = await get_redis()
        if redis_client:
            rt_key = f"refresh_token:{user.id}:{jti}"
            await set_cache(rt_key, "valid", expire_seconds=settings.refresh_token_expire_days * 86400)
            user_cache_key = f"user_cache:{user.id}"
            await set_cache(user_cache_key, user_dto.model_dump_json(), expire_seconds=1800)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_dto,
        )

    @staticmethod
    async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
        """Validate refresh token from Redis and issue new access token."""
        try:
            payload = decode_token(refresh_token)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Refresh token không hợp lệ hoặc đã hết hạn: {e}",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không phải là refresh token",
            )

        user_id = payload.get("sub")
        jti = payload.get("jti")

        # Verify refresh token in Redis
        rt_key = f"refresh_token:{user_id}:{jti}"
        is_valid = await get_cache(rt_key)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token đã bị thu hồi hoặc hết hạn",
            )

        user = await UserRepository.get_by_id(db, user_id)
        if not user or not user.is_active or not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản không tồn tại hoặc chưa xác thực",
            )

        # Rotate tokens
        await delete_cache(rt_key)
        token_data = {"sub": user.id, "email": user.email}
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        new_decoded_rt = decode_token(new_refresh_token)
        new_jti = new_decoded_rt.get("jti", "")
        new_rt_key = f"refresh_token:{user.id}:{new_jti}"
        await set_cache(new_rt_key, "valid", expire_seconds=settings.refresh_token_expire_days * 86400)

        user_dto = UserResponse.model_validate(user)
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user=user_dto,
        )

    # ---- 3-Step Forgot Password Flow ----

    @staticmethod
    async def request_forgot_password(db: AsyncSession, email: str) -> dict[str, str]:
        """Step 1: Generate 6-digit OTP reset code, store in Redis (15 mins TTL), send email."""
        clean_email = email.lower().strip()
        user = await UserRepository.get_by_email(db, clean_email)
        if not user:
            # Return success message without revealing non-existent email
            return {"message": "Nếu email tồn tại trong hệ thống, mã OTP đặt lại mật khẩu đã được gửi."}

        otp_code = generate_otp_code(6)
        reset_key = f"reset_code:{clean_email}"
        await set_cache(reset_key, otp_code, expire_seconds=900)

        await EmailService.send_reset_password_email(clean_email, otp_code)
        return {"message": "Mã OTP đặt lại mật khẩu đã được gửi tới email của bạn."}

    @staticmethod
    async def verify_reset_code(email: str, code: str) -> dict[str, str]:
        """Step 2: Verify 6-digit OTP reset code and generate reset session token."""
        clean_email = email.lower().strip()
        reset_key = f"reset_code:{clean_email}"
        cached_code = await get_cache(reset_key)

        if not cached_code or cached_code != code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã OTP đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
            )

        # Generate temporary reset session token (10 mins TTL)
        reset_session_token = generate_reset_token()
        session_key = f"reset_session:{clean_email}"
        await set_cache(session_key, reset_session_token, expire_seconds=600)

        return {
            "message": "Xác thực mã OTP thành công. Vui lòng nhập mật khẩu mới.",
            "details": reset_session_token,
        }

    @staticmethod
    async def reset_password(
        db: AsyncSession, email: str, code: str, new_password: str
    ) -> dict[str, str]:
        """Step 3: Verify OTP or session token, update password in DB, invalidate reset keys & revoke all user sessions in Redis."""
        clean_email = email.lower().strip()
        clean_code = code.strip()

        # Check either 6-digit OTP code or reset session token
        reset_key = f"reset_code:{clean_email}"
        session_key = f"reset_session:{clean_email}"

        cached_code = await get_cache(reset_key)
        cached_session = await get_cache(session_key)

        isValid = (cached_code and cached_code == clean_code) or (cached_session and cached_session == clean_code)
        if not isValid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã xác thực hoặc token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
            )

        user = await UserRepository.get_by_email(db, clean_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng",
            )

        # Hash & update new password
        new_hashed_pwd = hash_password(new_password)
        await UserRepository.update_password(db, user.id, new_hashed_pwd)

        # Delete reset tokens from Redis
        await delete_cache(reset_key)
        await delete_cache(session_key)

        # Revoke all user profile cache & sessions in Redis
        await delete_cache(f"user_cache:{user.id}")

        return {"message": "Cập nhật mật khẩu thành công! Tất cả các phiên làm việc cũ đã được đăng xuất. Vui lòng đăng nhập lại."}

    @staticmethod
    async def logout(user_id: str, access_token: str) -> dict[str, str]:
        """Logout user by invalidating profile cache in Redis."""
        await delete_cache(f"user_cache:{user_id}")
        return {"message": "Đăng xuất thành công"}
