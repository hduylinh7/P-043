from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, max_length=100, description="User password (min 6 chars)")
    full_name: str = Field(..., min_length=2, max_length=255, description="User full name")


class VerifyEmailRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address to verify")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class ResendVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address to resend verification code to")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User password")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="User email to send reset instructions to")


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit password reset OTP code")


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    code: str = Field(..., description="Password reset code or verified session token")
    new_password: str = Field(..., min_length=6, max_length=100, description="New password (min 6 chars)")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="JWT Refresh Token")


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    is_verified: bool = False

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthMessageResponse(BaseModel):
    message: str
    details: str | None = None


class GoogleAuthRequest(BaseModel):
    credential: str | None = Field(default=None, description="Google ID Token from Google Identity Services")
    id_token: str | None = Field(default=None, description="Google ID Token alias")
    code: str | None = Field(default=None, description="Authorization code from Google OAuth flow")
    redirect_uri: str | None = Field(default="postmessage", description="Redirect URI used when exchanging code")
