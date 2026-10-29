import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/ProtectedRoute';
import CandidateLayout from '../layouts/CandidateLayout';

// Admin Imports
import AdminLayout from '../layouts/AdminLayout';
import AdminEmployeesPage from '../pages/AdminEmployeesPage';
import AdminLoginPage from '../pages/AdminLoginPage';
import AdminScheduledMeetingsPage from '../pages/AdminScheduledMeetingsPage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/portal-admin-access" element={<AdminLoginPage />} />

      {/* Admin Routes (Wrapped in AdminLayout) */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/portal-admin-access" />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/employees" replace />} />
          <Route path="employees" element={<AdminEmployeesPage />} />
          <Route path="employees/:employeeId/profile" element={<ProfilePage />} />
          <Route path="scheduled-meetings" element={<AdminScheduledMeetingsPage />} />
        </Route>
      </Route>


      {/* Candidate / User Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<CandidateLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
      <Route path="/candidate/dashboard" element={<Navigate to="/profile" replace />} />
      <Route path="/candidate/application" element={<Navigate to="/profile" replace />} />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;