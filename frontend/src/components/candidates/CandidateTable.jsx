function CandidateTable({ candidates, onView, onStatusChange }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Applied Position</th>
            <th className="px-4 py-3 font-medium">Experience</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="border-t border-slate-200">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-slate-800">{candidate.name}</p>
                  <p className="text-xs text-slate-500">{candidate.email}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{candidate.appliedPosition}</td>
              <td className="px-4 py-3 text-slate-600">{candidate.experience}</td>
              <td className="px-4 py-3">
                <select
                  value={candidate.status}
                  onChange={(event) => onStatusChange(candidate.id, event.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="Applied">Applied</option>
                  <option value="Resume Reviewed">Resume Reviewed</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Joined">Joined</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onView(candidate)} className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CandidateTable;
