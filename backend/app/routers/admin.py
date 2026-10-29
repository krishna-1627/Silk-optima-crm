import csv
import io
import json
import re
import uuid
from datetime import datetime
from typing import Any
from pathlib import Path
from urllib.parse import quote

from docx import Document
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from openpyxl import Workbook
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.dependencies.auth import require_admin
from app.models.employee import Employee
from app.models.update_request import UpdateRequest, UpdateRequestItem
from app.models.user import User
from app.schemas.employee import EmployeeRead
from app.schemas.notification import NotificationRead
from app.schemas.update_request import ActionResponse, UpdateRequestRead

router = APIRouter(prefix="/admin", tags=["admin"])

DOWNLOAD_FILE_TYPES = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'json': 'application/json',
}


def _serialize_instance(instance):
    data = {}
    for column in instance.__table__.columns:
        value = getattr(instance, column.name)
        if isinstance(value, datetime):
            data[column.name] = value.isoformat()
        else:
            data[column.name] = value
    return data



def _build_employee_profile(employee: Employee) -> dict:
    user = employee.user

    def _safe(value):
        if value is None:
            return "Not Provided"
        if isinstance(value, str):
            value = value.strip()
            return value if value else "Not Provided"
        if isinstance(value, datetime):
            return value.strftime('%d %b %Y')
        return str(value)

    def _mask_aadhaar(value):
        raw = str(value or '').replace(" ", "").strip()
        if not raw or raw.lower() == 'not provided':
            return "Not Provided"
        if len(raw) <= 4:
            return "XXXX"
        return f"XXXX XXXX XX{raw[-2:]}"

    def _mask_pan(value):
        raw = str(value or '').replace(" ", "").strip()
        if not raw or raw.lower() == 'not provided':
            return "Not Provided"
        if len(raw) <= 4:
            return "XXXX"
        return f"XXXXX{raw[-4:]}"

    def _document_status(value):
        return "✓ Uploaded" if value else "✗ Not Uploaded"

    current_city_state = user.current_address if user and user.current_address else "Not Provided"
    if user and user.location:
        current_city_state = _safe(user.location)

    document_verification_status = "✓ Complete" if (
        bool(user and user.resume_url)
        and bool(user and user.degree_certificate_url)
        and bool(employee.aadhaar_document_path)
        and bool(employee.pan_document_path)
    ) else "Pending Documents Upload"

    profile = {
        "Personal Information": {
            "Full Name": _safe(user.full_name if user else None),
            "Email Address": _safe(user.email if user else None),
            "Phone Number": _safe(user.phone if user else None),
            "Date of Birth": _safe(user.date_of_birth.strftime('%d %b %Y') if getattr(user, 'date_of_birth', None) else None),
            "Gender": _safe(user.gender if user else None),
            "Emergency Contact Number": _safe(user.emergency_contact if user else None),
        },
        "Identity Verification": {
            "Aadhaar Number": _mask_aadhaar(user.aadhaar_number if user else None),
            "PAN Number": _mask_pan(user.pan_number if user else None),
        },
        "Employee Information": {
            "Employee ID": f"SO-2026-{str(employee.id).zfill(5)}",
            "Role / Designation": _safe(user.designation if user and user.designation else employee.position),
            "Date of Joining": _safe(employee.hire_date.strftime('%d %b %Y') if getattr(employee, 'hire_date', None) else None),
            "Verification Status": _safe(employee.verification_status if getattr(employee, 'verification_status', None) else user.verification_status if user else None),
            "Employee Status": _safe(employee.status if getattr(employee, 'status', None) else None),
            "Last Updated": _safe(employee.last_updated.strftime('%d %b %Y') if getattr(employee, 'last_updated', None) else None),
        },
        "Address Information": {
            "Current City & State": current_city_state,
            "Permanent Address": _safe(user.permanent_address if user else None),
            "PIN Code": _safe(user.pin_code if user else None),
        },
        "Professional Information": {
            "Expertise / Skills": _safe(user.skills if user else None),
            "LinkedIn Profile": _safe(user.linkedin if user else None),
        },
        "Education Information": {
            "Highest Qualification": _safe(user.degree if user else None),
            "College / University": _safe(user.university if user and user.university else user.college if user else None),
            "Branch / Field of Study": _safe(user.branch if user else None),
            "Graduation Year": _safe(user.graduation_year if user else None),
            "CGPA": _safe(user.cgpa if user else None),
        },
        "Uploaded Documents": {
            "Resume": _document_status(user.resume_url if user else None),
            "Degree / Marksheet": _document_status(user.degree_certificate_url if user else None),
            "Aadhaar Card": _document_status(employee.aadhaar_document_path),
            "PAN Card": _document_status(employee.pan_document_path),
            "Document Verification Status": document_verification_status,
        },
    }

    return profile


def _safe_filename(employee_id: int, full_name: str, extension: str) -> str:
    safe_name = re.sub(r'[^A-Za-z0-9_-]+', '_', (full_name or '').strip())
    if not safe_name:
        safe_name = f'Employee_{employee_id}'
    return f'Employee_{employee_id}_{safe_name}.{extension}'


def _wrap_pdf_text(text: str, max_chars: int = 90) -> list[str]:
    if not text:
        return ["Not Provided"]
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            if len(word) > max_chars:
                while len(word) > max_chars:
                    lines.append(word[:max_chars])
                    word = word[max_chars:]
                current = word
            else:
                current = word
    if current:
        lines.append(current)
    return lines if lines else [text]


def _render_pdf(profile: dict) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    left_margin = 52
    right_margin = 52
    top_margin = 52
    bottom_margin = 52
    title_gap = 18
    section_gap = 24
    field_gap = 10
    page_top = height - top_margin

    def _draw_wrapped_field(label: str, value: str, y_pos: float) -> float:
        label_text = f"{label}:"
        value_text = str(value) if value is not None else "Not Provided"
        label_x = left_margin + 8
        value_x = left_margin + 185
        max_value_width = width - right_margin - value_x - 8

        pdf.setFont("Helvetica-Bold", 10.5)
        pdf.drawString(label_x, y_pos, label_text)

        pdf.setFont("Helvetica", 10.5)
        wrapped = _wrap_pdf_text(value_text, max_chars=max(18, int(max_value_width / 4.5)))
        for idx, line in enumerate(wrapped[:3]):
            pdf.drawString(value_x, y_pos - (idx * 11), line)

        last_line_count = max(1, len(wrapped[:3]))
        return y_pos - (last_line_count * 11) - field_gap

    def _draw_section(title: str, items: dict, y_pos: float) -> float:
        pdf.setFont("Helvetica-Bold", 13)
        pdf.drawString(left_margin, y_pos, title.upper())
        y_pos -= 12
        pdf.setStrokeColorRGB(0.65, 0.65, 0.65)
        pdf.setLineWidth(0.8)
        pdf.line(left_margin, y_pos, width - right_margin, y_pos)
        y_pos -= 16

        for field_name, field_value in items.items():
            if y_pos < bottom_margin + 30:
                pdf.showPage()
                y_pos = page_top
                pdf.setFont("Helvetica-Bold", 13)
                pdf.drawString(left_margin, y_pos, title.upper())
                y_pos -= 12
                pdf.line(left_margin, y_pos, width - right_margin, y_pos)
                y_pos -= 16

            y_pos = _draw_wrapped_field(field_name, field_value, y_pos)

        return y_pos - section_gap

    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica-Bold", 24)
    company_name = "SILK OPTIMA"
    company_width = pdf.stringWidth(company_name, "Helvetica-Bold", 24)
    pdf.drawCentredString(width / 2, page_top, company_name)

    y = page_top - title_gap
    pdf.setStrokeColorRGB(0.7, 0.7, 0.7)
    pdf.setLineWidth(0.8)
    pdf.line(left_margin, y - 2, width - right_margin, y - 2)

    pdf.setFont("Helvetica-Bold", 16)
    report_title = "EMPLOYEE PROFILE REPORT"
    title_width = pdf.stringWidth(report_title, "Helvetica-Bold", 16)
    pdf.drawCentredString(width / 2, y - 20, report_title)

    y = y - 38
    pdf.line(left_margin, y, width - right_margin, y)
    y -= 28

    for section, values in profile.items():
        if y < bottom_margin + 50:
            pdf.showPage()
            y = page_top

        y = _draw_section(section, values, y)

    pdf.save()
    buffer.seek(0)
    return buffer.read()


def _render_docx(profile: dict) -> bytes:
    buffer = io.BytesIO()
    document = Document()
    document.add_heading('Employee Profile', level=1)

    for section, values in profile.items():
        document.add_heading(section.replace('_', ' ').title(), level=2)
        if isinstance(values, dict):
            for field, value in values.items():
                document.add_paragraph(f'{field}: {value}')
        else:
            document.add_paragraph(str(values))

    document.save(buffer)
    buffer.seek(0)
    return buffer.read()


def _render_xlsx(profile: dict) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Employee Profile'
    row = 1

    for section, values in profile.items():
        sheet.cell(row=row, column=1, value=section.replace('_', ' ').title())
        row += 1
        if isinstance(values, dict):
            for field, value in values.items():
                sheet.cell(row=row, column=1, value=field)
                sheet.cell(row=row, column=2, value=str(value) if value is not None else '')
                row += 1
        else:
            sheet.cell(row=row, column=1, value=str(values))
            row += 1
        row += 1

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer.read()


def _render_csv(profile: dict) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['Section', 'Field', 'Value'])
    for section, values in profile.items():
        if isinstance(values, dict):
            for field, value in values.items():
                writer.writerow([section, field, value if value is not None else ''])
        else:
            writer.writerow([section, '', values if values is not None else ''])
    return buffer.getvalue()


@router.get('/employees/{employee_id}/download')
def download_employee_profile(
    employee_id: int,
    format: str = 'pdf',
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    format = format.lower()
    if format not in DOWNLOAD_FILE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported export format')

    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .options(selectinload(Employee.user))
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Employee not found')

    profile = _build_employee_profile(employee)
    file_name = _safe_filename(employee.id, employee.user.full_name if employee.user else f'Employee_{employee.id}', format)

    if format == 'json':
        return JSONResponse(content=profile, headers={'Content-Disposition': f'attachment; filename="{file_name}"'})

    if format == 'pdf':
        data = _render_pdf(profile)
    elif format == 'docx':
        data = _render_docx(profile)
    elif format == 'xlsx':
        data = _render_xlsx(profile)
    elif format == 'csv':
        data = _render_csv(profile).encode('utf-8')
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported export format')

    return StreamingResponse(
        io.BytesIO(data),
        media_type=DOWNLOAD_FILE_TYPES[format],
        headers={'Content-Disposition': f'attachment; filename="{file_name}"'},
    )

class RejectUpdateRequestPayload(BaseModel):
    reason: str | None = None
    selected_fields: list[str] | None = None
    approved_fields: list[str] | None = None
    rejected_fields: list[str] | None = None


class ApproveUpdateRequestPayload(BaseModel):
    selected_fields: list[str] | None = None
    approved_fields: list[str] | None = None
    rejected_fields: list[str] | None = None


class ProcessUpdateRequestPayload(BaseModel):
    approved_fields: list[str] = []
    rejected_fields: list[str] = []
    selected_fields: list[str] | None = None
    reason: str | None = None


def _get_notification_title(request_type: str) -> str:
    if request_type == "profile_verification":
        return "Employee Verification Request"
    if request_type == "profile_update":
        return "Profile Update Request"
    if request_type == "document_upload":
        return "Document Upload Request"
    return "Employee Review Request"


def _get_notification_description(request_type: str, email: str | None, count: int) -> str:
    if request_type == "profile_verification":
        return f"{email or 'Employee'} submitted a profile for verification."
    if request_type == "profile_update":
        return f"{email or 'Employee'} requested profile updates. {count} field{'s' if count != 1 else ''} changed."
    if request_type == "document_upload":
        return f"{email or 'Employee'} uploaded {count} document{'s' if count != 1 else ''} for review."
    return f"{email or 'Employee'} submitted a request for review."


@router.get("/update-requests", response_model=list[UpdateRequestRead])
def list_update_requests(
    include_all: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(UpdateRequest).options(selectinload(UpdateRequest.items))
    if not include_all:
        query = query.filter(UpdateRequest.status == "pending")

    requests = query.order_by(UpdateRequest.created_at.desc()).all()
    return requests


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    requests = (
        db.query(UpdateRequest)
        .filter(UpdateRequest.status == "pending", UpdateRequest.request_type.in_(["profile_verification", "profile_update"]))
        .order_by(UpdateRequest.created_at.asc())
        .all()
    )

    if not requests:
        return []

    employee_ids = {request.employee_id for request in requests}
    employees = (
        db.query(Employee)
        .join(User)
        .filter(Employee.id.in_(employee_ids), User.is_deleted == False)
        .all()
    )
    employee_lookup = {employee.id: employee for employee in employees}

    grouped_notifications: dict[tuple[int, str], list[UpdateRequest]] = {}
    for request in requests:
        key = (request.employee_id, request.request_type)
        grouped_notifications.setdefault(key, []).append(request)

    notifications = []
    for (employee_id, event_type), group in grouped_notifications.items():
        latest_request = max(group, key=lambda item: item.created_at)
        employee = employee_lookup.get(employee_id)
        employee_name = employee.user.full_name if employee and employee.user else f"Employee {employee_id}"
        employee_email = employee.user.email if employee and employee.user else ""
        title = (
            "Authentication Required"
            if event_type == "profile_verification"
            else "Profile Update Authentication"
        )
        description = (
            f"{employee_name} submitted a profile for verification."
            if event_type == "profile_verification"
            else f"{employee_name} updated the profile."
        )

        notifications.append(
            NotificationRead(
                id=str(latest_request.request_id),
                title=title,
                employee_id=employee_id,
                employee_name=employee_name,
                employee_email=employee_email,
                event_type=event_type,
                created_at=latest_request.created_at,
                is_read=False,
                action_url=(
                    f"/admin/employees/{employee_id}/profile"
                    f"?requestId={quote(str(latest_request.request_id))}"
                    f"&requestType={event_type}"
                ),
                description=description,
            )
        )

    notifications.sort(key=lambda item: item.created_at, reverse=True)
    return notifications


def _sync_employee_verification_status(db: Session, employee_id: int) -> None:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return

    user = employee.user
    if not user:
        return

    has_pending_update_requests = (
        db.query(UpdateRequest)
        .filter(
            UpdateRequest.employee_id == employee_id,
            UpdateRequest.request_type == "profile_update",
            UpdateRequest.status == "pending",
        )
        .first()
        is not None
    )

    has_pending_review_items = (
        db.query(UpdateRequestItem)
        .join(UpdateRequest, UpdateRequestItem.update_request_id == UpdateRequest.id)
        .filter(
            UpdateRequest.employee_id == employee_id,
            UpdateRequest.request_type == "profile_update",
            UpdateRequestItem.status == "pending",
        )
        .first()
        is not None
    )

    if has_pending_update_requests or has_pending_review_items:
        employee.verification_status = "Pending"
        user.verification_status = "Pending"
        employee.verification_rejection_reason = None
        user.verification_rejection_reason = None
    else:
        employee.verification_status = "Verified"
        user.verification_status = "Verified"
        employee.verification_rejection_reason = None
        user.verification_rejection_reason = None

    employee.last_updated = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.add(employee)
    db.add(user)


def _apply_field_update(target: Any, field: str, value: Any) -> None:
    if field == "date_of_birth" and isinstance(value, str) and value.strip():
        try:
            val_str = value.strip().replace("Z", "+00:00")
            if "T" in val_str:
                parsed_dt = datetime.fromisoformat(val_str)
            else:
                parsed_dt = datetime.strptime(val_str[:10], "%Y-%m-%d")
            setattr(target, field, parsed_dt)
            return
        except Exception:
            pass
    setattr(target, field, value)


def _process_update_request_internal(
    request_id: str,
    approved_fields: set[str],
    rejected_fields: set[str],
    reason: str | None,
    db: Session,
) -> dict:
    update_requests = (
        db.query(UpdateRequest)
        .filter(UpdateRequest.request_id == request_id, UpdateRequest.status == "pending")
        .order_by(UpdateRequest.created_at.asc())
        .all()
    )
    if not update_requests and str(request_id).isdigit():
        single_req = db.query(UpdateRequest).filter(UpdateRequest.id == int(request_id), UpdateRequest.status == "pending").first()
        if single_req:
            update_requests = db.query(UpdateRequest).filter(UpdateRequest.request_id == single_req.request_id, UpdateRequest.status == "pending").all()
            if not update_requests:
                update_requests = [single_req]

    if not update_requests:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update request not found")

    first_req = update_requests[0]
    employee = db.query(Employee).filter(Employee.id == first_req.employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if first_req.request_type == "profile_verification":
        if approved_fields or (not rejected_fields and not approved_fields):
            user.verification_status = "Verified"
            employee.verification_status = "Verified"
            user.verification_rejection_reason = None
            employee.verification_rejection_reason = None
            for req in update_requests:
                req.status = "approved"
                db.add(req)
        else:
            user.verification_status = "Rejected"
            employee.verification_status = "Rejected"
            user.verification_rejection_reason = reason
            employee.verification_rejection_reason = reason
            for req in update_requests:
                req.status = "rejected"
                req.rejection_reason = reason
                db.add(req)
        user.updated_at = datetime.utcnow()
        employee.last_updated = datetime.utcnow()
        db.add(user)
        db.add(employee)
        db.commit()
        return {"detail": "Profile verification decision saved"}

    supported_user_fields = {col.name for col in User.__table__.columns}
    supported_employee_fields = {col.name for col in Employee.__table__.columns}

    req_ids = [r.id for r in update_requests]
    items = db.query(UpdateRequestItem).filter(UpdateRequestItem.update_request_id.in_(req_ids)).all()

    if not approved_fields and not rejected_fields and reason:
        if items:
            rejected_fields = {item.field_name for item in items}
        else:
            rejected_fields = {req.field_name for req in update_requests if req.field_name and req.field_name != "multiple_fields"}

    approved_count = 0
    rejected_count = 0
    total_processed = 0

    if items:
        for item in items:
            field = item.field_name
            is_approved = field in approved_fields
            is_rejected = field in rejected_fields

            if is_approved:
                item.status = "approved"
                if field in supported_employee_fields:
                    _apply_field_update(employee, field, item.new_value)
                elif field in supported_user_fields:
                    _apply_field_update(user, field, item.new_value)
                approved_count += 1
            elif is_rejected:
                item.status = "rejected"
                item.rejection_reason = reason
                rejected_count += 1
            else:
                item.status = "pending"
                item.rejection_reason = None

            db.add(item)
            total_processed += 1

    for req in update_requests:
        field = req.field_name
        if field == "multiple_fields":
            continue
        is_approved = field in approved_fields
        is_rejected = field in rejected_fields

        if is_approved:
            req.status = "approved"
            if field in supported_employee_fields:
                _apply_field_update(employee, field, req.new_value)
            elif field in supported_user_fields:
                _apply_field_update(user, field, req.new_value)
            if not items:
                approved_count += 1
                total_processed += 1
        elif is_rejected:
            req.status = "rejected"
            req.rejection_reason = reason
            if not items:
                rejected_count += 1
                total_processed += 1
        else:
            req.status = "pending"
            req.rejection_reason = None
        db.add(req)

    has_pending_items = any(item.status == "pending" for item in items)
    has_pending_non_multiple_requests = any(
        req.status == "pending" and req.field_name != "multiple_fields"
        for req in update_requests
    )

    overall_status = "pending"
    if approved_count > 0 and rejected_count == 0 and total_processed > 0 and not has_pending_items and not has_pending_non_multiple_requests:
        overall_status = "approved"
    elif rejected_count > 0 and approved_count == 0 and total_processed > 0 and not has_pending_items and not has_pending_non_multiple_requests:
        overall_status = "rejected"
    elif total_processed > 0 and not has_pending_items and not has_pending_non_multiple_requests:
        overall_status = "partially_approved"
    else:
        overall_status = "pending"

    for req in update_requests:
        req.status = overall_status
        req.rejection_reason = reason if overall_status == "rejected" else None
        db.add(req)

    has_pending_review = any(item.status == "pending" for item in items) or any(req.status == "pending" for req in update_requests)
    if has_pending_review:
        employee.verification_status = "Pending"
        user.verification_status = "Pending"
    else:
        employee.verification_status = "Verified"
        user.verification_status = "Verified"

    employee.last_updated = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.add(employee)
    db.add(user)
    db.commit()

    return {"detail": f"Profile update request processed with status {overall_status}"}


@router.post("/update-requests/{request_id}/process", response_model=ActionResponse)
def process_update_request(
    request_id: str,
    payload: ProcessUpdateRequestPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    approved_set = set(payload.approved_fields or [])
    rejected_set = set(payload.rejected_fields or [])

    if not approved_set and not rejected_set and payload.selected_fields:
        approved_set = set(payload.selected_fields)

    return _process_update_request_internal(
        request_id=request_id,
        approved_fields=approved_set,
        rejected_fields=rejected_set,
        reason=payload.reason,
        db=db,
    )


@router.post("/update-requests/{request_id}/approve", response_model=ActionResponse)
def approve_update_request(
    request_id: str,
    payload: ApproveUpdateRequestPayload | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    approved_set = set((payload.approved_fields or []) if payload else [])
    rejected_set = set((payload.rejected_fields or []) if payload else [])
    selected_set = set((payload.selected_fields or []) if payload else [])

    if not approved_set and selected_set:
        approved_set = selected_set

    return _process_update_request_internal(
        request_id=request_id,
        approved_fields=approved_set,
        rejected_fields=rejected_set,
        reason=None,
        db=db,
    )


@router.post("/update-requests/{request_id}/reject", response_model=ActionResponse)
def reject_update_request(
    request_id: str,
    payload: RejectUpdateRequestPayload | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    approved_set = set((payload.approved_fields or []) if payload else [])
    rejected_set = set((payload.rejected_fields or []) if payload else [])
    selected_set = set((payload.selected_fields or []) if payload else [])
    reason = payload.reason if payload else None

    if not rejected_set and selected_set:
        rejected_set = selected_set

    return _process_update_request_internal(
        request_id=request_id,
        approved_fields=approved_set,
        rejected_fields=rejected_set,
        reason=reason,
        db=db,
    )


class DirectRejectPayload(BaseModel):
    reason: str | None = None


class SendEmployeeMessagePayload(BaseModel):
    message: str | None = None


@router.post("/employees/{employee_id}/send-message", response_model=NotificationRead)
def send_employee_message(
    employee_id: int,
    payload: SendEmployeeMessagePayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .options(selectinload(Employee.user))
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    notification_request = UpdateRequest(
        request_id=str(uuid.uuid4()),
        employee_id=employee.id,
        source="admin",
        request_type="admin_message",
        field_name="message",
        new_value=message,
        status="sent",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(notification_request)
    db.commit()
    db.refresh(notification_request)

    return NotificationRead(
        id=str(notification_request.request_id),
        title="Message from Admin",
        employee_id=employee.id,
        employee_name=user.full_name or "Employee",
        employee_email=user.email or "",
        event_type="admin_message",
        created_at=notification_request.created_at,
        is_read=False,
        action_url=f"/profile",
        description=message,
    )


@router.patch("/employees/{employee_id}/status", response_model=EmployeeRead)
def update_employee_status(
    employee_id: int,
    payload: dict | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .options(selectinload(Employee.user))
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    body = payload or {}
    next_is_active = user.is_active
    if "is_active" in body:
        next_is_active = bool(body["is_active"])

    if "status" in body and body["status"] is not None:
        status_value = str(body["status"]).strip()
        if status_value:
            employee.status = status_value
            if status_value.lower() == "active":
                next_is_active = True
            elif status_value.lower() == "inactive":
                next_is_active = False
    else:
        employee.status = "Active" if next_is_active else "Inactive"

    user.is_active = next_is_active
    user.account_status = employee.status
    user.updated_at = datetime.utcnow()
    employee.last_updated = datetime.utcnow()

    db.add(user)
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/employees/{employee_id}/verification-status", response_model=EmployeeRead)
def update_employee_verification_status(
    employee_id: int,
    payload: dict | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .options(selectinload(Employee.user))
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    body = payload or {}
    status_value = str(body.get("status") or "").strip()
    if not status_value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification status is required")

    normalized_value = status_value.title()
    if normalized_value not in {"Pending", "Verified"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification status must be Pending or Verified")

    user.verification_status = normalized_value
    employee.verification_status = normalized_value
    user.verification_rejection_reason = None
    employee.verification_rejection_reason = None
    user.updated_at = datetime.utcnow()
    employee.last_updated = datetime.utcnow()

    db.add(user)
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/employees/{employee_id}/verify", response_model=ActionResponse)
def verify_employee_profile(
    employee_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.verification_status = "Verified"
    employee.verification_status = "Verified"
    user.verification_rejection_reason = None
    employee.verification_rejection_reason = None
    user.updated_at = datetime.utcnow()
    employee.last_updated = datetime.utcnow()

    pending_requests = (
        db.query(UpdateRequest)
        .filter(UpdateRequest.employee_id == employee_id, UpdateRequest.status == "pending")
        .all()
    )
    for req in pending_requests:
        req.status = "approved"
        req.rejection_reason = None
        db.add(req)

    db.add(user)
    db.add(employee)
    db.commit()

    return {"detail": "Employee profile verified successfully."}


@router.post("/employees/{employee_id}/reject", response_model=ActionResponse)
def reject_employee_profile(
    employee_id: int,
    payload: DirectRejectPayload | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    reason = payload.reason if payload else None
    user.verification_status = "Rejected"
    employee.verification_status = "Rejected"
    user.verification_rejection_reason = reason
    employee.verification_rejection_reason = reason
    user.updated_at = datetime.utcnow()
    employee.last_updated = datetime.utcnow()

    pending_requests = (
        db.query(UpdateRequest)
        .filter(UpdateRequest.employee_id == employee_id, UpdateRequest.status == "pending")
        .all()
    )
    for req in pending_requests:
        req.status = "rejected"
        req.rejection_reason = reason
        db.add(req)

    db.add(user)
    db.add(employee)
    db.commit()

    return {"detail": "Employee profile rejected."}


# ─── Profile Changes Toggle ────────────────────────────────────────────────────

class ProfileChangesInfo(BaseModel):
    """Describes whether a previous approved snapshot exists and the current revert state."""
    has_previous_snapshot: bool
    is_showing_current: bool
    snapshot_field_count: int


class RevertProfilePayload(BaseModel):
    """Payload for the revert-profile endpoint."""
    revert_to: str  # "previous" or "current"


def _get_latest_approved_update_request(db: Session, employee_id: int):
    """Return the most recent approved profile_update UpdateRequest for the employee."""
    return (
        db.query(UpdateRequest)
        .filter(
            UpdateRequest.employee_id == employee_id,
            UpdateRequest.request_type == "profile_update",
            UpdateRequest.status == "approved",
        )
        .order_by(UpdateRequest.updated_at.desc())
        .first()
    )


def _get_approved_items_for_request(db: Session, update_request: UpdateRequest) -> list:
    """Return all UpdateRequestItem rows for the given request."""
    return (
        db.query(UpdateRequestItem)
        .filter(
            UpdateRequestItem.update_request_id == update_request.id,
            UpdateRequestItem.status == "approved",
        )
        .all()
    )


@router.get("/employees/{employee_id}/profile-changes", response_model=ProfileChangesInfo)
def get_profile_changes_info(
    employee_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Return metadata about whether a previous approved profile snapshot exists."""
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .options(selectinload(Employee.user))
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    latest_approved = _get_latest_approved_update_request(db, employee_id)
    if not latest_approved:
        return ProfileChangesInfo(
            has_previous_snapshot=False,
            is_showing_current=True,
            snapshot_field_count=0,
        )

    items = _get_approved_items_for_request(db, latest_approved)
    field_count = len([item for item in items if item.old_value is not None])

    is_showing_current = not bool(latest_approved.old_value == "__reverted__")

    return ProfileChangesInfo(
        has_previous_snapshot=field_count > 0,
        is_showing_current=is_showing_current,
        snapshot_field_count=field_count,
    )


@router.post("/employees/{employee_id}/revert-profile", response_model=ActionResponse)
def revert_employee_profile(
    employee_id: int,
    payload: RevertProfilePayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Toggle the employee profile between the current approved data and the previously approved data.

    revert_to="previous" → restore old_value fields from the latest approved profile_update request.
    revert_to="current"  → restore new_value fields from the latest approved profile_update request.
    """
    employee = (
        db.query(Employee)
        .join(Employee.user)
        .filter(Employee.id == employee_id, User.is_deleted == False)
        .options(selectinload(Employee.user))
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user = employee.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Find the most recent approved profile_update request with items
    latest_approved = _get_latest_approved_update_request(db, employee_id)
    if not latest_approved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No previous approved profile snapshot found. The profile has not been updated since initial verification.",
        )

    items = _get_approved_items_for_request(db, latest_approved)
    if not items:
        # Fall back to UpdateRequest rows without items
        snapshot_fields = [
            latest_approved
        ] if latest_approved.field_name and latest_approved.field_name != "multiple_fields" else []
        if not snapshot_fields:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No previous approved field data found to revert.",
            )

    supported_user_fields = {col.name for col in User.__table__.columns}
    supported_employee_fields = {col.name for col in Employee.__table__.columns}

    restored_count = 0
    revert_to = payload.revert_to.strip().lower()

    if revert_to not in ("previous", "current"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="revert_to must be 'previous' or 'current'",
        )

    for item in items:
        field = item.field_name
        value = item.old_value if revert_to == "previous" else item.new_value

        if field in supported_employee_fields:
            _apply_field_update(employee, field, value)
        elif field in supported_user_fields:
            _apply_field_update(user, field, value)
        else:
            continue
        restored_count += 1

    employee.last_updated = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.add(employee)
    db.add(user)
    db.commit()

    direction = "previous approved" if revert_to == "previous" else "current approved"
    return {"detail": f"Employee profile restored to {direction} data. {restored_count} field(s) updated."}
