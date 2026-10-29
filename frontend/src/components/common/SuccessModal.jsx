import Modal from './Modal';
import { FiCheckCircle } from 'react-icons/fi';

function SuccessModal({
  isOpen,
  title = '🎉 Application Submitted Successfully',
  applicationId = '',
  details = [],
  onClose,
  primaryLabel = 'Go to Dashboard',
  onPrimary,
  secondaryLabel = 'View Application',
  onSecondary,
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      description="Thank you for applying to Silk Optima."
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onPrimary || onClose}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
          >
            {primaryLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
        <FiCheckCircle className="h-10 w-10 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Your application has been received successfully.</p>
          <p className="mt-1 text-sm text-slate-600">Our hiring team will review your details and get back to you.</p>
        </div>
      </div>

      {applicationId && (
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-cyan-800">Application ID</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-cyan-900">{applicationId}</p>
        </div>
      )}

      {details.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{detail.label}</p>
              <p className="mt-1 font-semibold text-slate-900">{detail.value}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default SuccessModal;
