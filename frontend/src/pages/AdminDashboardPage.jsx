import { useEffect, useState } from 'react';
import { FiUsers, FiBriefcase, FiFileText, FiSettings } from 'react-icons/fi';
import api from '../services/api';

export default function AdminDashboardPage() {
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [newApplications, setNewApplications] = useState(0);
  const [activeJobs, setActiveJobs] = useState(0);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [candidatesRes, applicationsRes, positionsRes] = await Promise.all([
          api.get('/candidates'),
          api.get('/applications'),
          api.get('/open-positions'),
        ]);

        const candidates = candidatesRes.data || [];
        const applications = applicationsRes.data || [];
        const positions = positionsRes.data || [];

        setTotalCandidates(candidates.length);
        setNewApplications(applications.length);
        setActiveJobs(positions.filter((position) => position.is_active).length);

        const recent = applications
          .slice()
          .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
          .slice(0, 5)
          .map((application) => ({
            id: application.id,
            candidateName: application.candidate_name || `Candidate ${application.candidate_id}`,
            role: application.open_position_title || 'Unknown Role',
            date: application.applied_at
              ? new Date(application.applied_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Unknown',
            status: application.status || 'Submitted',
          }));

        setRecentApplications(recent);
      } catch (error) {
        setRecentApplications([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <>
      <div className="bg-[#0052cc] rounded-3xl p-8 text-white shadow-lg shadow-blue-500/20 mb-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome back to the Admin Panel!</h2>
          <p className="text-blue-100 max-w-xl">
            {loading
              ? 'Loading your recruitment pipeline data…'
              : `You have ${newApplications} candidate application${newApplications === 1 ? '' : 's'} to review today.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Candidates" value={loading ? '...' : totalCandidates.toString()} trend="+12%" icon={<FiUsers />} color="blue" />
        <StatCard title="New Applications" value={loading ? '...' : newApplications.toString()} trend="+4%" icon={<FiFileText />} color="indigo" />
        <StatCard title="Active Jobs" value={loading ? '...' : activeJobs.toString()} trend="0%" icon={<FiBriefcase />} color="cyan" />
        <StatCard title="System Uptime" value="99.9%" trend="Stable" icon={<FiSettings />} color="emerald" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Recent Applications</h3>
          <button className="text-sm font-medium text-[#0052cc] hover:underline">View All</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-8 py-4 font-semibold">Candidate Name</th>
                <th className="px-8 py-4 font-semibold">Applied Role</th>
                <th className="px-8 py-4 font-semibold">Date</th>
                <th className="px-8 py-4 font-semibold">Status</th>
                <th className="px-8 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-6 text-center text-slate-500">
                    Loading recent applications...
                  </td>
                </tr>
              ) : recentApplications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-6 text-center text-slate-500">
                    No applications found yet.
                  </td>
                </tr>
              ) : (
                recentApplications.map((application) => (
                  <TableRow key={application.id} {...application} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, trend, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}><span className="text-xl">{icon}</span></div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{trend}</span>
      </div>
      <div>
        <h4 className="text-slate-400 text-sm font-medium mb-1">{title}</h4>
        <h2 className="text-3xl font-black text-slate-800">{value}</h2>
      </div>
    </div>
  );
}

function TableRow({ name, role, date, status }) {
  const statusColors = {
    'Pending': 'bg-amber-50 text-amber-600',
    'Reviewed': 'bg-blue-50 text-blue-600',
    'Shortlisted': 'bg-emerald-50 text-emerald-600',
  };
  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-8 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">{name.charAt(0)}</div>
        <span className="font-bold text-slate-800 whitespace-nowrap">{name}</span>
      </td>
      <td className="px-8 py-5 text-sm font-medium text-slate-600 whitespace-nowrap">{role}</td>
      <td className="px-8 py-5 text-sm text-slate-500 whitespace-nowrap">{date}</td>
      <td className="px-8 py-5">
        <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusColors[status]}`}>{status}</span>
      </td>
      <td className="px-8 py-5 text-right">
        <button className="text-[#0052cc] font-medium text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Review</button>
      </td>
    </tr>
  );
}