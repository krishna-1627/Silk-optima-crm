import { FiBriefcase } from 'react-icons/fi';

function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-sm">
        <FiBriefcase className="h-5 w-5" />
      </div>
      {!compact && (
        <div>
          <p className="text-sm font-semibold text-slate-900">Silk Optima</p>
          <p className="text-xs text-slate-500">Recruitment Portal</p>
        </div>
      )}
    </div>
  );
}

export default Logo;
