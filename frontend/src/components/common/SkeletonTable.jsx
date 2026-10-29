function SkeletonTable({ rows = 4, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {Array.from({ length: cols }).map((_, index) => (
            <div key={index} className="h-4 rounded-full bg-slate-200" />
          ))}
        </div>
        {Array.from({ length: rows }).map((row) => (
          <div key={row} className="grid grid-cols-5 gap-4">
            {Array.from({ length: cols }).map((_, index) => (
              <div key={index} className="h-6 rounded-full bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkeletonTable;
