import { useEffect } from 'react';
import { FiCheckCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';

function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  const iconMap = {
    success: <FiCheckCircle className="h-5 w-5 text-emerald-600" />,
    error: <FiAlertTriangle className="h-5 w-5 text-rose-600" />,
    info: <FiInfo className="h-5 w-5 text-cyan-600" />,
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {iconMap[type]}
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}

export default Toast;
