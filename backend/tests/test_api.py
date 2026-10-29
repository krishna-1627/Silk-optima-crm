import io
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app import models  # noqa: F401
from main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_register_creates_account_directly(client):
    response = client.post(
        "/register",
        json={
            "email": "direct@example.com",
            "full_name": "Direct User",
            "password": "Secret123!",
            "role": "candidate",
        },
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "direct@example.com"


def test_forgot_password_flow_resets_password(client, capsys):
    client.post(
        "/register",
        json={
            "email": "reset@example.com",
            "full_name": "Reset User",
            "password": "Secret123!",
            "role": "candidate",
        },
    )

    send_response = client.post(
        "/forgot-password/send-otp",
        json={"email": "reset@example.com"},
    )
    assert send_response.status_code == 200

    captured = capsys.readouterr().out
    otp_match = re.search(r"(\d{6})", captured)
    assert otp_match is not None
    otp_code = otp_match.group(1)

    verify_response = client.post(
        "/forgot-password/verify-otp",
        json={"email": "reset@example.com", "otp": otp_code},
    )
    assert verify_response.status_code == 200

    reset_response = client.post(
        "/forgot-password/reset",
        json={"email": "reset@example.com", "otp": otp_code, "new_password": "NewPass123!"},
    )
    assert reset_response.status_code == 200

    login_response = client.post(
        "/login",
        json={"email": "reset@example.com", "password": "NewPass123!"},
    )
    assert login_response.status_code == 200


def test_register_login_and_employee_crud(client):
    register_response = client.post(
        "/register",
        json={
            "email": "demo@example.com",
            "full_name": "Demo User",
            "password": "secret123",
            "role": "candidate",
        },
    )
    assert register_response.status_code == 201
    assert register_response.json()["user"]["email"] == "demo@example.com"

    login_response = client.post(
        "/login",
        json={"email": "demo@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}

    employee_response = client.post(
        "/employees",
        json={"department": "Engineering", "position": "Backend Engineer", "status": "active"},
        headers=headers,
    )
    assert employee_response.status_code == 201
    assert employee_response.json()["position"] == "Backend Engineer"


def test_admin_employee_status_toggle_updates_employee_and_user_state(client):
    client.post(
        "/register",
        json={
            "email": "admin-status@example.com",
            "full_name": "Admin Status",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee-status@example.com",
            "full_name": "Employee Status",
            "password": "secret123",
            "role": "employee",
        },
    )

    admin_login = client.post(
        "/login",
        json={"email": "admin-status@example.com", "password": "secret123"},
    )
    employee_login = client.post(
        "/login",
        json={"email": "employee-status@example.com", "password": "secret123"},
    )

    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}

    employee_profile = client.get("/employees/me/profile", headers=employee_headers)
    employee_id = employee_profile.json()["id"]

    update_response = client.patch(
        f"/admin/employees/{employee_id}/status",
        headers=admin_headers,
        json={"is_active": False, "status": "Inactive"},
    )
    assert update_response.status_code == 200
    payload = update_response.json()
    assert payload["status"] == "Inactive"
    assert payload["user"]["is_active"] is False

    refreshed_employee = client.get(f"/employees/{employee_id}", headers=admin_headers)
    assert refreshed_employee.status_code == 200
    assert refreshed_employee.json()["status"] == "Inactive"
    assert refreshed_employee.json()["user"]["is_active"] is False

    list_response = client.get("/employees", headers=admin_headers)
    list_payload = list_response.json()
    employee = next(item for item in list_payload if item["id"] == employee_id)
    assert employee["status"] == "Inactive"
    assert employee["user"]["is_active"] is False


def test_admin_verification_status_toggle_supports_pending_and_verified(client):
    client.post(
        "/register",
        json={
            "email": "admin-verification@example.com",
            "full_name": "Admin Verification",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee-verification@example.com",
            "full_name": "Employee Verification",
            "password": "secret123",
            "role": "employee",
        },
    )

    admin_login = client.post(
        "/login",
        json={"email": "admin-verification@example.com", "password": "secret123"},
    )
    employee_login = client.post(
        "/login",
        json={"email": "employee-verification@example.com", "password": "secret123"},
    )

    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}
    employee_profile = client.get("/employees/me/profile", headers=employee_headers)
    employee_id = employee_profile.json()["id"]

    pending_response = client.patch(
        f"/admin/employees/{employee_id}/verification-status",
        headers=admin_headers,
        json={"status": "Pending"},
    )
    assert pending_response.status_code == 200
    assert pending_response.json()["verification_status"] == "Pending"

    verified_response = client.patch(
        f"/admin/employees/{employee_id}/verification-status",
        headers=admin_headers,
        json={"status": "Verified"},
    )
    assert verified_response.status_code == 200
    assert verified_response.json()["verification_status"] == "Verified"

    employee_list = client.get("/employees", headers=admin_headers)
    employee = next(item for item in employee_list.json() if item["id"] == employee_id)
    assert employee["verification_status"] == "Verified"


def test_admin_employee_download_endpoint(client):
    client.post(
        "/register",
        json={
            "email": "admin-download@example.com",
            "full_name": "Admin Download",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee-download@example.com",
            "full_name": "Employee Download",
            "password": "secret123",
            "role": "employee",
        },
    )

    admin_login = client.post(
        "/login",
        json={"email": "admin-download@example.com", "password": "secret123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    employee_response = client.post(
        "/employees",
        json={"department": "Operations", "position": "Support Engineer", "status": "active"},
        headers=admin_headers,
    )
    assert employee_response.status_code == 201
    employee_id = employee_response.json()["id"]

    download_response = client.get(f"/admin/employees/{employee_id}/download?format=json", headers=admin_headers)
    assert download_response.status_code == 200
    assert download_response.headers["content-type"].startswith("application/json")
    downloaded = download_response.json()
    assert "employee" in downloaded
    assert "user" in downloaded
    assert downloaded["employee"]["id"] == employee_id

    download_pdf_response = client.get(f"/admin/employees/{employee_id}/download?format=pdf", headers=admin_headers)
    assert download_pdf_response.status_code == 200
    assert download_pdf_response.headers["content-type"] == "application/pdf"
    assert "attachment" in download_pdf_response.headers["content-disposition"]


def test_profile_update_creates_pending_request(client):
    client.post(
        "/register",
        json={
            "email": "admin@example.com",
            "full_name": "Admin User",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee@example.com",
            "full_name": "Employee User",
            "password": "secret123",
            "role": "employee",
        },
    )

    employee_login = client.post(
        "/login",
        json={"email": "employee@example.com", "password": "secret123"},
    )
    employee_token = employee_login.json()["access_token"]
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    admin_login = client.post(
        "/login",
        json={"email": "admin@example.com", "password": "secret123"},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Initial profile submission by unverified employee creates ONLY profile_verification request
    profile_response = client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"full_name": "Employee User Updated", "phone": "9876543210", "location": "Chennai"},
    )
    assert profile_response.status_code == 200

    requests_response = client.get("/admin/update-requests", headers=admin_headers)
    assert requests_response.status_code == 200
    payload = requests_response.json()
    assert len(payload) == 1
    assert payload[0]["request_type"] == "profile_verification"

    # Admin verifies the employee
    emp_profile_res = client.get("/employees/me/profile", headers=employee_headers)
    emp_id = emp_profile_res.json()["id"]

    verify_res = client.post(f"/admin/employees/{emp_id}/verify", headers=admin_headers)
    assert verify_res.status_code == 200

    # Subsequent profile update by verified employee creates profile_update request
    second_profile_response = client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"phone": "9876543211", "location": "Mumbai"},
    )
    assert second_profile_response.status_code == 200

    follow_up_requests = client.get("/admin/update-requests", headers=admin_headers)
    assert follow_up_requests.status_code == 200
    follow_up_payload = follow_up_requests.json()
    follow_up_profile_requests = [item for item in follow_up_payload if item["request_type"] == "profile_update"]
    assert len(follow_up_profile_requests) == 1
    assert follow_up_profile_requests[0]["field_name"] == "multiple_fields"
    assert {item["field_name"] for item in follow_up_profile_requests[0]["items"]} == {"phone", "location"}


def test_multiple_profile_field_updates_create_single_parent_request_with_items(client):
    client.post(
        "/register",
        json={
            "email": "employee-multi@example.com",
            "full_name": "Employee Multi",
            "password": "secret123",
            "role": "employee",
        },
    )
    client.post(
        "/register",
        json={
            "email": "admin-multi@example.com",
            "full_name": "Admin Multi",
            "password": "secret123",
            "role": "admin",
        },
    )

    employee_login = client.post(
        "/login",
        json={"email": "employee-multi@example.com", "password": "secret123"},
    )
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}

    admin_login = client.post(
        "/login",
        json={"email": "admin-multi@example.com", "password": "secret123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Verify employee first
    emp_profile_res = client.get("/employees/me/profile", headers=employee_headers)
    emp_id = emp_profile_res.json()["id"]
    client.post(f"/admin/employees/{emp_id}/verify", headers=admin_headers)

    response = client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"full_name": "Employee Multi Updated", "phone": "9876500000", "location": "Bengaluru"},
    )
    assert response.status_code == 200

    requests_response = client.get("/admin/update-requests", headers=admin_headers)
    assert requests_response.status_code == 200
    payload = requests_response.json()

    profile_update_requests = [item for item in payload if item["request_type"] == "profile_update"]
    assert len(profile_update_requests) == 1
    parent_request = profile_update_requests[0]
    assert parent_request["field_name"] == "multiple_fields"
    assert len(parent_request["items"]) == 3
    assert {item["field_name"] for item in parent_request["items"]} == {"full_name", "phone", "location"}
    assert all(item["status"] == "pending" for item in parent_request["items"])


def test_reject_profile_update_request_with_reason(client):
    client.post(
        "/register",
        json={
            "email": "admin-reject@example.com",
            "full_name": "Admin Reject",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee-reject@example.com",
            "full_name": "Employee Reject",
            "password": "secret123",
            "role": "employee",
        },
    )

    employee_login = client.post(
        "/login",
        json={"email": "employee-reject@example.com", "password": "secret123"},
    )
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}

    admin_login = client.post(
        "/login",
        json={"email": "admin-reject@example.com", "password": "secret123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Verify employee first
    emp_profile_res = client.get("/employees/me/profile", headers=employee_headers)
    emp_id = emp_profile_res.json()["id"]
    client.post(f"/admin/employees/{emp_id}/verify", headers=admin_headers)

    client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"full_name": "Employee Reject Updated", "phone": "9123456780"},
    )

    requests_response = client.get("/admin/update-requests", headers=admin_headers)
    assert requests_response.status_code == 200
    profile_update_request = next(item for item in requests_response.json() if item["request_type"] == "profile_update")
    request_id = profile_update_request["request_id"]

    reject_response = client.post(
        f"/admin/update-requests/{request_id}/reject",
        headers=admin_headers,
        json={"reason": "Please confirm the updated details before approval."},
    )
    assert reject_response.status_code == 200

    refreshed_requests = client.get("/admin/update-requests?include_all=true", headers=admin_headers)
    assert refreshed_requests.status_code == 200
    payload = refreshed_requests.json()
    profile_update_rows = [item for item in payload if item["request_type"] == "profile_update"]
    assert len(profile_update_rows) == 1
    assert profile_update_rows[0]["request_id"] == request_id
    assert profile_update_rows[0]["status"] == "rejected"
    assert all(item["status"] == "rejected" for item in profile_update_rows[0]["items"])


def test_admin_send_message_creates_employee_notification(client):
    client.post(
        "/register",
        json={
            "email": "admin-message@example.com",
            "full_name": "Admin Message",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee-message@example.com",
            "full_name": "Employee Message",
            "password": "secret123",
            "role": "employee",
        },
    )

    admin_login = client.post(
        "/login",
        json={"email": "admin-message@example.com", "password": "secret123"},
    )
    employee_login = client.post(
        "/login",
        json={"email": "employee-message@example.com", "password": "secret123"},
    )

    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    employee_profile = client.get("/employees/me/profile", headers=employee_headers)
    employee_id = employee_profile.json()["id"]

    message_response = client.post(
        f"/admin/employees/{employee_id}/send-message",
        headers=admin_headers,
        json={"message": "Please review your latest profile update."},
    )
    assert message_response.status_code == 200
    payload = message_response.json()
    assert payload["title"] == "Message from Admin"

    notifications = client.get("/employees/me/notifications", headers=employee_headers)
    assert notifications.status_code == 200
    assert any(
        item["title"] == "Message from Admin" and item["description"] == "Please review your latest profile update."
        for item in notifications.json()
    )


def test_profile_update_sets_pending_status_and_resets_after_review(client):
    client.post(
        "/register",
        json={
            "email": "status-review@example.com",
            "full_name": "Status Review",
            "password": "secret123",
            "role": "employee",
        },
    )
    client.post(
        "/register",
        json={
            "email": "admin-status@example.com",
            "full_name": "Admin Status",
            "password": "secret123",
            "role": "admin",
        },
    )

    employee_login = client.post(
        "/login",
        json={"email": "status-review@example.com", "password": "secret123"},
    )
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}

    admin_login = client.post(
        "/login",
        json={"email": "admin-status@example.com", "password": "secret123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    emp_profile_res = client.get("/employees/me/profile", headers=employee_headers)
    emp_id = emp_profile_res.json()["id"]
    client.post(f"/admin/employees/{emp_id}/verify", headers=admin_headers)

    update_response = client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"phone": "9123456789", "location": "Delhi"},
    )
    assert update_response.status_code == 200

    current_profile = client.get("/employees/me/profile", headers=employee_headers)
    assert current_profile.status_code == 200
    assert current_profile.json()["verification_status"] == "Pending"

    requests_response = client.get("/admin/update-requests", headers=admin_headers)
    assert requests_response.status_code == 200
    payload = requests_response.json()
    profile_update_request = next(item for item in payload if item["request_type"] == "profile_update")

    first_review_response = client.post(
        f"/admin/update-requests/{profile_update_request['request_id']}/process",
        headers=admin_headers,
        json={"approved_fields": ["phone"]},
    )
    assert first_review_response.status_code == 200

    pending_profile = client.get("/employees/me/profile", headers=employee_headers)
    assert pending_profile.status_code == 200
    assert pending_profile.json()["verification_status"] == "Pending"

    second_review_response = client.post(
        f"/admin/update-requests/{profile_update_request['request_id']}/process",
        headers=admin_headers,
        json={"approved_fields": ["phone", "location"]},
    )
    assert second_review_response.status_code == 200

    refreshed_profile = client.get("/employees/me/profile", headers=employee_headers)
    assert refreshed_profile.status_code == 200
    assert refreshed_profile.json()["verification_status"] == "Verified"
    assert refreshed_profile.json()["phone"] == "9123456789"
    assert refreshed_profile.json()["location"] == "Delhi"


def test_admin_notifications_endpoint_aggregates_request_events(client):
    client.post(
        "/register",
        json={
            "email": "admin-notify@example.com",
            "full_name": "Admin Notify",
            "password": "secret123",
            "role": "admin",
        },
    )
    client.post(
        "/register",
        json={
            "email": "employee-notify@example.com",
            "full_name": "Employee Notify",
            "password": "secret123",
            "role": "employee",
        },
    )

    employee_login = client.post(
        "/login",
        json={"email": "employee-notify@example.com", "password": "secret123"},
    )
    employee_token = employee_login.json()["access_token"]
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    admin_login = client.post(
        "/login",
        json={"email": "admin-notify@example.com", "password": "secret123"},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Initial profile submission creates profile_verification notification
    client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"phone": "9876543210", "location": "Chennai"},
    )

    notifications_res1 = client.get("/admin/notifications", headers=admin_headers)
    assert notifications_res1.status_code == 200
    payload1 = notifications_res1.json()
    assert len(payload1) == 1
    assert payload1[0]["event_type"] == "profile_verification"
    assert payload1[0]["employee_email"] == "employee-notify@example.com"

    # Admin verifies the employee profile
    emp_profile_res = client.get("/employees/me/profile", headers=employee_headers)
    emp_id = emp_profile_res.json()["id"]
    client.post(f"/admin/employees/{emp_id}/verify", headers=admin_headers)

    # Subsequent profile update by verified employee creates profile_update notification
    client.put(
        "/employees/me/profile",
        headers=employee_headers,
        json={"phone": "9876543211", "location": "Mumbai"},
    )

    notifications_res2 = client.get("/admin/notifications", headers=admin_headers)
    assert notifications_res2.status_code == 200
    payload2 = notifications_res2.json()
    assert len(payload2) == 1
    assert payload2[0]["event_type"] == "profile_update"
    assert payload2[0]["employee_email"] == "employee-notify@example.com"


def test_me_response_includes_updated_at_after_profile_update(client):
    register_response = client.post(
        "/register",
        json={
            "email": "timestamp@example.com",
            "full_name": "Timestamp User",
            "password": "secret123",
            "role": "candidate",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/login",
        json={"email": "timestamp@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    patch_response = client.patch(
        "/me",
        headers=headers,
        json={"application_submitted": True},
    )
    assert patch_response.status_code == 200

    me_response = client.get("/me", headers=headers)
    assert me_response.status_code == 200
    payload = me_response.json()
    assert payload["application_submitted"] is True
    assert payload["updated_at"]


def test_degree_certificate_upload_and_download(client):
    register_response = client.post(
        "/register",
        json={
            "email": "certificate@example.com",
            "full_name": "Certificate User",
            "password": "secret123",
            "role": "candidate",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/login",
        json={"email": "certificate@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/me/degree-certificate",
        headers=headers,
        files={"file": ("certificate.pdf", io.BytesIO(b"%PDF-1.4\n%test certificate"), "application/pdf")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["degree_certificate_filename"] == "certificate.pdf"
    assert payload["degree_certificate_url"].startswith("/uploads/degree_certificates/")
    assert payload["degree_certificate_url"].endswith(".pdf")

    download_response = client.get("/me/degree-certificate/download", headers=headers)
    assert download_response.status_code == 200
    assert download_response.content.startswith(b"%PDF")


def test_delete_current_user_account(client):
    register_response = client.post(
        "/register",
        json={
            "email": "delete@example.com",
            "full_name": "Delete User",
            "password": "secret123",
            "role": "candidate",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/login",
        json={"email": "delete@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    delete_response = client.delete("/me", headers=headers)
    assert delete_response.status_code == 204

    get_response = client.get("/me", headers=headers)
    assert get_response.status_code in {401, 403}


def test_admin_delete_employee_hides_employee_and_blocks_login(client):
    register_admin_response = client.post(
        "/register",
        json={
            "email": "admin-soft-delete@example.com",
            "full_name": "Admin Soft Delete",
            "password": "secret123",
            "role": "admin",
        },
    )
    assert register_admin_response.status_code == 201

    register_employee_response = client.post(
        "/register",
        json={
            "email": "employee-soft-delete@example.com",
            "full_name": "Employee Soft Delete",
            "password": "secret123",
            "role": "employee",
        },
    )
    assert register_employee_response.status_code == 201

    admin_login = client.post(
        "/login",
        json={"email": "admin-soft-delete@example.com", "password": "secret123"},
    )
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    employee_login = client.post(
        "/login",
        json={"email": "employee-soft-delete@example.com", "password": "secret123"},
    )
    assert employee_login.status_code == 200
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}

    employee_profile_response = client.get("/employees/me/profile", headers=employee_headers)
    assert employee_profile_response.status_code == 200
    employee_id = employee_profile_response.json()["id"]

    delete_employee_response = client.delete(f"/employees/{employee_id}", headers=admin_headers)
    assert delete_employee_response.status_code == 204

    list_employees_response = client.get("/employees", headers=admin_headers)
    assert list_employees_response.status_code == 200
    assert all(item["id"] != employee_id for item in list_employees_response.json())

    deleted_login_response = client.post(
        "/login",
        json={"email": "employee-soft-delete@example.com", "password": "secret123"},
    )
    assert deleted_login_response.status_code == 401
    assert "invalid email or password" in deleted_login_response.json()["detail"].lower()


def test_admin_hard_delete_employee_removes_files_and_allows_email_reuse(client):
    register_admin_response = client.post(
        "/register",
        json={
            "email": "admin-hard-delete@example.com",
            "full_name": "Admin Hard Delete",
            "password": "secret123",
            "role": "admin",
        },
    )
    assert register_admin_response.status_code == 201

    register_employee_response = client.post(
        "/register",
        json={
            "email": "employee-hard-delete@example.com",
            "full_name": "Employee Hard Delete",
            "password": "secret123",
            "role": "employee",
        },
    )
    assert register_employee_response.status_code == 201

    employee_login = client.post(
        "/login",
        json={"email": "employee-hard-delete@example.com", "password": "secret123"},
    )
    assert employee_login.status_code == 200
    employee_headers = {"Authorization": f"Bearer {employee_login.json()['access_token']}"}

    employee_profile_response = client.get("/employees/me/profile", headers=employee_headers)
    assert employee_profile_response.status_code == 200
    employee_id = employee_profile_response.json()["id"]

    photo_response = client.post(
        "/me/profile-photo",
        headers=employee_headers,
        files={"file": ("photo.png", io.BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png")},
    )
    assert photo_response.status_code == 200
    profile_photo_url = photo_response.json()["profile_photo"]
    assert profile_photo_url.startswith("/uploads/profile_photos/")

    admin_login = client.post(
        "/login",
        json={"email": "admin-hard-delete@example.com", "password": "secret123"},
    )
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    delete_employee_response = client.delete(f"/employees/{employee_id}", headers=admin_headers)
    assert delete_employee_response.status_code == 204

    list_employees_response = client.get("/employees", headers=admin_headers)
    assert list_employees_response.status_code == 200
    assert all(item["id"] != employee_id for item in list_employees_response.json())

    recreated_response = client.post(
        "/register",
        json={
            "email": "employee-hard-delete@example.com",
            "full_name": "Employee Hard Delete Recreated",
            "password": "secret123",
            "role": "employee",
        },
    )
    assert recreated_response.status_code == 201
