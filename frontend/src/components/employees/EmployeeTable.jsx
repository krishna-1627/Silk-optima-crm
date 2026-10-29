import { useEffect, useState } from "react";
import { FiDownload, FiTrash2, FiCalendar, FiAward, FiCheckCircle } from "react-icons/fi";
import api from "../../services/api";
import { useToast } from "../common/ToastProvider";

function formatJoiningDate(value) {
  if (!value) return "-";

  const trimmedValue = String(value).trim();
  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsedDate = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    return `${String(parsedDate.getUTCDate()).padStart(2, "0")} ${parsedDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${parsedDate.getUTCFullYear()}`;
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return `${String(parsedDate.getDate()).padStart(2, "0")} ${parsedDate.toLocaleDateString("en-US", { month: "short" })} ${parsedDate.getFullYear()}`;
}

// 100% Accurate IST Converter
function formatDateTimeIST(value) {
  if (!value) return "";
  let dateStr = String(value);

  // Force it to UTC if it doesn't have a timezone specifier
  if (!dateStr.endsWith("Z") && !dateStr.match(/[+-]\d\d:?\d\d$/)) {
    dateStr = dateStr.replace(" ", "T") + "Z";
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  // Manually add 5 hours 30 mins to guarantee IST Time regardless of browser TZ
  const istTime = new Date(d.getTime() + 11 * 60 * 60 * 1000);

  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[istTime.getUTCMonth()];
  const year = istTime.getUTCFullYear();

  let hours = istTime.getUTCHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(istTime.getUTCMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} • ${String(hours).padStart(2, "0")}:${minutes} ${ampm} (IST)`;
}

function EmployeeTable({ employees, onEdit, onView, onDelete, onScheduleInterview, onViewInterviewReport }) {
  const [downloadMenuOpenId, setDownloadMenuOpenId] = useState(null);
  const { addToast } = useToast();

  const downloadOptions = [
    { label: "PDF (.pdf)", value: "pdf" },
    { label: "Word (.docx)", value: "docx" },
    { label: "Excel (.xlsx)", value: "xlsx" },
    { label: "CSV (.csv)", value: "csv" },
    { label: "JSON (.json)", value: "json" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".download-menu")) {
        setDownloadMenuOpenId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDownloadMenu = (id) => {
    setDownloadMenuOpenId((prev) => (prev === id ? null : id));
  };

  const performDownload = async (employee, format) => {
    try {
      const response = await api.get(
        `/admin/employees/${employee.id}/download`,
        {
          params: { format },
          responseType: "blob",
        },
      );

      const contentDisposition = response.headers["content-disposition"];
      let fileName = `Employee_${employee.employeeId || employee.id}_${employee.name || "Profile"}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) {
          fileName = match[1];
        }
      }

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadMenuOpenId(null);
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to download employee profile.",
        "error",
      );
    }
  };

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="hidden lg:block min-w-0">
        <table className="w-full min-w-full table-auto text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 [&>tr>th:first-child]:rounded-tl-[24px] [&>tr>th:last-child]:rounded-tr-[24px]">
            <tr>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Employee ID
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Verification
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Name
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                View Profile
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Designation
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Date of Joining (DOJ)
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-center">
                Status
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-center">
                AI Interview
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Download
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Edit
              </th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold">
                Delete
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const isActive = employee.status
                ? String(employee.status).toLowerCase() !== "inactive"
                : (employee.is_active ?? employee?.user?.is_active ?? true);

              return (
                <tr
                  key={employee.id}
                  className="border-t border-slate-200 bg-white transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                    {employee.employeeId}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex flex-col">
                      <span
                        className={`font-semibold ${employee.verificationStatus === "Verified" ? "text-emerald-600" : employee.verificationStatus === "Pending Review" || employee.verificationStatus === "Pending Verification" || employee.verificationStatus === "Pending" ? "text-amber-600" : "text-rose-600"}`}
                      >
                        {employee.verificationStatus || "Verified"}
                      </span>
                      {(employee.verification_updated_at ||
                        employee.updated_at ||
                        employee.created_at ||
                        employee.user?.updated_at) && (
                        <span className="text-[10px] text-slate-400 mt-1">
                          {formatDateTimeIST(
                            employee.verification_updated_at ||
                              employee.updated_at ||
                              employee.created_at ||
                              employee.user?.updated_at,
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {employee.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {employee.email}
                      </p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <button
                      onClick={() => onView(employee)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      View
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600 capitalize">
                    {employee.designation}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {formatJoiningDate(employee.joiningDate)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    {employee.interview?.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <FiCheckCircle className="h-3 w-3 text-emerald-600" />
                        Completed
                      </span>
                    ) : employee.interview?.status === "SCHEDULED" ? (
                      <div className="inline-flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Pending
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {employee.interview.scheduled_date}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview && onScheduleInterview(employee.user || employee)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                      >
                        <FiCalendar className="h-3.5 w-3.5 text-cyan-600" />
                        Schedule
                      </button>
                    )}
                  </td>


                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="relative inline-block download-menu">
                      <button
                        onClick={() => toggleDownloadMenu(employee.id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <FiDownload className="mr-1 h-3.5 w-3.5" />
                        Download
                      </button>
                      {downloadMenuOpenId === employee.id && (
                        <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                          {downloadOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                performDownload(employee, option.value)
                              }
                              className="flex w-full items-center px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <button
                      onClick={() => onEdit(employee)}
                      className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100"
                    >
                      Edit
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <button
                      onClick={() => onDelete(employee)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      <FiTrash2 className="inline-block h-3.5 w-3.5 align-text-bottom" />
                      <span className="ml-1">Delete</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="block space-y-3 p-3 md:p-4 lg:hidden">
        {employees.map((employee) => {
          const isActive = employee.status
            ? String(employee.status).toLowerCase() !== "inactive"
            : (employee.is_active ?? employee?.user?.is_active ?? true);

          return (
            <div
              key={employee.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {employee.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {employee.email}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Employee ID
                  </p>
                  <p className="mt-1 font-medium text-slate-700">
                    {employee.employeeId}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Designation
                  </p>
                  <p className="mt-1 font-medium text-slate-700 capitalize">
                    {employee.designation}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    DOJ
                  </p>
                  <p className="mt-1 font-medium text-slate-700">
                    {formatJoiningDate(employee.joiningDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Verification
                  </p>
                  <div className="flex flex-col mt-1">
                    <p
                      className={`font-semibold ${employee.verificationStatus === "Verified" ? "text-emerald-600" : employee.verificationStatus === "Pending Review" || employee.verificationStatus === "Pending Verification" || employee.verificationStatus === "Pending" ? "text-amber-600" : "text-rose-600"}`}
                    >
                      {employee.verificationStatus || "Verified"}
                    </p>
                    {(employee.verification_updated_at ||
                      employee.updated_at ||
                      employee.created_at ||
                      employee.user?.updated_at) && (
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateTimeIST(
                          employee.verification_updated_at ||
                            employee.updated_at ||
                            employee.created_at ||
                            employee.user?.updated_at,
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 relative download-menu">
                <button
                  onClick={() => onView(employee)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  View
                </button>
                <div className="relative inline-block">
                  <button
                    onClick={() => toggleDownloadMenu(employee.id)}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <FiDownload className="mr-1 h-3.5 w-3.5" />
                    Download
                  </button>
                  {downloadMenuOpenId === employee.id && (
                    <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {downloadOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            performDownload(employee, option.value)
                          }
                          className="flex w-full items-center px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {employee.interview?.status === "COMPLETED" ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                    <FiCheckCircle className="h-3 w-3 text-emerald-600" />
                    Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onScheduleInterview && onScheduleInterview(employee.user || employee)}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                  >
                    <FiCalendar className="h-3.5 w-3.5 text-cyan-600" />
                    {employee.interview?.status === "SCHEDULED" ? "Pending" : "Schedule"}
                  </button>
                )}
                <button
                  onClick={() => onEdit(employee)}
                  className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(employee)}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  <FiTrash2 className="inline-block h-3.5 w-3.5 align-text-bottom" />
                  <span className="ml-1">Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EmployeeTable;
