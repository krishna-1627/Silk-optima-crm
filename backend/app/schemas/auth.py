from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class PhoneOtpRequest(BaseModel):
    phone: str


class PhoneOtpUpdateRequest(BaseModel):
    phone: str
    otp: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict | None = None


class RegisterResponse(BaseModel):
    message: str
    user: dict
    access_token: str
