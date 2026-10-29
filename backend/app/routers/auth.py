import importlib
import json
import os
import re
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta
from email.message import EmailMessage
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel  # <-- NEW IMPORT
from sqlalchemy.orm import Session

from app.auth.jwt_handler import create_access_token
from app.core.config import get_settings
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.candidate import Candidate
from app.models.employee import Employee
from app.models.update_request import UpdateRequest
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordOtpRequest,
    ForgotPasswordRequest,
    ForgotPasswordResetRequest,
    LoginRequest,
    PhoneOtpRequest,
    PhoneOtpUpdateRequest,
    RegisterResponse,
    TokenResponse,
)
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth import hash_password, verify_password

router = APIRouter(tags=["auth"])
settings = get_settings()

OTP_TTL_SECONDS = 300
OTP_RESEND_SECONDS = 30
OTP_STORE: dict[str, dict[str, Any]] = {}
PHONE_OTP_STORE: dict[str, dict[str, Any]] = {}

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
PROFILE_PHOTOS_DIR = UPLOAD_ROOT / "profile_photos"
RESUMES_DIR = UPLOAD_ROOT / "resumes"
DEGREE_CERTIFICATES_DIR = UPLOAD_ROOT / "degree_certificates"
PROFILE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
RESUMES_DIR.mkdir(parents=True, exist_ok=True)
DEGREE_CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)


# --- NAYE SCHEMAS REGISTRATION OTP KE LIYE ---
class RegisterSendOtpRequest(BaseModel):
    email: str

class RegisterVerifyOtpRequest(BaseModel):
    email: str
    otp: str
# ---------------------------------------------


def _extract_resume_data(text: str) -> dict[str, Any]:
    email_match = re.search(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", text, re.IGNORECASE)
    phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", text)
    linkedin_match = re.search(r"https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s/]+/?", text, re.IGNORECASE)
    github_match = re.search(r"https?:\/\/(?:www\.)?github\.com\/[^\s/]+/?", text, re.IGNORECASE)

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    full_name = next((line for line in lines if len(line.split()) <= 4 and not re.search(r"@|http", line, re.IGNORECASE)), "")

    skills_candidates = []
    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in ["skill", "technologies", "languages", "tools", "stack"]):
            skills_candidates.append(line)
    skills = " | ".join(skills_candidates[:3]) if skills_candidates else ""

    education_candidates = []
    college = ""
    degree = ""
    graduation_year = ""
    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in ["btech", "be", "bca", "mba", "msc", "bsc", "mtech", "bachelor", "master", "college", "university", "institute", "engineering"]):
            education_candidates.append(line)
            if not college and any(k in lowered for k in ["college", "university", "institute", "iit", "nit", "school"]):
                college = line
            if not degree and any(k in lowered for k in ["btech", "be", "bca", "mba", "msc", "bsc", "mtech", "bachelor", "master"]):
                degree = line
        year_match = re.search(r"\b(20\d{2}|19\d{2})\b", line)
        if year_match and not graduation_year:
            graduation_year = year_match.group(1)

    company_candidates = []
    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in ["company", "inc", "pvt", "ltd", "technologies", "solutions", "corp", "software engineer", "developer", "intern"]):
            company_candidates.append(line)

    project_candidates = []
    for line in lines:
        if "project" in line.lower():
            project_candidates.append(line)

    cert_candidates = []
    for line in lines:
        if any(k in line.lower() for k in ["certif", "aws", "scrum", "certified"]):
            cert_candidates.append(line)

    return {
        "fullName": full_name,
        "email": email_match.group(1) if email_match else "",
        "phone": phone_match.group(1).replace(" ", "") if phone_match else "",
        "linkedin": linkedin_match.group(0) if linkedin_match else "",
        "github": github_match.group(0) if github_match else "",
        "college": college or (" | ".join(education_candidates[:1]) if education_candidates else ""),
        "degree": degree or (" | ".join(education_candidates[:2]) if education_candidates else ""),
        "graduationYear": graduation_year,
        "skills": skills,
        "experience": " | ".join(company_candidates[:2]) if company_candidates else "",
        "companies": " | ".join(company_candidates[:3]) if company_candidates else "",
        "projects": " | ".join(project_candidates[:3]) if project_candidates else "",
        "certifications": " | ".join(cert_candidates[:3]) if cert_candidates else "",
    }


def _extract_resume_text(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        try:
            reader_cls = importlib.import_module("PyPDF2").PdfReader
            reader = reader_cls(BytesIO(file_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
    if suffix == ".docx":
        try:
            document_cls = importlib.import_module("docx").Document
            document = document_cls(BytesIO(file_bytes))
            return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text)
        except Exception:
            return ""
    return ""


def _hash_otp(otp: str) -> str:
    import hashlib

    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def _get_valid_otp_entry(email: str) -> dict[str, Any] | None:
    entry = OTP_STORE.get(email.lower())
    if not entry:
        return None
    expires_at = entry.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at <= datetime.utcnow():
        OTP_STORE.pop(email.lower(), None)
        return None
    return entry


def _get_valid_phone_otp_entry(phone: str) -> dict[str, Any] | None:
    entry = PHONE_OTP_STORE.get(phone)
    if not entry:
        return None
    expires_at = entry.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at <= datetime.utcnow():
        PHONE_OTP_STORE.pop(phone, None)
        return None
    return entry


def _create_otp_payload() -> tuple[str, dict[str, Any]]:
    otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
    expires_at = datetime.utcnow() + timedelta(seconds=OTP_TTL_SECONDS)
    return otp_code, {
        "hashed_otp": _hash_otp(otp_code),
        "expires_at": expires_at,
        "created_at": datetime.utcnow(),
        "verified": False,
    }


def _send_otp_email(email: str, otp_code: str) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587") or "587")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL", "no-reply@silkoptima.com")

    message = EmailMessage()
    message["Subject"] = "Silk Optima verification code"
    message["From"] = from_email
    message["To"] = email
    message.set_content(
        f"Your Silk Optima verification code is {otp_code}. It will expire in 5 minutes."
    )

    if smtp_host:
        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
                if smtp_host.lower().endswith("gmail.com") or smtp_port == 587:
                    smtp.starttls()
                if smtp_username and smtp_password:
                    smtp.login(smtp_username, smtp_password)
                smtp.send_message(message)
            return
        except Exception as exc:
            print(f"SMTP OTP delivery failed: {exc}")

    print(f"[OTP DEV] {email}: {otp_code}")


# ==========================================
# NAYE ENDPOINTS: REGISTRATION EMAIL OTP KE LIYE
# ==========================================
@router.post("/register/send-otp")
def register_send_otp(payload: RegisterSendOtpRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    entry = _get_valid_otp_entry(email)
    if entry:
        elapsed = (datetime.utcnow() - entry["created_at"]).total_seconds()
        if elapsed < OTP_RESEND_SECONDS:
            raise HTTPException(status_code=429, detail="Please wait before requesting a new OTP.")

    otp_code, otp_payload = _create_otp_payload()
    _send_otp_email(email, otp_code)
    OTP_STORE[email] = otp_payload
    return {"message": "Verification code sent to your email."}


@router.post("/register/verify-otp")
def register_verify_otp(payload: RegisterVerifyOtpRequest):
    email = payload.email.lower()
    otp = payload.otp.strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    entry = _get_valid_otp_entry(email)
    if not entry:
        raise HTTPException(status_code=410, detail="OTP has expired. Please request a new one.")

    if _hash_otp(otp) != entry["hashed_otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    entry["verified"] = True
    entry["verified_at"] = datetime.utcnow()
    OTP_STORE[email] = entry
    return {"message": "Email verified successfully."}
# ==========================================


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    
    # ==============================================
    # NAYA CHECK: OTP VERIFICATION
    # ==============================================
    entry = _get_valid_otp_entry(email)
    if not entry or not entry.get("verified"):
        raise HTTPException(status_code=400, detail="Email verification is required before registration.")
    # ==============================================

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    existing_employee = db.query(Employee).join(User).filter(User.email == email).first()
    if existing_employee:
        raise HTTPException(status_code=409, detail="Employee account already exists.")

    user = User(
        email=email,
        full_name=payload.full_name,
        role=payload.role,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        verification_status="Pending",
        account_status="Active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if payload.role == "employee":
        employee = Employee(
            user_id=user.id,
            department="General",
            position=user.role or "Employee",
            status="active",
            verification_status="Pending",
            last_updated=datetime.utcnow(),
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)

        update_request = UpdateRequest(
            request_id=str(uuid.uuid4()),
            employee_id=employee.id,
            source="employee",
            request_type="profile_verification",
            field_name="profile_verification",
            old_value=None,
            new_value=None,
            status="pending",
        )
        db.add(update_request)
        db.commit()

    # Success ke baad OTP clear kar do
    OTP_STORE.pop(email, None)

    token = create_access_token(user.id, role=user.role)
    return {
        "message": "User registered successfully",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
        "access_token": token,
    }


@router.post("/forgot-password/send-otp")
def forgot_password_send_otp(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If an account exists, a verification code has been sent."}

    entry = _get_valid_otp_entry(email)
    if entry:
        elapsed = (datetime.utcnow() - entry["created_at"]).total_seconds()
        if elapsed < OTP_RESEND_SECONDS:
            raise HTTPException(status_code=429, detail="Please wait before requesting a new OTP.")

    otp_code, otp_payload = _create_otp_payload()
    _send_otp_email(email, otp_code)
    OTP_STORE[email] = otp_payload
    return {"message": "If an account exists, a verification code has been sent."}


@router.post("/forgot-password/verify-otp")
def forgot_password_verify_otp(payload: ForgotPasswordOtpRequest):
    email = payload.email.lower()
    otp = payload.otp.strip()
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    entry = _get_valid_otp_entry(email)
    if not entry:
        raise HTTPException(status_code=410, detail="OTP has expired. Please request a new one.")

    if _hash_otp(otp) != entry["hashed_otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    entry["verified"] = True
    entry["verified_at"] = datetime.utcnow()
    OTP_STORE[email] = entry
    return {"message": "OTP verified successfully"}


@router.post("/phone/send-otp")
def send_phone_otp(payload: PhoneOtpRequest, db: Session = Depends(get_db)):
    phone = re.sub(r"\D", "", payload.phone or "")
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit phone number.")

    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number is already associated with another account.")

    entry = _get_valid_phone_otp_entry(phone)
    if entry:
        elapsed = (datetime.utcnow() - entry["created_at"]).total_seconds()
        if elapsed < OTP_RESEND_SECONDS:
            raise HTTPException(status_code=429, detail="Please wait before requesting a new OTP.")

    otp_code, otp_payload = _create_otp_payload()
    print(f"[OTP DEV] {phone}: {otp_code}")
    PHONE_OTP_STORE[phone] = otp_payload
    return {"message": "OTP sent to the provided phone number."}


@router.post("/phone/update")
def update_phone_with_otp(
    payload: PhoneOtpUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    phone = re.sub(r"\D", "", payload.phone or "")
    otp = payload.otp.strip()

    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit phone number.")
    if not otp:
        raise HTTPException(status_code=400, detail="OTP is required.")
    if phone == current_user.phone:
        raise HTTPException(status_code=400, detail="New phone number must be different from the current number.")

    existing = db.query(User).filter(User.phone == phone, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number is already associated with another account.")

    entry = _get_valid_phone_otp_entry(phone)
    if not entry:
        raise HTTPException(status_code=410, detail="OTP has expired. Please request a new one.")
    if _hash_otp(otp) != entry["hashed_otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    current_user.phone = phone
    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    PHONE_OTP_STORE.pop(phone, None)
    return {"message": "Phone number updated successfully"}


@router.post("/forgot-password/reset")
def forgot_password_reset(payload: ForgotPasswordResetRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    otp = payload.otp.strip()
    new_password = payload.new_password.strip()

    if not email or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP, and a new password are required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    entry = _get_valid_otp_entry(email)
    if not entry or not entry.get("verified"):
        raise HTTPException(status_code=400, detail="OTP verification is required")

    if _hash_otp(otp) != entry["hashed_otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user.password_hash = hash_password(new_password)
    user.password_updated_at = datetime.utcnow()
    user.failed_login_attempts = 0
    user.account_locked_until = None
    db.add(user)
    db.commit()
    OTP_STORE.pop(email, None)
    return {"message": "Password reset successfully"}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user and user.is_deleted:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact the administrator.")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.account_locked_until and user.account_locked_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail="Account is temporarily locked. Please try again later.")

    if user.account_locked_until and user.account_locked_until <= datetime.utcnow():
        user.account_locked_until = None
        user.failed_login_attempts = 0

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        user.last_failed_login = datetime.utcnow()
        if user.failed_login_attempts >= 5:
            user.account_locked_until = datetime.utcnow() + timedelta(minutes=15)
        db.add(user)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.last_login = datetime.utcnow()
    db.add(user)
    db.commit()

    access_token = create_access_token(user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
    }


@router.post("/api/admin/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest, db: Session = Depends(get_db)):
    if payload.email != settings.ADMIN_EMAIL or payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    admin_user = db.query(User).filter(User.email == payload.email).first()
    if not admin_user:
        admin_user = User(
            email=payload.email,
            full_name="Administrator",
            role="admin",
            password_hash=hash_password(payload.password),
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    else:
        admin_user.role = "admin"
        admin_user.is_active = True
        admin_user.full_name = admin_user.full_name or "Administrator"
        admin_user.password_hash = hash_password(payload.password)
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    access_token = create_access_token(admin_user.id, role=admin_user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": admin_user.id, "email": admin_user.email, "full_name": admin_user.full_name, "role": admin_user.role},
    }


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()
    return None


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_dict = payload.model_dump(exclude_unset=True)
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if employee is None:
        employee = Employee(
            user_id=current_user.id,
            department="General",
            position=current_user.role or "Candidate",
            status="active",
            last_updated=datetime.utcnow(),
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)

    direct_fields = {
        "application_draft",
        "application_step",
        "application_submitted",
        "application_submitted_at",
        "application_id",
    }

    supported_user_fields = {col.name for col in User.__table__.columns}
    supported_employee_fields = {col.name for col in Employee.__table__.columns}
    request_id = str(uuid.uuid4())

    has_approved_verification = (
        db.query(UpdateRequest)
        .filter(
            UpdateRequest.employee_id == employee.id,
            UpdateRequest.request_type == "profile_verification",
            UpdateRequest.status == "approved",
        )
        .first()
        is not None
    )
    is_verified_employee = (
        has_approved_verification
        or current_user.verification_status == "Verified"
        or employee.verification_status == "Verified"
    )

    non_direct_changes = False

    for field, value in update_dict.items():
        if field in direct_fields:
            if field == "application_draft" and isinstance(value, dict):
                setattr(current_user, field, json.dumps(value))
            else:
                setattr(current_user, field, value)
            continue

        if field in supported_employee_fields:
            old_value = getattr(employee, field, None)
            target = employee
        elif field in supported_user_fields:
            old_value = getattr(current_user, field, None)
            target = current_user
        else:
            continue

        if value == old_value:
            continue

        if is_verified_employee:
            non_direct_changes = True
            update_request = UpdateRequest(
                request_id=request_id,
                employee_id=employee.id,
                source="employee" if field in supported_employee_fields else "user",
                request_type="profile_update",
                field_name=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value) if value is not None else None,
                status="pending",
            )
            db.add(update_request)
        else:
            setattr(target, field, value)

    if non_direct_changes and is_verified_employee:
        current_user.verification_status = "Pending"
        employee.verification_status = "Pending"
        current_user.verification_rejection_reason = None
        employee.verification_rejection_reason = None

    if any(field in direct_fields for field in update_dict) or non_direct_changes:
        current_user.updated_at = datetime.utcnow()
        db.add(current_user)

    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if candidate is None:
        candidate = Candidate(
            user_id=current_user.id,
            phone=current_user.phone or "",
            location=current_user.location or "",
            experience_summary=current_user.skills or "",
            status="Applied",
        )
        db.add(candidate)
    else:
        if current_user.phone:
            candidate.phone = current_user.phone
        if current_user.location:
            candidate.location = current_user.location
        if current_user.skills:
            candidate.experience_summary = current_user.skills

    db.commit()
    db.refresh(current_user)
    return current_user


def _resolve_upload_path(relative_path: str | None) -> Path | None:
    if not relative_path:
        return None

    normalized_path = relative_path.lstrip("/")
    if normalized_path.startswith("uploads/"):
        normalized_path = normalized_path[len("uploads/"):]

    candidate_path = (UPLOAD_ROOT / normalized_path).resolve()
    try:
        candidate_path.relative_to(UPLOAD_ROOT.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid file path") from exc

    return candidate_path


@router.delete("/me/profile-photo", response_model=UserRead)
def remove_profile_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.profile_photo:
        file_path = _resolve_upload_path(current_user.profile_photo)
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)
        current_user.profile_photo = None

    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/profile-photo", response_model=UserRead)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG files are allowed")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be 5 MB or less")

    destination = PROFILE_PHOTOS_DIR / f"{current_user.id}_{datetime.utcnow().timestamp()}{extension}"
    destination.write_bytes(data)
    current_user.profile_photo = f"/uploads/profile_photos/{destination.name}"
    current_user.updated_at = datetime.utcnow()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/resume/download")
def download_resume(current_user: User = Depends(get_current_user)):
    if not current_user.resume_url:
        raise HTTPException(status_code=404, detail="Resume file not found.")

    file_path = _resolve_upload_path(current_user.resume_url)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found.")

    suffix = file_path.suffix.lower()
    media_type = "application/octet-stream"
    if suffix == ".pdf":
        media_type = "application/pdf"
    elif suffix == ".doc":
        media_type = "application/msword"
    elif suffix == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=current_user.resume_filename or file_path.name,
    )


@router.post("/me/degree-certificate", response_model=dict[str, Any])
async def upload_degree_certificate(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in {".pdf", ".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, JPEG, and PNG files are allowed")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be 5 MB or less")

    destination = DEGREE_CERTIFICATES_DIR / f"{current_user.id}_{datetime.utcnow().timestamp()}{extension}"
    destination.write_bytes(data)
    current_user.degree_certificate_url = f"/uploads/degree_certificates/{destination.name}"
    current_user.degree_certificate_filename = file.filename
    current_user.updated_at = datetime.utcnow()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "degree_certificate_url": current_user.degree_certificate_url,
        "degree_certificate_filename": current_user.degree_certificate_filename,
    }


@router.get("/me/degree-certificate/download")
def download_degree_certificate(current_user: User = Depends(get_current_user)):
    if not current_user.degree_certificate_url:
        raise HTTPException(status_code=404, detail="Degree certificate file not found.")

    file_path = _resolve_upload_path(current_user.degree_certificate_url)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Degree certificate file not found.")

    suffix = file_path.suffix.lower()
    media_type = "application/octet-stream"
    if suffix == ".pdf":
        media_type = "application/pdf"
    elif suffix in {".jpg", ".jpeg"}:
        media_type = "image/jpeg"
    elif suffix == ".png":
        media_type = "image/png"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=current_user.degree_certificate_filename or file_path.name,
    )


@router.post("/me/resume/parse")
async def upload_resume_for_parsing(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in {".pdf", ".doc", ".docx"}:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, and DOCX files are allowed")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be 5 MB or less")

    destination = RESUMES_DIR / f"{current_user.id}_{datetime.utcnow().timestamp()}{extension}"
    destination.write_bytes(data)

    current_user.resume_url = f"/uploads/resumes/{destination.name}"
    current_user.resume_filename = file.filename
    current_user.updated_at = datetime.utcnow()

    text = _extract_resume_text(data, file.filename)
    parsed = _extract_resume_data(text)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "user": current_user,
        "parsed": parsed,
        "resume_url": current_user.resume_url,
        "resume_filename": current_user.resume_filename,
    }