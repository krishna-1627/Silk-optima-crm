import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import ProfileDropdown from "./ProfileDropdown";

const EMPLOYEE_NOTIFICATION_READ_KEY = "silk-optima-employee-notifications-read";

const getReadNotificationIds = () => {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = JSON.parse(window.localStorage.getItem(EMPLOYEE_NOTIFICATION_READ_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set();
  }
};

const setReadNotificationIds = (ids) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMPLOYEE_NOTIFICATION_READ_KEY, JSON.stringify([...ids]));
};

export default function Navbar({ title }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/employees/me/notifications");
        const notificationList = Array.isArray(data) ? data : [];
        const readIds = getReadNotificationIds();
        const unreadNotifications = notificationList.filter(
          (notification) => !readIds.has(String(notification.id)),
        );
        setNotifications(notificationList);
        setPendingCount(unreadNotifications.length);
      } catch (error) {
        setNotifications([]);
        setPendingCount(0);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return undefined;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  const markNotificationsRead = (ids = []) => {
    if (!ids.length) return;
    const readIds = getReadNotificationIds();
    ids.forEach((id) => readIds.add(String(id)));
    setReadNotificationIds(readIds);
    setPendingCount(0);
  };

  const openNotifications = () => {
    const unreadIds = notifications
      .filter((notification) => !getReadNotificationIds().has(String(notification.id)))
      .map((notification) => notification.id);
    if (unreadIds.length) {
      markNotificationsRead(unreadIds);
    }
    setIsNotificationsOpen((value) => !value);
  };

  return (
    <header className="relative z-10 flex w-full max-w-full items-center justify-between gap-3 bg-white px-3 py-4 shadow-sm sm:px-4 md:px-6">
      <h1 className="min-w-0 flex-1 truncate text-base font-bold text-slate-800 sm:text-lg md:text-xl">{title || "Portal"}</h1>

      <div className="relative flex shrink-0 items-center gap-2 sm:gap-4">
        <div ref={panelRef} className="relative">
          <button
            onClick={openNotifications}
            className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                {pendingCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 z-40 mt-3 w-[min(22rem,90vw)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="border-b border-slate-200 pb-3">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
              </div>
              <div className="mt-3 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No notifications.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{notification.description}</p>
                      {notification.reason && (
                        <p className="mt-2 text-sm text-slate-700">Reason: {notification.reason}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <ProfileDropdown />
      </div>
    </header>
  );
}
