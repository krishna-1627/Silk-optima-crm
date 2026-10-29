import React from "react";

export default function FeatureCards() {
  return (
    <div className="bg-white rounded-3xl lg:rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 md:p-8 lg:p-6 border border-gray-100 z-20 relative w-full">
      {/* Features Header */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 lg:mb-5">
        <div className="h-px w-8 sm:w-10 bg-gray-200"></div>
        <h2 className="text-base sm:text-lg font-bold text-[#0a192f] tracking-tight text-center">
          Manage Your Information
        </h2>
        <div className="h-px w-8 sm:w-10 bg-gray-200"></div>
      </div>

      {/* Features Grid - Mobile par 1 column, Tablet par 2, aur Desktop par 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-4 lg:gap-3 lg:divide-x divide-gray-100">
        <Card
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          }
          title="Personal Details"
          desc="Update your info securely."
        />
        <Card
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              ></path>
            </svg>
          }
          title="Employment"
          desc="Manage job profile & roles."
        />
        <Card
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          }
          title="Submit Data"
          desc="Fill required forms easily."
        />
        <Card
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          }
          title="History Log"
          desc="Track past submissions."
        />
        <Card
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              ></path>
            </svg>
          }
          title="Request Status"
          desc="Monitor HR approvals."
        />
      </div>
    </div>
  );
}

function Card({ icon, title, desc }) {
  return (
    <div className="flex flex-row sm:flex-col items-center text-left sm:text-center px-2 py-2 hover:-translate-y-1 transition-transform duration-300 gap-4 sm:gap-0">
      <div className="w-12 h-12 sm:w-10 sm:h-10 shrink-0 bg-[#0052cc] rounded-full flex items-center justify-center text-white sm:mb-3 shadow-md">
        {icon}
      </div>
      <div>
        <h3 className="text-[14px] sm:text-[13px] font-bold text-gray-900 mb-0.5 sm:mb-1">
          {title}
        </h3>
        <p className="text-[12px] sm:text-[11px] text-gray-500 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  );
}
