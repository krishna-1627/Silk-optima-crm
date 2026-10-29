import { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiChevronDown, FiEye, FiEyeOff, FiLock, FiLogOut, FiTrash2, FiUser } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { useToast } from '../common/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import api from '../../services/api';

function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [changePhoneModalOpen, setChangePhoneModalOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changePhoneState, setChangePhoneState] = useState({ newPhone: '', otp: '' });
  const [errors, setErrors] = useState({});
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { user, logout, updateUser } = useAuth();
  const logoutHook = useLogout();

  const profilePhotoUrl = useMemo(() => {
    if (!user?.profile_photo) return null;
    if (/^https?:\/\//i.test(user.profile_photo)) return user.profile_photo;
    return `${api.defaults.baseURL}${user.profile_photo.startsWith('/') ? '' : '/'}${user.profile_photo}`;
  }, [user?.profile_photo]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setPasswordModalOpen(false);
        setLogoutDialogOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const validatePassword = () => {
    const nextErrors = {};
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!passwords.currentPassword) nextErrors.currentPassword = 'Current password is required';
    if (!passwords.newPassword) nextErrors.newPassword = 'New password is required';
    if (passwords.newPassword.length < 8) nextErrors.newPassword = 'Use at least 8 characters';
    if (!/[A-Z]/.test(passwords.newPassword)) nextErrors.newPassword = 'Include an uppercase letter';
    if (!/[a-z]/.test(passwords.newPassword)) nextErrors.newPassword = 'Include a lowercase letter';
    if (!/\d/.test(passwords.newPassword)) nextErrors.newPassword = 'Include a number';
    if (!/[^A-Za-z\d]/.test(passwords.newPassword)) nextErrors.newPassword = 'Include a special character';
    if (passwords.newPassword !== passwords.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    if (!passwordPolicy.test(passwords.newPassword)) nextErrors.newPassword = 'Password must meet the policy';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const passwordStrength = () => {
    const { newPassword } = passwords;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  };

  const currentPasswordRef = useRef(null);

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    if (!validatePassword()) return;
    setIsUpdatingPassword(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsUpdatingPassword(false);
    setPasswordModalOpen(false);
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    addToast('Password updated successfully.', 'success');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLogoutDialogOpen(false);
    setIsLoggingOut(false);
    logoutHook();
  };

  const validatePhoneNumber = (value) => {
    const normalized = value.replace(/\D/g, '');
    return /^\d{10}$/.test(normalized);
  };

  const handleSendPhoneOtp = async () => {
    const newPhone = changePhoneState.newPhone.trim();
    if (!validatePhoneNumber(newPhone)) {
      setPhoneError('Please enter a valid 10-digit phone number.');
      return;
    }
    setPhoneError('');
    setOtpError('');
    setIsSendingPhoneOtp(true);

    try {
      await api.post('/phone/send-otp', { phone: newPhone });
      addToast('OTP sent to the provided phone number.', 'success');
    } catch (error) {
      setPhoneError(error?.response?.data?.detail || 'Unable to send OTP. Please try again.');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleUpdatePhone = async () => {
    const newPhone = changePhoneState.newPhone.trim();
    const otp = changePhoneState.otp.trim();
    if (!validatePhoneNumber(newPhone)) {
      setPhoneError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!otp) {
      setOtpError('OTP is required.');
      return;
    }

    setPhoneError('');
    setOtpError('');
    setIsUpdatingPhone(true);

    try {
      await api.post('/phone/update', { phone: newPhone, otp });
      const refreshed = await api.get('/me');
      updateUser(refreshed.data);
      setChangePhoneModalOpen(false);
      setChangePhoneState({ newPhone: '', otp: '' });
      addToast('Phone number updated successfully.', 'success');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail && detail.toLowerCase().includes('otp')) {
        setOtpError(detail);
      } else if (detail && detail.toLowerCase().includes('phone')) {
        setPhoneError(detail);
      } else {
        setOtpError('Unable to verify OTP and update phone number.');
      }
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      await api.delete('/me');
      setDeleteAccountModalOpen(false);
      logout();
      navigate('/login', { replace: true });
      addToast('Your account has been deleted successfully.', 'success');
    } catch (error) {
      const detail = error?.response?.data?.detail || 'Unable to delete your account right now.';
      addToast(detail, 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const isReadOnlyProfileView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('view') === 'employee' && Boolean(params.get('employeeId'));
  }, [location.search]);

  const initials = useMemo(() => {
    const name = user?.full_name || 'Admin User';
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm transition-all duration-300 hover:border-cyan-300 min-w-0"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-3xl bg-cyan-600 text-[11px] font-semibold text-white flex-shrink-0">
          {user?.profile_photo ? <img src={`http://127.0.0.1:8000${user.profile_photo}`} alt="profile" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="hidden min-w-0 text-left sm:block max-w-[12rem]">
          <p className="truncate text-sm font-medium text-slate-700">{user?.full_name || 'Admin User'}</p>
          <p className="truncate text-xs text-slate-500">{user?.role || 'Administrator'}</p>
        </div>
        <FiChevronDown className={`mr-1 h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(16rem,90vw)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
          {!isReadOnlyProfileView && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setChangePhoneModalOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              role="menuitem"
            >
              <span className="text-cyan-600">📱</span>
              Change Phone Number
            </button>
          )}
          {!isReadOnlyProfileView && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPasswordModalOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              role="menuitem"
            >
              <FiLock className="h-4 w-4" />
              Change Password
            </button>
          )}
          {!isReadOnlyProfileView && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDeleteAccountModalOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              role="menuitem"
            >
              <FiTrash2 className="h-4 w-4 text-red-500" />
              Delete Account
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setLogoutDialogOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
            role="menuitem"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}

      <Modal
        isOpen={changePhoneModalOpen}
        title="Change Phone Number"
        description="Update your phone number after OTP verification."
        onClose={() => setChangePhoneModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setChangePhoneModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdatePhone}
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              {isUpdatingPhone ? 'Verifying...' : 'Verify & Update'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Current Phone Number</label>
            <input
              type="text"
              value={user?.phone || ''}
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New Phone Number</label>
            <input
              type="text"
              value={changePhoneState.newPhone}
              onChange={(event) => setChangePhoneState((prev) => ({ ...prev, newPhone: event.target.value }))}
              placeholder="Enter 10-digit phone number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500"
            />
            {phoneError && <p className="mt-2 text-sm text-red-600">{phoneError}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-[60%]">
              <label className="mb-2 block text-sm font-medium text-slate-700">OTP</label>
              <input
                type="text"
                value={changePhoneState.otp}
                onChange={(event) => setChangePhoneState((prev) => ({ ...prev, otp: event.target.value }))}
                placeholder="Enter OTP"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              {otpError && <p className="mt-2 text-sm text-red-600">{otpError}</p>}
            </div>
            <button
              type="button"
              onClick={handleSendPhoneOtp}
              disabled={isSendingPhoneOtp}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSendingPhoneOtp ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={passwordModalOpen}
        title="Change Password"
        description="Update your password to keep your account secure."
        onClose={() => setPasswordModalOpen(false)}
        initialFocusRef={currentPasswordRef}
        footer={
          <>
            <button type="button" onClick={() => setPasswordModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Cancel
            </button>
            <button type="button" onClick={handlePasswordUpdate} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700">
              Update Password
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handlePasswordUpdate}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Current Password</label>
            <div className="relative">
              <input
                ref={currentPasswordRef}
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-11 outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && <p className="mt-2 text-sm text-red-600">{errors.currentPassword}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwords.newPassword}
                onChange={(event) => setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-11 outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Password strength</span>
                <span>{['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][Math.max(0, Math.min(passwordStrength() - 1, 4))]}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${passwordStrength() <= 1 ? 'bg-red-500' : passwordStrength() === 2 ? 'bg-amber-400' : passwordStrength() === 3 ? 'bg-yellow-400' : passwordStrength() === 4 ? 'bg-cyan-500' : 'bg-emerald-500'}`} style={{ width: `${(passwordStrength() / 5) * 100}%` }} />
              </div>
            </div>
            {errors.newPassword && <p className="mt-2 text-sm text-red-600">{errors.newPassword}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwords.confirmPassword}
                onChange={(event) => setPasswords((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-11 outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>
        </form>
      </Modal>


      <Modal
        isOpen={deleteAccountModalOpen}
        title="Delete Account"
        description="Are you sure you want to permanently delete your account?"
        onClose={() => setDeleteAccountModalOpen(false)}
        width="min(95vw, 440px)"
        icon={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <FiAlertTriangle className="h-6 w-6" />
          </div>
        }
        footer={
          <>
            <button type="button" onClick={() => setDeleteAccountModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={isDeletingAccount}>
              Cancel
            </button>
            <button type="button" onClick={handleDeleteAccount} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isDeletingAccount}>
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-slate-600">This action cannot be undone.</p>
      </Modal>

      <Modal
        isOpen={logoutDialogOpen}
        title="Logout?"
        description="Are you sure you want to logout from your account?"
        onClose={() => setLogoutDialogOpen(false)}
        width="min(95vw, 520px)"
        footer={
          <>
            <button type="button" onClick={() => setLogoutDialogOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoggingOut}>
              Cancel
            </button>
            <button type="button" onClick={handleLogout} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </>
        }
      />
    </div>
  );
}

export default ProfileDropdown;
