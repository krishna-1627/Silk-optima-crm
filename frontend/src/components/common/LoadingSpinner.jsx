function LoadingSpinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-7 text-sm text-slate-600 shadow-sm">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default LoadingSpinner;
