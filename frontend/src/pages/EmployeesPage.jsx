import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiSearch, FiCalendar } from "react-icons/fi";
import ContentContainer from "../components/layout/ContentContainer";
import PageHeader from "../components/layout/PageHeader";
import EmployeeTable from "../components/employees/EmployeeTable";
import EmployeeModal from "../components/employees/EmployeeModal";
import ScheduleInterviewModal from "../components/admin/ScheduleInterviewModal";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import Modal from "../components/common/Modal";
import api from "../services/api";
import { fetchAllInterviews } from "../services/interviews";

import { useToast } from "../components/common/ToastProvider";
import {
  notifyEmployeeProfileUpdated,
  subscribeToEmployeeProfileUpdates,
} from "../utils/employeeSync";
import { resolveEmployeeDisplayId } from "../utils/employeeExport";

const normalizeEmployeeRecord = (employee) => {
  const resolvedEmployeeId = resolveEmployeeDisplayId(employee);

  const resolvedDepartment =
    employee?.user?.department ||
    employee?.user?.role ||
    employee?.department ||
    employee?.position ||
    "Not provided";

  // Synchronizing designation and status to user profile fields
  const resolvedDesignation =
    employee?.user?.role ||
    employee?.role ||
    employee?.position ||
    employee?.designation ||
    "";
  const resolvedStatus =
    employee?.user?.is_active !== undefined
      ? employee.user.is_active
        ? "Active"
        : "Inactive"
      : employee?.status || "Active";

  return {
    ...employee,
    employeeId: resolvedEmployeeId
      ? String(resolvedEmployeeId)
      : "Not provided",
    name:
      employee.user?.full_name ||
      employee.user?.email ||
      `Employee ${employee.id}`,
    email: employee.user?.email || "",
    phone: employee.user?.phone || "",
    location: employee.user?.location || "",
    department: resolvedDepartment,
    designation: resolvedDesignation,
    joiningDate: employee.hire_date || employee.created_at,
    status: resolvedStatus,
  };
};

const validateEmployeePayload = (payload) => {
  const errors = {};
  const email = String(payload?.email || "").trim();
  const phone = String(payload?.phone || "").trim();
  const designation = String(payload?.designation || "").trim();
  const status = String(payload?.status || "").trim();

  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Please enter a valid email address.";
  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^\+?\d[\d\s().-]{7,}$/.test(phone))
    errors.phone = "Please enter a valid phone number.";
  if (!designation) errors.designation = "Designation is required.";
  if (!status) errors.status = "Status is required.";

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [candidateToSchedule, setCandidateToSchedule] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedInterviewReport, setSelectedInterviewReport] = useState(null);
  const { addToast } = useToast();

  const loadEmployees = async () => {
    try {
      const [{ data: employeeData }, interviewsData] = await Promise.all([
        api.get("/employees"),
        fetchAllInterviews().catch(() => []),
      ]);

      const interviewsByUserId = {};
      const interviewsByEmail = {};
      (interviewsData || []).forEach((inv) => {
        if (inv.candidate_id) interviewsByUserId[inv.candidate_id] = inv;
        if (inv.candidate_email) interviewsByEmail[inv.candidate_email.toLowerCase()] = inv;
      });

      const normalizedEmployees = (
        Array.isArray(employeeData) ? employeeData : []
      ).map((employee) => {
        const normalizedEmployee = normalizeEmployeeRecord(employee);

        const vStatus =
          employee.verification_status ||
          employee.user?.verification_status ||
          employee.verificationStatus ||
          "Pending";

        const normalizedVerificationStatus =
          vStatus === "Rejected" || vStatus === "Pending Review" || vStatus === "Pending Verification"
            ? "Pending"
            : vStatus === "Verified"
              ? "Verified"
              : "Pending";

        const userId = employee.user_id || employee.user?.id;
        const userEmail = (employee.email || employee.user?.email || "").toLowerCase();
        const activeInterview = (userId && interviewsByUserId[userId]) || (userEmail && interviewsByEmail[userEmail]) || null;

        return {
          ...normalizedEmployee,
          verificationStatus: normalizedVerificationStatus,
          interview: activeInterview,
        };
      });

      setEmployees(normalizedEmployees);
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to load employees",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadEmployees();
  }, [addToast]);

  useEffect(() => {
    const unsubscribe = subscribeToEmployeeProfileUpdates(() => {
      loadEmployees();
    });

    return unsubscribe;
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const term = search.toLowerCase();
      return (
        employee.name.toLowerCase().includes(term) ||
        employee.designation.toLowerCase().includes(term) ||
        employee.employeeId.toLowerCase().includes(term) ||
        employee.email.toLowerCase().includes(term)
      );
    });
  }, [employees, search]);

  const navigate = useNavigate();

  const openAddModal = () => {
    setSelectedEmployee(null);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleViewEmployee = (employee) => {
    navigate(`/admin/employees/${employee.id}/profile`);
  };

  const openDeleteModal = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  const openDetailsModal = (employee) => {
    setSelectedDetails(employee);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setSelectedDetails(null);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/employees/${employeeToDelete.id}`);
      setEmployees((prev) =>
        prev.filter((item) => item.id !== employeeToDelete.id),
      );
      notifyEmployeeProfileUpdated();
      addToast("Employee deleted successfully.", "success");
      closeDeleteModal();
    } catch (error) {
      addToast(
        error?.response?.data?.detail ||
          "Unable to delete employee. Please try again.",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (payload) => {
    const validation = validateEmployeePayload(payload);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      addToast(firstError || "Please complete all required fields.", "error");
      return;
    }

    const requestPayload = {
      department:
        selectedEmployee?.department || payload.department || "General",
      position:
        payload.designation ||
        selectedEmployee?.position ||
        selectedEmployee?.designation ||
        "Candidate",
      status: payload.status,
      email: payload.email,
      phone: payload.phone,
      designation: payload.designation,
      lastWorkingDate: payload.lastWorkingDate || "",
      employmentStatus: payload.status,
      location: selectedEmployee?.location || payload.location || "",
    };

    try {
      if (modalMode === "edit" && selectedEmployee) {
        const { data } = await api.put(
          `/employees/${selectedEmployee.id}`,
          requestPayload,
        );
        const nextEmployee = normalizeEmployeeRecord({
          ...selectedEmployee,
          ...data,
          user: data?.user || selectedEmployee.user || null,
        });
        setEmployees((prev) =>
          prev.map((item) =>
            item.id === selectedEmployee.id
              ? {
                  ...nextEmployee,
                  verificationStatus: item.verificationStatus,
                }
              : item,
          ),
        );
      } else {
        const { data } = await api.post("/employees", {
          ...requestPayload,
          department: requestPayload.department || "General",
          position: requestPayload.position || "Candidate",
        });
        setEmployees((prev) => [
          normalizeEmployeeRecord({
            ...data,
          }),
          ...prev,
        ]);
      }

      await loadEmployees();
      notifyEmployeeProfileUpdated();
      addToast(
        modalMode === "edit"
          ? "Employee profile updated successfully."
          : "Employee created successfully.",
        "success",
      );
      closeModal();
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to save employee",
        "error",
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage workforce profiles and status"
      />

      <ContentContainer>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCandidateToSchedule(null);
                setIsScheduleModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-700"
            >
              <FiCalendar className="h-4 w-4" />
              Schedule AI Interview
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading employees…</p>
        ) : (
          <EmployeeTable
            employees={filteredEmployees}
            onEdit={openEditModal}
            onView={handleViewEmployee}
            onDelete={openDeleteModal}
            onScheduleInterview={(candidate) => {
              setCandidateToSchedule(candidate);
              setIsScheduleModalOpen(true);
            }}
            onViewInterviewReport={(interview) => {
              setSelectedInterviewReport(interview);
              setIsReportModalOpen(true);
            }}
          />
        )}
      </ContentContainer>

      <EmployeeModal
        isOpen={isModalOpen}
        mode={modalMode}
        employee={selectedEmployee}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {selectedDetails && (
        <Modal
          isOpen={Boolean(selectedDetails)}
          title="Employee Details"
          description="Detailed profile overview"
          onClose={closeModal}
          width="min(95vw, 760px)"
          scrollable
          footer={
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Close
            </button>
          }
        >
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Employee ID
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {selectedDetails.employeeId}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Name
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {selectedDetails.name}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Email
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {selectedDetails.email}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Phone
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {selectedDetails.phone}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Department
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {selectedDetails.department}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Designation
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {selectedDetails.designation}
              </p>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmationDialog
        isOpen={deleteModalOpen}
        title="Delete Employee"
        message={
          <>
            <p className="text-sm leading-6 text-slate-600">
              Are you sure you want to delete this employee?
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This action cannot be undone.
            </p>
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteEmployee}
        onClose={closeDeleteModal}
        confirmLoading={isDeleting}
      />

      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        initialCandidate={candidateToSchedule}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setCandidateToSchedule(null);
        }}
        onScheduled={() => {
          loadEmployees();
        }}
      />
    </div>
  );
}



export default EmployeesPage;
