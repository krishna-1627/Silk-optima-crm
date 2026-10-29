import Modal from '../common/Modal';

function PositionModal({ isOpen, mode, position, onClose, onSubmit }) {
  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      title={mode === 'edit' ? 'Edit Position' : 'Create Position'}
      description={mode === 'edit' ? 'Update the current opening' : 'Create a new opening for hiring'}
      onClose={onClose}
      width="min(95vw, 680px)"
      scrollable
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(event) => handleSubmit(event)}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
          >
            Save
          </button>
        </div>
      }
    >
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
          <input name="title" defaultValue={position?.title || ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
            <input name="department" defaultValue={position?.department || ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Experience</label>
            <input name="experience" defaultValue={position?.experience || ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500" />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
          <input name="location" defaultValue={position?.location || ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
          <textarea name="description" defaultValue={position?.description || ''} rows="4" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
          <select name="status" defaultValue={position?.status || 'Open'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500">
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

export default PositionModal;
