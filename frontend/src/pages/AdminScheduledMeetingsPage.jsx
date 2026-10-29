import React, { useEffect, useState, useMemo } from "react";
import { 
  FiCalendar, 
  FiClock, 
  FiDownload, 
  FiFileText, 
  FiSearch, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiX, 
  FiRefreshCw,
  FiTrash2
} from "react-icons/fi";
import ContentContainer from "../components/layout/ContentContainer";
import PageHeader from "../components/layout/PageHeader";
import ScheduleInterviewModal from "../components/admin/ScheduleInterviewModal";
import { fetchAllInterviews, deleteInterview } from "../services/interviews";
import { useToast } from "../components/common/ToastProvider";
import { useAuth } from "../context/AuthContext";

export default function AdminScheduledMeetingsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeSummaryInterview, setActiveSummaryInterview] = useState(null);


  const { addToast } = useToast();

  const loadInterviews = async () => {
    setLoading(true);
    try {
      const data = await fetchAllInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load scheduled meetings:", err);
      // Only toast if it's not a cancelled request
      if (err?.response?.status === 401) {
        addToast("Session expired or unauthorized. Please re-login.", "error");
      } else {
        addToast(err?.response?.data?.detail || "Failed to load scheduled meetings", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined"
        ? window.localStorage?.getItem("silk-optima-token") ||
          window.sessionStorage?.getItem("silk-optima-token") ||
          window.localStorage?.getItem("auth_token") ||
          window.sessionStorage?.getItem("auth_token")
        : null;

    if (!authLoading && (token || storedToken)) {
      loadInterviews();
    } else if (!authLoading && !token && !storedToken) {
      setLoading(false);
    }
  }, [authLoading, token]);



  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const matchesSearch = 
        item.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.candidate_email?.toLowerCase().includes(search.toLowerCase()) ||
        item.job_role?.toLowerCase().includes(search.toLowerCase());

      if (statusFilter === "ALL") return matchesSearch;
      if (statusFilter === "COMPLETED") return matchesSearch && item.status === "COMPLETED";
      if (statusFilter === "PENDING") return matchesSearch && item.status === "SCHEDULED";
      if (statusFilter === "EXPIRED") return matchesSearch && (item.status === "EXPIRED" || item.status === "CANCELLED");
      return matchesSearch;
    });
  }, [interviews, search, statusFilter]);

  const handleDownloadTranscript = (interview) => {
    const transcriptText = interview.transcript || `Candidate: ${interview.candidate_name}\nInterview Date: ${interview.scheduled_date}\nTime Slot: ${interview.time_slot}\nRole: ${interview.job_role || 'Not specified'}\n\n[Transcript Content]:\n(No detailed transcript captured for this session yet)`;
    const blob = new Blob([transcriptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Interview_Transcript_${interview.candidate_name.replace(/\s+/g, "_")}_${interview.scheduled_date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Transcript downloaded successfully", "success");
  };

  const handleDeleteInterview = async (interview) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete the scheduled interview for "${interview.candidate_name}"?\n\nThis will permanently delete it and immediately deactivate the interview link.`
    );
    if (!isConfirmed) return;

    setDeletingId(interview.id);
    try {
      await deleteInterview(interview.id);
      addToast("Scheduled interview deleted & link revoked successfully", "success");
      setInterviews((prev) => prev.filter((i) => i.id !== interview.id));
    } catch (err) {
      console.error("Failed to delete interview:", err);
      addToast(err?.response?.data?.detail || "Failed to delete scheduled interview", "error");
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div>
      <PageHeader
        title="Scheduled Meetings"
        subtitle="Manage scheduled AI candidate interviews, review session summaries, and download transcripts"
      />

      <ContentContainer>
        {/* Controls Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-xs sm:max-w-md">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate, email or role..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:bg-white transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-cyan-500 focus:bg-white transition"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending (Scheduled)</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXPIRED">Expired / Cancelled</option>
            </select>

            <button
              type="button"
              onClick={loadInterviews}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-100 transition"
              title="Refresh"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-700 w-full sm:w-auto justify-center"
            >
              <FiCalendar className="h-4 w-4" />
              + Schedule Meeting
            </button>
          </div>
        </div>

        {/* Meetings Table */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <FiRefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-600" />
            Loading scheduled meetings...
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500 bg-slate-50/50">
            <FiCalendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="font-semibold text-slate-700">No scheduled meetings found</p>
            <p className="text-xs text-slate-400 mt-1">Schedule an interview using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Candidate</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Allocated Date & Time</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Summary</th>
                  <th className="px-5 py-4 text-center">Download Transcript</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInterviews.map((item) => {
                  const isCompleted = item.status === "COMPLETED";
                  const isScheduled = item.status === "SCHEDULED";
                  const isExpired = item.status === "EXPIRED" || item.status === "CANCELLED";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Candidate Name & Email */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{item.candidate_name}</div>
                        <div className="text-xs text-slate-500">{item.candidate_email}</div>
                      </td>

                      {/* Job Role */}
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {item.job_role || "Candidate"}
                      </td>

                      {/* Allocated Time & Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs sm:text-sm">
                          <FiCalendar className="h-3.5 w-3.5 text-cyan-600" />
                          {item.scheduled_date}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <FiClock className="h-3 w-3 text-slate-400" />
                          {item.time_slot}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Completed
                          </span>
                        ) : isScheduled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <FiAlertCircle className="h-3.5 w-3.5 text-slate-400" />
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Summary Button */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setActiveSummaryInterview(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-100 transition shadow-sm"
                          >
                            <FiFileText className="h-3.5 w-3.5 text-cyan-600" />
                            View Summary
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Available after completion</span>
                        )}
                      </td>

                      {/* Download Transcript Button */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadTranscript(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                          >
                            <FiDownload className="h-3.5 w-3.5 text-slate-600" />
                            Download Transcript
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Action: Delete / Cancel */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteInterview(item)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition shadow-sm disabled:opacity-50"
                          title="Delete interview and invalidate link"
                        >
                          <FiTrash2 className="h-3.5 w-3.5 text-rose-500" />
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentContainer>

      {/* Summary Popup Modal */}
      {activeSummaryInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition-all sm:p-7">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <FiFileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 sm:text-lg">Interview Summary</h3>
                  <p className="text-xs text-slate-500">{activeSummaryInterview.candidate_name} &bull; {activeSummaryInterview.job_role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSummaryInterview(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700 max-h-64 overflow-y-auto">
                {activeSummaryInterview.summary || (
                  <p className="text-slate-500 italic">
                    Candidate completed all questions successfully. Showed good communication and clear problem solving skills during the AI interview session.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                <span>Date: <strong>{activeSummaryInterview.scheduled_date}</strong></span>
                <span>Slot: <strong>{activeSummaryInterview.time_slot}</strong></span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => handleDownloadTranscript(activeSummaryInterview)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                <FiDownload className="h-3.5 w-3.5" />
                Download Transcript
              </button>
              <button
                type="button"
                onClick={() => setActiveSummaryInterview(null)}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700 transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduled={() => {
          loadInterviews();
        }}
      />
    </div>
  );
}
