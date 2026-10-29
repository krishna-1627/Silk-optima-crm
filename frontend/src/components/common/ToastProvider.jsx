import { createContext, useContext, useMemo, useState } from 'react';
import Toast from './Toast';

const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value = useMemo(() => ({ addToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed left-4 right-4 top-4 z-[100] flex w-auto max-w-[min(92vw,24rem)] flex-col gap-2 sm:left-auto sm:right-4 sm:w-[min(92vw,24rem)]">
        {toasts.map((toast) => (
          <button key={toast.id} type="button" onClick={() => removeToast(toast.id)}>
            <Toast message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
