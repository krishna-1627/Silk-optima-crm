function ContentContainer({ children, className = '' }) {
  return (
    <div className={`w-full max-w-full min-w-0 overflow-x-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md sm:p-6 ${className}`.trim()}>
      {children}
    </div>
  );
}

export default ContentContainer;
