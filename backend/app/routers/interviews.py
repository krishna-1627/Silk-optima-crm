import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.interview import AIInterview
from app.models.user import User
from app.services.email_service import send_interview_invitation_email
from app.core.config import get_settings

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


router = APIRouter(prefix="/api/admin/interviews", tags=["Admin AI Interviews"])


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class CandidateSearchResult(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    designation: Optional[str] = None
    account_status: str
    has_scheduled_interview: bool = False

    class Config:
        from_attributes = True


class ScheduleInterviewRequest(BaseModel):
    candidate_id: int
    candidate_email: EmailStr
    job_role: Optional[str] = None
    scheduled_date: str
    time_slot: str
    turns_limit: int = 5
    duration_minutes: int = 30
    expires_in_hours: int = 24
    notes: Optional[str] = None


class InterviewResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_email: str
    candidate_name: str
    job_role: Optional[str] = None
    scheduled_date: str
    time_slot: str
    turns_limit: int
    duration_minutes: int
    token: str
    interview_url: str
    status: str
    created_at: datetime
    expires_at: datetime
    notes: Optional[str] = None
    summary: Optional[str] = None
    transcript: Optional[str] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True



class VerifyTokenResponse(BaseModel):
    valid: bool
    status: str
    candidate_name: str
    candidate_email: str
    job_role: Optional[str] = None
    turns_limit: int
    duration_minutes: int
    scheduled_date: str
    time_slot: str
    message: str


class CompleteInterviewWebhookRequest(BaseModel):
    token: str
    summary: Optional[str] = None
    transcript: Optional[str] = None


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.get("/candidates-search", response_model=List[CandidateSearchResult])
def search_candidates_for_interview(
    q: str = Query("", min_length=1, description="Search term for email or name"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """Search registered candidates/users by email or name."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    search_term = f"%{q.strip()}%"
    users = (
        db.query(User)
        .filter(
            User.role != "admin",
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
            ),
        )
        .limit(10)
        .all()
    )

    results = []
    for u in users:
        active_interview = (
            db.query(AIInterview)
            .filter(
                AIInterview.candidate_id == u.id,
                AIInterview.status == "SCHEDULED",
                AIInterview.expires_at > utc_now(),
            )
            .first()
        )
        results.append(
            CandidateSearchResult(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                designation=getattr(u, "designation", None),
                account_status=u.account_status,
                has_scheduled_interview=bool(active_interview),
            )
        )

    return results


@router.post("/schedule", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def schedule_ai_interview(
    payload: ScheduleInterviewRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """Schedule an AI interview session, generate unique link, and dispatch email."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    candidate = db.query(User).filter(User.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Check for duplicate active scheduled interview
    existing_active = (
        db.query(AIInterview)
        .filter(
            AIInterview.candidate_id == candidate.id,
            AIInterview.status == "SCHEDULED",
            AIInterview.expires_at > utc_now(),
        )
        .first()
    )
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail=f"An active interview is already scheduled for this candidate on {existing_active.scheduled_date} ({existing_active.time_slot}).",
        )

    # Generate secure single-use token & URL
    token = secrets.token_urlsafe(32)
    settings = get_settings()
    base_url = settings.AI_INTERVIEW_FRONTEND_URL.rstrip('/')
    interview_url = f"{base_url}/?token={token}"

    expires_at = utc_now() + timedelta(hours=payload.expires_in_hours)
    expiry_formatted = expires_at.strftime("%b %d, %Y %I:%M %p UTC")

    ai_interview = AIInterview(
        candidate_id=candidate.id,
        candidate_email=candidate.email,
        candidate_name=candidate.full_name,
        job_role=payload.job_role or getattr(candidate, "designation", "Candidate"),
        scheduled_date=payload.scheduled_date,
        time_slot=payload.time_slot,
        turns_limit=payload.turns_limit,
        duration_minutes=payload.duration_minutes,
        token=token,
        interview_url=interview_url,
        status="SCHEDULED",
        expires_at=expires_at,
        notes=payload.notes,
    )

    db.add(ai_interview)
    db.commit()
    db.refresh(ai_interview)

    # Dispatch Invitation Email via SMTP
    send_interview_invitation_email(
        to_email=candidate.email,
        candidate_name=candidate.full_name,
        job_role=ai_interview.job_role,
        scheduled_date=payload.scheduled_date,
        time_slot=payload.time_slot,
        turns_limit=payload.turns_limit,
        duration_minutes=payload.duration_minutes,
        interview_url=interview_url,
        expiry_formatted=expiry_formatted,
    )

    return ai_interview


@router.get("", response_model=List[InterviewResponse])
@router.get("/", response_model=List[InterviewResponse])
def get_all_interviews(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):

    """Retrieve all scheduled and historical AI interviews."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    interviews = db.query(AIInterview).order_by(AIInterview.created_at.desc()).all()

    now = utc_now()
    updated = False
    for item in interviews:
        exp = item.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if item.status == "SCHEDULED" and exp < now:
            item.status = "EXPIRED"
            updated = True
    if updated:
        db.commit()

    return interviews


@router.patch("/{interview_id}/cancel", response_model=InterviewResponse)
def cancel_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """Cancel an active scheduled interview."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    interview = db.query(AIInterview).filter(AIInterview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status = "CANCELLED"
    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_200_OK)
def delete_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """Delete an interview completely from the database (only for admin)."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    interview = db.query(AIInterview).filter(AIInterview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    db.delete(interview)
    db.commit()
    return {"message": "Interview deleted successfully", "id": interview_id}



# -------------------------------------------------------------
# Phase 2 Endpoints (Public Handshake for AI Interviewer App)
# -------------------------------------------------------------
@router.get("/verify-token", response_model=VerifyTokenResponse)
def verify_interview_token(
    token: str = Query(..., description="Unique interview access token"),
    db: Session = Depends(get_db),
):
    """
    Public endpoint consumed by silk-orb frontend test application.
    Validates token, checks expiry, and ensures interview has not already been completed.
    """
    interview = db.query(AIInterview).filter(AIInterview.token == token.strip()).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid interview invitation token.",
        )

    # Check already completed
    if interview.status == "COMPLETED":
        return VerifyTokenResponse(
            valid=False,
            status="COMPLETED",
            candidate_name=interview.candidate_name,
            candidate_email=interview.candidate_email,
            job_role=interview.job_role,
            turns_limit=interview.turns_limit,
            duration_minutes=interview.duration_minutes,
            scheduled_date=interview.scheduled_date,
            time_slot=interview.time_slot,
            message="This interview session has already been completed.",
        )

    # Check cancelled
    if interview.status == "CANCELLED":
        return VerifyTokenResponse(
            valid=False,
            status="CANCELLED",
            candidate_name=interview.candidate_name,
            candidate_email=interview.candidate_email,
            job_role=interview.job_role,
            turns_limit=interview.turns_limit,
            duration_minutes=interview.duration_minutes,
            scheduled_date=interview.scheduled_date,
            time_slot=interview.time_slot,
            message="This interview invitation was cancelled by administrator.",
        )

    # Check expired
    exp = interview.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < utc_now() or interview.status == "EXPIRED":
        interview.status = "EXPIRED"
        db.commit()
        return VerifyTokenResponse(
            valid=False,
            status="EXPIRED",
            candidate_name=interview.candidate_name,
            candidate_email=interview.candidate_email,
            job_role=interview.job_role,
            turns_limit=interview.turns_limit,
            duration_minutes=interview.duration_minutes,
            scheduled_date=interview.scheduled_date,
            time_slot=interview.time_slot,
            message="This interview link has expired. Please contact recruiter to reschedule.",
        )

    return VerifyTokenResponse(
        valid=True,
        status="SCHEDULED",
        candidate_name=interview.candidate_name,
        candidate_email=interview.candidate_email,
        job_role=interview.job_role,
        turns_limit=interview.turns_limit,
        duration_minutes=interview.duration_minutes,
        scheduled_date=interview.scheduled_date,
        time_slot=interview.time_slot,
        message="Interview token verified successfully.",
    )


@router.post("/webhook/complete", status_code=status.HTTP_200_OK)
def complete_interview_webhook(
    payload: CompleteInterviewWebhookRequest,
    db: Session = Depends(get_db),
):
    """
    Webhook called by AI Interviewer upon completion of the candidate's session.
    Receives candidate summary evaluation and full transcript.
    """
    interview = db.query(AIInterview).filter(AIInterview.token == payload.token.strip()).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session token not found.",
        )

    interview.status = "COMPLETED"
    interview.completed_at = utc_now()
    if payload.summary:
        interview.summary = payload.summary
    if payload.transcript:
        interview.transcript = payload.transcript

    db.commit()
    db.refresh(interview)

    print(f"[AI INTERVIEW COMPLETE] Candidate {interview.candidate_name} completed session.")
    return {
        "success": True,
        "message": "Interview results saved successfully.",
        "interview_id": interview.id,
        "candidate": interview.candidate_name,
        "status": interview.status,
    }

