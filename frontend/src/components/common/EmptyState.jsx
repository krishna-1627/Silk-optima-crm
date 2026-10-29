function EmptyState({ title, description, action, actionLabel, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      {Icon && <Icon className="mx-auto h-12 w-12 text-cyan-600" aria-hidden="true" />}
      <h2 className="mt-5 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm text-slate-600">{description}</p>
      {action && (
        <div className="mt-6">
          <button
            type="button"
            onClick={action}
            className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            {actionLabel || 'Take action'}
          </button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
