import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import ProfileDropdown from '../components/layout/ProfileDropdown';
import NotificationCenter from '../components/layout/NotificationCenter';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEmployeeProfileRoute = /\/admin\/employees\/\d+\/profile$/.test(location.pathname);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8fafd] font-sans text-slate-800">
      <main className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden">

        {/* Top Header - mobile-first stack */}
        <header className="relative z-10 w-full max-w-full shrink-0 border-b border-gray-100 bg-white px-3 py-3 shadow-sm sm:px-4 md:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-slate-800 sm:text-lg lg:text-xl">
                SilkOptima Admin Portal
              </h1>
              <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => navigate('/admin/employees')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                    location.pathname.startsWith('/admin/employees')
                      ? 'bg-white text-cyan-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Employees
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/scheduled-meetings')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                    location.pathname.startsWith('/admin/scheduled-meetings')
                      ? 'bg-white text-cyan-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Scheduled Meetings
                </button>
              </nav>
            </div>

            <div className="w-full md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center md:gap-4 w-full">
                <div className="flex items-center justify-end gap-2 md:gap-4 mt-2 md:mt-0">
                  {isEmployeeProfileRoute && (
                    <button
                      type="button"
                      onClick={() => navigate('/admin/employees')}
                      className="md:hidden inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                      aria-label="Back to employees list"
                    >
                      <FiArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <NotificationCenter />
                  <ProfileDropdown />
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Pages Render Here (Dashboard, Settings, etc.) */}
        <div className="flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-10">
          <Outlet />
        </div>

      </main>
    </div>
  );
}
