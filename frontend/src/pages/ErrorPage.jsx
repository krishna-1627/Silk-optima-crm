import { Link } from 'react-router-dom';

function ErrorPage({ message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-600">
            ⚠️
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">{message || 'An unexpected error occurred. Please try again.'}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700">
            Return to Home
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}

export default ErrorPage;
