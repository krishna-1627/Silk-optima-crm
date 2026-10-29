import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.admin_edit_log import AdminEditLog
from app.models.candidate import Candidate
from app.models.employee import Employee
from app.models.update_request import UpdateRequest, UpdateRequestItem
from app.models.user import User
from app.schemas.notification import NotificationRead
from app.schemas.user import UserUpdate
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
DOCUMENTS_DIR = UPLOAD_ROOT / "documents"
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_uploaded_file_path(relative_path: str | None) -> Path | None:
    if not relative_path:
        return None

    normalized_path = relative_path.lstrip("/")
    if normalized_path.startswith("uploads/"):
        normalized_path = normalized_path[len("uploads/"):]

    candidate_path = (UPLOAD_ROOT / normalized_path).resolve()
    try:
        candidate_path.relative_to(UPLOAD_ROOT.resolve())
    except ValueError:
        return None

    return candidate_path


def _delete_uploaded_file(relative_path: str | None) -> None:
    file_path = _resolve_uploaded_file_path(relative_path)
    if file_path and file_path.exists():
        try:
            file_path.unlink(missing_ok=True)
        except OSError:
            pass


def _get_or_create_employee(db: Session, user: User) -> Employee:
    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    if employee is None:
        employee = Employee(
            user_id=user.id,
            department="General",
            position=user.role or "Candidate",
            status="active",
            last_updated=datetime.utcnow(),
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)
    return employee


def _ensure_candidate_record(db: Session, user: User) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if candidate is None:
        candidate = Candidate(
            user_id=user.id,
            phone=user.phone or "",
            location=user.location or "",
            experience_summary=user.skills or "",
            status="Applied",
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
    else:
        if user.phone:
            candidate.phone = user.phone
        if user.location:
            candidate.location = user.location
        if user.skills:
            candidate.experience_summary = user.skills
        db.commit()
        db.refresh(candidate)
    return candidate


def _create_profile_update_request(
    db: Session,
    employee_id: int,
    request_id: str,
    changed_fields: list[dict],
) -> UpdateRequest:
    parent_request = UpdateRequest(
        request_id=request_id,
        employee_id=employee_id,
        source="employee",
        request_type="profile_update",
        field_name="multiple_fields" if len(changed_fields) > 1 else changed_fields[0]["field_name"],
        old_value=changed_fields[0]["old_value"] if len(changed_fields) == 1 else None,
        new_value=changed_fields[0]["new_value"] if len(changed_fields) == 1 else None,
        status="pending",
    )
    db.add(parent_request)
    db.flush()

    for change in changed_fields:
        item = UpdateRequestItem(
            update_request_id=parent_request.id,
            field_name=change["field_name"],
            old_value=change["old_value"],
            new_value=change["new_value"],
            status="pending",
        )
        db.add(item)

    return parent_request


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee_data = payload.model_dump(exclude_unset=True)
    employee_data["user_id"] = employee_data.get("user_id") or current_user.id

    supported_fields = {col.name for col in Employee.__table__.columns}
    employee_data = {key: value for key, value in employee_data.items() if key in supported_fields}

    employee = Employee(**employee_data)
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.get("", response_model=list[EmployeeRead])
def list_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Employee)
        .join(Employee.user)
        .filter(User.is_deleted == False)
        .filter(Employee.position != "admin")
        .options(selectinload(Employee.user))
        .all()
    )


@router.get("/me/profile", response_model=EmployeeRead)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the currently logged-in user's employee profile, creating it lazily if missing."""
    return _get_or_create_employee(db, current_user)


@router.get("/me/notifications", response_model=list[NotificationRead])
def list_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = _get_or_create_employee(db, current_user)
    requests = (
        db.query(UpdateRequest)
        .filter(
            UpdateRequest.employee_id == employee.id,
            UpdateRequest.request_type.in_(["profile_verification", "admin_message"]),
            UpdateRequest.status.in_(["approved", "rejected", "sent"]),
        )
        .order_by(UpdateRequest.updated_at.desc())
        .all()
    )

    notifications = []
    for request in requests:
        if request.request_type == "admin_message":
            notifications.append(
                NotificationRead(
                    id=str(request.request_id or request.id),
                    title="Message from Admin",
                    employee_id=employee.id,
                    employee_name=current_user.full_name,
                    employee_email=current_user.email,
                    event_type="admin_message",
                    created_at=request.updated_at or request.created_at,
                    is_read=False,
                    action_url="/profile",
                    description=request.new_value or "You have a new message from the administrator.",
                )
            )
            continue

        is_approved = request.status == "approved"
        title = "Profile Verification Approved" if is_approved else "Profile Verification Rejected"
        description = (
            "Your profile has been successfully verified."
            if is_approved
            else "Your profile verification was rejected."
        )
        notifications.append(
            NotificationRead(
                id=str(request.request_id or request.id),
                title=title,
                employee_id=employee.id,
                employee_name=current_user.full_name,
                employee_email=current_user.email,
                event_type="profile_verification",
                created_at=request.updated_at or request.created_at,
                is_read=False,
                action_url="/profile",
                description=description,
                reason=request.rejection_reason if not is_approved else None,
            )
        )
    return notifications


@router.put("/me/profile", response_model=EmployeeRead)
def update_my_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update empty fields directly, create pending requests for modifying existing data."""
    employee = _get_or_create_employee(db, current_user)

    update_dict = payload.model_dump(exclude_unset=True)
    supported_user_fields = {col.name for col in User.__table__.columns}
    supported_employee_fields = {col.name for col in Employee.__table__.columns}
    
    # Ye block batata hai kin cheezon ko sidha update karna hai bina admin approval ke
    direct_fields = {
        "application_draft",
        "application_step",
        "application_submitted",
        "application_submitted_at",
        "application_id",
        "status",             # Added to bypass verification flow
        "is_active",          # Added to bypass verification flow
        "employment_status",  # Added to bypass verification flow
    }

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

    is_currently_verified = (
        current_user.verification_status == "Verified"
        or employee.verification_status == "Verified"
    )

    is_verified_employee = has_approved_verification or is_currently_verified

    # ── WORKFLOW 1: Initial Profile Verification (employee NOT yet verified) ──
    if not is_verified_employee:
        for field, value in update_dict.items():
            if field in direct_fields:
                if field == "application_draft" and isinstance(value, dict):
                    setattr(current_user, field, json.dumps(value))
                else:
                    if field in supported_employee_fields:
                        setattr(employee, field, value)
                    if field in supported_user_fields:
                        setattr(current_user, field, value)
                continue

            if field in supported_employee_fields:
                setattr(employee, field, value)
            elif field in supported_user_fields:
                setattr(current_user, field, value)

        current_user.verification_status = "Pending"
        employee.verification_status = "Pending"
        current_user.verification_rejection_reason = None
        employee.verification_rejection_reason = None

        existing_verification_req = db.query(UpdateRequest).filter(
            UpdateRequest.employee_id == employee.id,
            UpdateRequest.request_type == "profile_verification",
            UpdateRequest.status == "pending",
        ).first()

        if not existing_verification_req:
            verification_request_id = str(uuid.uuid4())
            verification_request = UpdateRequest(
                request_id=verification_request_id,
                employee_id=employee.id,
                source="employee",
                request_type="profile_verification",
                field_name="profile_verification",
                old_value=None,
                new_value="Pending Verification",
                status="pending",
            )
            db.add(verification_request)

        current_user.updated_at = datetime.utcnow()
        db.add(current_user)
        db.add(employee)
        db.commit()
        db.refresh(employee)
        _ensure_candidate_record(db, current_user)
        return employee

    # ── WORKFLOW 2: Profile Update Approval (employee already Verified) ──
    changed_fields: list[dict] = []

    for field, value in update_dict.items():
        if field in direct_fields:
            if field == "application_draft" and isinstance(value, dict):
                setattr(current_user, field, json.dumps(value))
            else:
                # Direct updates applied instantly to corresponding models
                if field in supported_employee_fields:
                    setattr(employee, field, value)
                if field in supported_user_fields:
                    setattr(current_user, field, value)
            continue

        if field in supported_employee_fields:
            old_value = getattr(employee, field, None)
        elif field in supported_user_fields:
            old_value = getattr(current_user, field, None)
        else:
            continue

        old_str = str(old_value) if old_value is not None else ""
        new_str = str(value) if value is not None else ""
        if old_str == new_str:
            continue

        if field in ["aadhaar_number", "pan_number"]:
            if old_value is not None and str(old_value).strip() not in ["", "None"]:
                continue

        changed_fields.append({
            "field_name": field,
            "old_value": old_str if old_str else None,
            "new_value": new_str if new_str else None,
        })

    if changed_fields:
        existing_pending = db.query(UpdateRequest).filter(
            UpdateRequest.employee_id == employee.id,
            UpdateRequest.request_type == "profile_update",
            UpdateRequest.status == "pending",
        ).all()
        for old_req in existing_pending:
            old_req.status = "superseded"
            db.add(old_req)

        current_user.verification_status = "Pending"
        employee.verification_status = "Pending"
        current_user.verification_rejection_reason = None
        employee.verification_rejection_reason = None

        _create_profile_update_request(db, employee.id, request_id, changed_fields)

    current_user.updated_at = datetime.utcnow()
    employee.last_updated = datetime.utcnow()
    db.add(employee)
    db.add(current_user)
    db.commit()
    db.refresh(employee)
    _ensure_candidate_record(db, current_user)
    return employee


@router.post("/me/upload-documents")
def upload_government_documents(
    aadhaar_file: Optional[UploadFile] = File(None),
    pan_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload document copies for the employee profile and update timestamp."""
    employee = _get_or_create_employee(db, current_user)

    if aadhaar_file and aadhaar_file.filename:
        suffix = Path(aadhaar_file.filename).suffix.lower()
        filename = f"aadhaar_{employee.id}_{int(datetime.utcnow().timestamp())}{suffix}"
        destination = DOCUMENTS_DIR / filename
        data = aadhaar_file.file.read()
        destination.write_bytes(data)
        relative_path = f"/uploads/documents/{filename}"
        employee.aadhaar_document_path = relative_path
        current_user.aadhaar_number = current_user.aadhaar_number or "Uploaded"

    if pan_file and pan_file.filename:
        suffix = Path(pan_file.filename).suffix.lower()
        filename = f"pan_{employee.id}_{int(datetime.utcnow().timestamp())}{suffix}"
        destination = DOCUMENTS_DIR / filename
        data = pan_file.file.read()
        destination.write_bytes(data)
        relative_path = f"/uploads/documents/{filename}"
        employee.pan_document_path = relative_path
        current_user.pan_number = current_user.pan_number or "Uploaded"

    employee.last_updated = datetime.utcnow()
    document_upload_request_id = str(uuid.uuid4())

    if aadhaar_file and aadhaar_file.filename:
        old_aadhaar_path = employee.aadhaar_document_path
        update_request = UpdateRequest(
            request_id=document_upload_request_id,
            employee_id=employee.id,
            source="employee",
            request_type="document_upload",
            field_name="aadhaar_document_path",
            old_value=str(old_aadhaar_path) if old_aadhaar_path is not None else None,
            new_value=str(employee.aadhaar_document_path) if employee.aadhaar_document_path is not None else None,
            status="pending",
        )
        db.add(update_request)

    if pan_file and pan_file.filename:
        old_pan_path = employee.pan_document_path
        update_request = UpdateRequest(
            request_id=document_upload_request_id,
            employee_id=employee.id,
            source="employee",
            request_type="document_upload",
            field_name="pan_document_path",
            old_value=str(old_pan_path) if old_pan_path is not None else None,
            new_value=str(employee.pan_document_path) if employee.pan_document_path is not None else None,
            status="pending",
        )
        db.add(update_request)

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)

    _ensure_candidate_record(db, current_user)

    return {
        "message": "Documents uploaded successfully",
        "aadhaar_document_path": employee.aadhaar_document_path,
        "pan_document_path": employee.pan_document_path,
        "last_updated": employee.last_updated,
    }


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: int,
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    user = employee.user
    if user is None:
        raise HTTPException(status_code=404, detail="Employee user not found")

    update_payload = payload.model_dump(exclude_unset=True)
    if not update_payload:
        raise HTTPException(status_code=400, detail="No update data provided")

    allowed_employee_fields = {"department", "position", "status"}
    allowed_user_fields = {"full_name", "email", "phone", "role", "location"}

    for field, value in update_payload.items():
        if field in {"employeeId", "name", "email", "phone", "designation", "joiningDate", "lastWorkingDay", "employmentStatus", "experience", "location"}:
            continue
        if field in allowed_employee_fields:
            setattr(employee, field, value)
        elif field in allowed_user_fields:
            setattr(user, field, value)

    if "name" in update_payload and update_payload.get("name") is not None:
        user.full_name = update_payload["name"]
    if "email" in update_payload and update_payload.get("email") is not None:
        user.email = update_payload["email"]
    if "phone" in update_payload and update_payload.get("phone") is not None:
        user.phone = update_payload["phone"]
    if "location" in update_payload and update_payload.get("location") is not None:
        user.location = update_payload["location"]
    if "designation" in update_payload and update_payload.get("designation") is not None:
        employee.position = update_payload["designation"]
    if "joiningDate" in update_payload and update_payload.get("joiningDate") is not None:
        employee.hire_date = datetime.fromisoformat(update_payload["joiningDate"])
    if "status" in update_payload and update_payload.get("status") is not None:
        employee.status = update_payload["status"]
    if "employmentStatus" in update_payload and update_payload.get("employmentStatus") is not None:
        employee.status = update_payload["employmentStatus"]

    employee.last_updated = datetime.utcnow()
    user.updated_at = datetime.utcnow()

    for field, value in update_payload.items():
        if field in {"employeeId", "name", "email", "phone", "designation", "joiningDate", "lastWorkingDay", "employmentStatus", "experience", "location", "department", "position", "status"}:
            old_value = None
            new_value = None
            if field == "name":
                old_value = user.full_name
                new_value = value
            elif field == "email":
                old_value = user.email
                new_value = value
            elif field == "phone":
                old_value = user.phone
                new_value = value
            elif field == "location":
                old_value = user.location
                new_value = value
            elif field == "designation":
                old_value = employee.position
                new_value = value
            elif field == "joiningDate":
                old_value = employee.hire_date
                new_value = value
            elif field == "status" or field == "employmentStatus":
                old_value = employee.status
                new_value = value
            elif field == "department":
                old_value = employee.department
                new_value = value
            elif field == "position":
                old_value = employee.position
                new_value = value
            elif field == "employeeId":
                continue
            if old_value != new_value:
                db.add(AdminEditLog(employee_id=employee.id, field_name=field, old_value=str(old_value) if old_value is not None else None, new_value=str(new_value) if new_value is not None else None, edited_by=current_user.id))

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    user = employee.user
    if not user:
        raise HTTPException(status_code=404, detail="Employee user not found")

    # 1. SECURITY FIX: Check karein ki delete karne wala ya toh khud user hai, ya fir Admin hai.
    if current_user.id != user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this account")

    # 2. Files ko server se delete karein
    file_paths = [
        user.profile_photo,
        user.resume_url,
        user.degree_certificate_url,
        employee.aadhaar_document_path,
        employee.pan_document_path,
    ]
    for path in file_paths:
        _delete_uploaded_file(path)

    # 3. DATABASE FIX: UpdateRequest ko delete karne se pehle UpdateRequestItems ko delete karein
    # Taaki Foreign Key constraint (IntegrityError) fail na ho.
    update_requests = db.query(UpdateRequest.id).filter(UpdateRequest.employee_id == employee.id).all()
    req_ids = [req.id for req in update_requests]
    
    if req_ids:
        db.query(UpdateRequestItem).filter(UpdateRequestItem.update_request_id.in_(req_ids)).delete(synchronize_session=False)

    # 4. Ab safely saare parent records ko delete karein
    db.query(AdminEditLog).filter(AdminEditLog.employee_id == employee.id).delete(synchronize_session=False)
    db.query(UpdateRequest).filter(UpdateRequest.employee_id == employee.id).delete(synchronize_session=False)
    db.query(Candidate).filter(Candidate.user_id == user.id).delete(synchronize_session=False)

    # 5. Main Employee aur User ko Delete karein
    db.delete(employee)
    db.delete(user)
    db.commit()
    return None