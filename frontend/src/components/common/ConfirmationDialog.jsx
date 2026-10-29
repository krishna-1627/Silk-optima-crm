import Modal from './Modal';

function ConfirmationDialog({ isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onClose, confirmLoading = false }) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      description={message}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={confirmLoading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={confirmLoading} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">
            {confirmLoading ? `${confirmLabel}...` : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-6 text-slate-600">{message}</p>
    </Modal>
  );
}

export default ConfirmationDialog;
