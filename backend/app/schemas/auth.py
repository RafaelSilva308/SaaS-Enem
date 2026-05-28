from datetime import date

from pydantic import BaseModel, EmailStr, field_validator


def _validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("A senha deve ter no mínimo 8 caracteres")
    if not any(c.isupper() for c in v):
        raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
    if not any(c.isdigit() for c in v):
        raise ValueError("A senha deve conter pelo menos um número")
    return v


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    date_of_birth: date

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class Enable2FARequest(BaseModel):
    pass


class Verify2FARequest(BaseModel):
    totp_code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    email_verified: bool
    role: str
    has_2fa: bool


class AuthResponse(BaseModel):
    tokens: TokenResponse
    user: UserResponse


class Enable2FAResponse(BaseModel):
    totp_uri: str
    secret: str


class MessageResponse(BaseModel):
    message: str
