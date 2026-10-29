const statusClasses = {
  default: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  open: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-slate-100 text-slate-700',
  shortlisted: 'bg-cyan-100 text-cyan-700',
  interviewing: 'bg-amber-100 text-amber-700',
  selected: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  onnotice: 'bg-amber-100 text-amber-700',
};

function StatusPill({ children, tone = 'default' }) {
  const normalized = String(tone).toLowerCase().replace(/\s+/g, '');
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[normalized] || statusClasses.default}`}>
      {children}
    </span>
  );
}

export default StatusPill;
