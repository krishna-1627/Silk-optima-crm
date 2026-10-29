import { useEffect, useState } from 'react';
import Modal from '../common/Modal';

function EmployeeModal({ isOpen, mode, employee, onClose, onSubmit }) {
  const [status, setStatus] = useState(employee?.status || 'Active');
  const [lastWorkingDate, setLastWorkingDate] = useState('');

  useEffect(() => {
    const employeeStatus = employee?.status || 'Active';
    const employeeLastWorkingDate = employee?.lastWorkingDate || employee?.last_working_date || '';
    setStatus(employeeStatus);
    setLastWorkingDate(employeeStatus === 'Active' ? '' : employeeLastWorkingDate);
  }, [employee]);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget.closest('form');
    if (!formElement) return;
    const formData = new FormData(formElement);
    const payload = Object.fromEntries(formData.entries());
    onSubmit(payload);
  };

  const handleStatusChange = (event) => {
    const nextStatus = event.target.value;
    setStatus(nextStatus);
    if (nextStatus === 'Active') {
      setLastWorkingDate('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={mode === 'edit' ? 'Edit Employee' : 'Add Employee'}
      description={mode === 'edit' ? 'Update employee details' : 'Create a new employee profile'}
      onClose={onClose}
      width="min(95vw, 740px)"
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
            type="submit"
            form="employee-edit-form"
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
          >
            Save Changes
          </button>
        </div>
      }
    >
      <form id="employee-edit-form" className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Employee ID</label>
          <input
            name="employeeId"
            defaultValue={employee?.employeeId || ''}
            disabled
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={employee?.email || ''}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
          <input
            name="phone"
            defaultValue={employee?.phone || ''}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Designation / Role</label>
          <input
            name="designation"
            defaultValue={employee?.designation || ''}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Last Working Date</label>
          <input
            name="lastWorkingDate"
            type="date"
            value={lastWorkingDate}
            onChange={(event) => setLastWorkingDate(event.target.value)}
            placeholder="dd-mm-yyyy"
            disabled={status === 'Active'}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
          <select
            name="status"
            value={status}
            onChange={handleStatusChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-cyan-500"
          >
            <option value="Active">Active</option>
            <option value="On Notice">On Notice</option>
            <option value="Resigned">Resigned</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

export default EmployeeModal;
