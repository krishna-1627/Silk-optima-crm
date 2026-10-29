import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { loginAdmin } from '../services/auth';
import { useToast } from '../components/common/ToastProvider';

function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await loginAdmin({
        email: data.email,
        password: data.password,
      });

      login({ accessToken: response.access_token, user: response.user });
      addToast('Admin signed in successfully', 'success');
      navigate('/admin/employees');
    } catch (error) {
      addToast(error?.response?.data?.detail || 'Invalid admin credentials', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
  <div className="w-full max-w-md border border-slate-800 bg-slate-900/90 p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/30">
    
    <div className="mb-6 sm:mb-8 flex items-center gap-3 text-cyan-400">
      <FiShield className="text-xl sm:text-2xl shrink-0" />
      <div>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">Restricted Access</p>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Portal</h1>
      </div>
    </div>

    <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-300">Email Address</label>
        <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 sm:px-4 sm:py-3 focus-within:border-cyan-500 transition-colors">
          <FiMail className="mr-2.5 sm:mr-3 text-slate-400 shrink-0 text-base sm:text-lg" />
          <input
            type="email"
            className="w-full bg-transparent text-sm sm:text-base text-white outline-none placeholder:text-slate-500"
            placeholder="admin@silkoptima.com"
            {...register('email', { required: 'Email is required' })}
          />
        </div>
        {errors.email && <p className="mt-1.5 text-xs sm:text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-300">Password</label>
        <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 sm:px-4 sm:py-3 focus-within:border-cyan-500 transition-colors">
          <FiLock className="mr-2.5 sm:mr-3 text-slate-400 shrink-0 text-base sm:text-lg" />
          <input
            type="password"
            className="w-full bg-transparent text-sm sm:text-base text-white outline-none placeholder:text-slate-500"
            placeholder="••••••••"
            {...register('password', { required: 'Password is required' })}
          />
        </div>
        {errors.password && <p className="mt-1.5 text-xs sm:text-sm text-red-400">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-cyan-500 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70 mt-2"
      >
        {isSubmitting ? 'Signing in...' : 'Access Admin Portal'}
      </button>
    </form>

  </div>
</div>
  );
}

export default AdminLoginPage;
