import { FiBell } from 'react-icons/fi';

function NotificationButton() {
  return (
    <button className="relative rounded-full border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
      <FiBell className="h-5 w-5" />
      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-cyan-500" />
    </button>
  );
}

export default NotificationButton;
