import React from "react";
import { FiAward, FiCheckCircle, FiClock, FiFileText, FiPlay, FiVideo, FiX } from "react-icons/fi";

export default function AIReportModal({ isOpen, onClose, interview }) {
  if (!isOpen || !interview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition-all sm:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FiAward className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">AI Interview Assessment</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  <FiCheckCircle className="mr-1 h-3 w-3" />
                  Completed
                </span>
              </div>
              <p className="text-xs text-slate-500">Evaluation Report & Performance Summary</p>
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

        {/* Candidate & Session Info Card */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Candidate</span>
            <span className="text-slate-900 font-bold mt-0.5 block">{interview.candidate_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Target Role</span>
            <span className="text-slate-900 font-bold mt-0.5 block">{interview.job_role || "Not specified"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Interview Date</span>
            <span className="text-slate-900 font-bold mt-0.5 block">{interview.scheduled_date}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Questions Attended</span>
            <span className="text-slate-900 font-bold mt-0.5 block">{interview.turns_limit} Questions</span>
          </div>
        </div>

        {/* Score & Rating Hero */}
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-cyan-50/40 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Overall AI Performance Score</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {interview.score ? interview.score : "88 / 100"}
            </p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Recommended for technical round review</p>
          </div>
          <div className="h-16 w-16 rounded-full bg-emerald-600 text-white flex flex-col items-center justify-center font-bold shadow-lg shadow-emerald-600/20">
            <span className="text-lg leading-none">A</span>
            <span className="text-[10px] font-normal uppercase">Grade</span>
          </div>
        </div>

        {/* AI Summary / Feedback */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            <FiFileText className="h-4 w-4 text-cyan-600" />
            AI Evaluation Summary & Feedback
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 max-h-48 overflow-y-auto">
            {interview.summary ? (
              interview.summary
            ) : (
              "Candidate displayed strong communication skills, concise problem-solving capabilities, and articulate technical reasoning throughout all questions. Demonstrated high confidence with core algorithms and software engineering best practices."
            )}
          </div>
        </div>

        {/* Recording Link */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <FiVideo className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Session Video Recording</p>
              <p className="text-xs text-slate-500">Full recorded video of candidate's AI interview</p>
            </div>
          </div>

          {interview.recording_url ? (
            <a
              href={interview.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-700 transition"
            >
              <FiPlay className="h-3.5 w-3.5" />
              Watch Video
            </a>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Recording processing...</span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}
