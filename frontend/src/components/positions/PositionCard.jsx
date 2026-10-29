function PositionCard({ position, onEdit, onClose, onView }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-cyan-600">{position.department}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{position.title}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${position.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
          {position.status}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600 line-clamp-3">{position.description}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
        <span>Experience: {position.experience}</span>
        <span>•</span>
        <span>Location: {position.location}</span>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
        Candidates Applied: <span className="font-semibold text-slate-900">{position.candidatesApplied}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => onView(position)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">View</button>
        <button onClick={() => onEdit(position)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100">Edit</button>
        <button onClick={() => onClose(position)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100">Close</button>
      </div>
    </div>
  );
}

export default PositionCard;
