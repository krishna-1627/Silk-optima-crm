import React from "react";
import { Link } from "react-router-dom";

export default function LandingHero() {
  return (
    <div className="relative isolate w-full overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 z-0 h-[280px] bg-[#0052cc] shadow-2xl rounded-bl-[60px] sm:h-[320px] sm:rounded-bl-[100px] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[48vw] lg:rounded-bl-[180px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-full w-full flex-col items-center justify-center gap-6 pb-10 pt-6 sm:gap-8 lg:min-h-[650px] lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:pt-10 lg:pb-36">
          <div className="order-2 w-full min-w-0 max-w-full lg:order-1 lg:w-[48%] lg:max-w-xl">
            <div className="rounded-3xl border border-white/50 bg-white/90 p-4 shadow-lg backdrop-blur-md lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              <div className="mb-5 sm:mb-6">
                <img
                  src="/logo.png"
                  alt="SilkOptima Logo"
                  className="h-8 w-auto max-w-full object-contain drop-shadow-sm sm:h-9 lg:h-10"
                />
              </div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#0052cc]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0052cc]">
                  Welcome Back
                </span>
              </div>

              <h1 className="mb-4 max-w-full text-3xl font-extrabold leading-[1.2] tracking-tight text-[#0a192f] sm:text-4xl lg:text-[3.5rem] lg:leading-[1.15]">
                Employee <br className="hidden sm:block" />
                Information <span className="text-[#0052cc]">Portal</span>
              </h1>

              <p className="mb-6 max-w-full text-sm font-medium leading-relaxed text-slate-600 sm:text-base lg:max-w-md">
                Access your employee profile, update your information, upload
                required documents, and submit requests for HR approval—all from
                one secure portal.
              </p>

              <div className="flex w-full max-w-full flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0052cc] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#003d99] sm:w-auto sm:py-2.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-[#0052cc] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0052cc] hover:bg-slate-50 sm:w-auto sm:py-2.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    ></path>
                  </svg>
                  Create Account
                </Link>
              </div>
            </div>
          </div>

          <div className="order-1 w-full min-w-0 max-w-full lg:order-2 lg:w-[52%] lg:max-w-[520px]">
            <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-3xl border-4 border-white/30 bg-white shadow-2xl lg:max-w-[500px] lg:rounded-[1.5rem] lg:border-[5px] lg:border-[#0052cc]/30">
              <img
                src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1000&auto=format&fit=crop"
                alt="Professional employees"
                className="h-[220px] w-full object-cover object-top sm:h-[300px] lg:h-[520px] lg:object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
