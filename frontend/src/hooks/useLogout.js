import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/ToastProvider';
import { useAuth } from '../context/AuthContext';

export function useLogout() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { logout } = useAuth();

  return useCallback(() => {
    logout();
    window.localStorage.removeItem('silk-optima-token');
    window.localStorage.removeItem('silk-optima-user');
    window.sessionStorage.clear();
    navigate('/login', { replace: true });
    addToast('Logged out successfully.', 'success');
  }, [addToast, logout, navigate]);
}
