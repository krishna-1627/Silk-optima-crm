import { NavLink } from 'react-router-dom';

function MenuItem({ to, icon: Icon, label, onClick, compact }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={compact ? label : undefined}
      className={({ isActive }) =>
        `group relative flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
          compact ? 'justify-center' : 'gap-3'
        } ${
          isActive
            ? 'bg-cyan-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!compact && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default MenuItem;
