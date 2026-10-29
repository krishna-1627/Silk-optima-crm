import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiInbox, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../common/ToastProvider';
import api from '../../services/api';
import { resolveEmployeeDisplayId } from '../../utils/employeeExport';

const formatFieldLabel = (value) =>
  String(value ?? 'Pending update')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getNotificationTitle = (request) => {
  if (request.request_type === 'profile_verification') {
    return 'Authentication Required';
  }

  if (request.request_type === 'profile_update') {
    return 'Profile Update Authentication';
  }

  if (request.request_type === 'document_upload') {
    return 'Document Upload Request';
  }

  return 'Employee Review Request';
};

const getNotificationDescription = (request) => {
  if (request.request_type === 'profile_verification') {
    return `${request.employee_name} submitted a profile for verification.`;
  }

  if (request.request_type === 'profile_update') {
    return `${request.employee_name} updated the profile.`;
  }

  if (request.request_type === 'document_upload') {
    return `${request.employee_name} uploaded documents for review.`;
  }

  return `${request.employee_name || 'Employee'} submitted a request for review.`;
};

const getReviewFields = (request) => {
  if (request.request_type === 'profile_verification') {
    return [{
      fieldName: 'Profile submission',
      oldValue: 'Submitted profile data',
      newValue: 'Awaiting administrator review',
    }];
  }

  return [{
    fieldName: request.fieldName ?? request.field_name,
    oldValue: formatValue(request.oldValue ?? request.old_value),
    newValue: formatValue(request.newValue ?? request.new_value),
  }];
};

const formatValue = (value) => {
  if (value === null || value === undefined) return 'Not provided';
  return String(value);
};

const formatTimestamp = (value) => {
  if (!value) return 'Just now';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const parseDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getActionUrl = (notification) => {
  return `/admin/employees/${notification.employeeId}/profile?requestId=${encodeURIComponent(notification.id)}`;
};

function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const { data: notifications } = await api.get('/admin/notifications');
      setNotifications(
        (Array.isArray(notifications) ? notifications : []).map((notification) => ({
          ...notification,
          title: notification.title,
          employeeName: notification.employee_name,
          employeeEmail: notification.employee_email,
          eventType: notification.event_type,
          actionUrl: notification.action_url,
          createdAt: notification.created_at,
        })),
      );
    } catch (error) {
      setNotifications([]);
      addToast(error?.response?.data?.detail || 'Unable to load notifications', 'error');
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(() => {
      loadNotifications();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [addToast]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      loadNotifications();
    };

    const handleStorage = (event) => {
      if (event.key === 'silk-optima-employee-profile-sync') {
        handleProfileUpdate();
      }
    };

    window.addEventListener('employee-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('employee-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [addToast]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const pendingRequestCount = notifications.filter((notification) => !notification.isRead).length;

  const groupedNotifications = useMemo(() => notifications, [notifications]);

  const dismissNotification = (id) => setNotifications((prev) => prev.filter((item) => item.id !== id));
  const clearAll = () => setNotifications([]);

  const openReviewRoute = (notification) => {
    setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    setOpen(false);
    navigate(notification.actionUrl);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Open notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <FiBell className="h-5 w-5" />
        {pendingRequestCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1.5 text-[10px] font-semibold text-white">
            {pendingRequestCount}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="absolute right-0 z-40 mt-3 w-[min(24rem,90vw)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:right-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Employee Verification Requests</p>
              <p className="text-xs text-slate-500">Pending verification and profile review requests</p>
            </div>
            <button type="button" onClick={clearAll} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Clear notifications">
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 max-h-[24rem] space-y-4 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                <FiInbox className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-3">No pending profile review requests.</p>
              </div>
            ) : (
              groupedNotifications.map((notification) => (
                <div key={notification.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-200 hover:bg-cyan-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{notification.employee_name}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.description}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatTimestamp(notification.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openReviewRoute(notification)}
                      className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default NotificationCenter;
