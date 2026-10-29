const EMPLOYEE_PROFILE_SYNC_KEY = 'silk-optima-employee-profile-sync';

export function notifyEmployeeProfileUpdated() {
  if (typeof window === 'undefined') return;

  const payload = { updatedAt: Date.now() };
  window.localStorage.setItem(EMPLOYEE_PROFILE_SYNC_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('employee-profile-updated', { detail: payload }));
}

export function subscribeToEmployeeProfileUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleEvent = (event) => {
    const detail = event?.detail || JSON.parse(window.localStorage.getItem(EMPLOYEE_PROFILE_SYNC_KEY) || 'null');
    if (detail) callback(detail);
  };

  const handleStorage = (event) => {
    if (event.key === EMPLOYEE_PROFILE_SYNC_KEY) {
      handleEvent(event);
    }
  };

  window.addEventListener('employee-profile-updated', handleEvent);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('employee-profile-updated', handleEvent);
    window.removeEventListener('storage', handleStorage);
  };
}
