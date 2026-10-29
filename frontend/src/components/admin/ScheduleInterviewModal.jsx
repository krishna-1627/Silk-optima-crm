import { useEffect, useState } from "react";
import { FiCalendar, FiClock, FiMail, FiSend, FiUser, FiX, FiCheckCircle } from "react-icons/fi";
import { searchCandidatesForInterview, scheduleAIInterview } from "../../services/interviews";
import { useToast } from "../common/ToastProvider";

export default function ScheduleInterviewModal({ isOpen, onClose, onScheduled, initialCandidate }) {
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [jobRole, setJobRole] = useState("Software Engineer");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 11:30 AM");
  const [turnsLimit, setTurnsLimit] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset
  useEffect(() => {
    if (isOpen) {
      // Default to tomorrow's date formatted as YYYY-MM-DD
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      setScheduledDate(`${yyyy}-${mm}-${dd}`);

      if (initialCandidate) {
        setSelectedCandidate(initialCandidate);
        setJobRole(initialCandidate.designation || initialCandidate.role || "Software Engineer");
      } else {
        setSelectedCandidate(null);
        setSearchQuery("");
        setCandidatesList([]);
      }
    }
  }, [isOpen, initialCandidate]);

  // Live search debounced
  useEffect(() => {
    if (!isOpen || selectedCandidate || searchQuery.trim().length < 2) {
      setCandidatesList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCandidatesForInterview(searchQuery.trim());
        setCandidatesList(results);
      } catch (err) {
        console.error("Failed to search candidates", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, selectedCandidate]);

  if (!isOpen) return null;

  const handleSelectCandidate = (cand) => {
    setSelectedCandidate(cand);
    setSearchQuery("");
    setCandidatesList([]);
    if (cand.designation) {
      setJobRole(cand.designation);
    }
  };

  const handleClearSelectedCandidate = () => {
    setSelectedCandidate(null);
    setSearchQuery("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      addToast("Please select a candidate to schedule the interview.", "error");
      return;
    }
    if (!scheduledDate) {
      addToast("Please select a scheduled date.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        candidate_id: selectedCandidate.id,
        candidate_email: selectedCandidate.email,
        job_role: jobRole,
        scheduled_date: scheduledDate,
        time_slot: timeSlot,
        turns_limit: Number(turnsLimit),
        duration_minutes: Number(durationMinutes),
        expires_in_hours: Number(expiresInHours),
        notes: notes.trim() || null,
      };

      const result = await scheduleAIInterview(payload);
      addToast(`AI Interview scheduled! Invitation email sent to ${selectedCandidate.email}`, "success");
      if (onScheduled) onScheduled(result);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to schedule interview";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition-all sm:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <FiCalendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Schedule AI Interview</h2>
              <p className="text-xs text-slate-500">Dispatch invitation link & configure interview parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Candidate Search / Selected Candidate */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Candidate Selection *
            </label>

            {selectedCandidate ? (
              <div className="flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white font-bold text-sm">
                    {selectedCandidate.full_name?.charAt(0) || "C"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedCandidate.full_name}</p>
                    <p className="text-xs text-slate-600">{selectedCandidate.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedCandidate}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-cyan-500 focus-within:bg-white transition">
                  <FiMail className="mr-2.5 h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate by email or full name..."
                    className="w-full bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400"
                  />
                  {isSearching && <span className="text-xs text-cyan-600 animate-pulse font-medium">Searching…</span>}
                </div>

                {/* Dropdown Results */}
                {candidatesList.length > 0 && (
                  <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {candidatesList.map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => handleSelectCandidate(cand)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{cand.full_name}</p>
                          <p className="text-xs text-slate-500">{cand.email}</p>
                        </div>
                        {cand.has_scheduled_interview ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                            Already Scheduled
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-cyan-600 hover:underline">
                            Select &rarr;
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job Role / Position */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Position / Job Role
            </label>
            <input
              type="text"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Full Stack Developer, Python Engineer"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
            />
          </div>

          {/* Scheduled Date & Time Slot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Interview Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Time Window / Slot *
              </label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="e.g. 10:00 AM - 11:30 AM"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Turns Limit & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Questions / Turns
              </label>
              <select
                value={turnsLimit}
                onChange={(e) => setTurnsLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
              >
                <option value="3">3 Questions</option>
                <option value="5">5 Questions (Default)</option>
                <option value="7">7 Questions</option>
                <option value="10">10 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Link Expiry
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
              >
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="48">48 Hours (2 Days)</option>
                <option value="72">72 Hours (3 Days)</option>
              </select>
            </div>
          </div>

          {/* Special Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Additional Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific technical topic or instructions for admin reference..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCandidate}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 hover:bg-cyan-700 transition disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
              {isSubmitting ? "Dispatching Invitation..." : "Schedule & Send Invitation"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
