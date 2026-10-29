import { useEffect, useState } from 'react';
import { useToast } from '../components/common/ToastProvider';
import { fetchUpdateRequests, approveUpdateRequest, rejectUpdateRequest } from '../services/admin';
import ContentContainer from '../components/layout/ContentContainer';
import api from '../services/api';
import { resolveEmployeeDisplayId } from '../utils/employeeExport';

export default function AdminApplicationsPage() {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [data, { data: employees }] = await Promise.all([
        fetchUpdateRequests(),
        api.get('/employees'),
      ]);

      const employeeLookup = (Array.isArray(employees) ? employees : []).reduce((acc, employee) => {
        acc[String(employee?.id)] = resolveEmployeeDisplayId(employee);
        return acc;
      }, {});

      setRequests(
        (Array.isArray(data) ? data : []).map((request) => ({
          ...request,
          displayEmployeeId: employeeLookup[String(request.employee_id)] || resolveEmployeeDisplayId({ id: request.employee_id }),
        })),
      );
    } catch (error) {
      addToast(error?.response?.data?.detail || 'Unable to load update requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (requestId, action) => {
    setProcessing(requestId);
    try {
      if (action === 'approve') {
        await approveUpdateRequest(requestId);
        addToast('Update request approved.', 'success');
      } else {
        await rejectUpdateRequest(requestId);
        addToast('Update request rejected.', 'success');
      }
      await loadRequests();
    } catch (error) {
      addToast(error?.response?.data?.detail || 'Unable to update request.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[60vh]">
      <div className="px-8 py-6 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800">Pending Update Requests</h3>
        <p className="text-sm text-slate-500 mt-1">Review employee profile changes and approve or reject them.</p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-slate-500">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="text-slate-500">No pending update requests at the moment.</div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <ContentContainer key={request.request_id} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Request ID: {request.request_id}</p>
                    <p className="text-base font-semibold text-slate-900">Field: {request.field_name}</p>
                    <p className="text-sm text-slate-500">Employee ID: {request.displayEmployeeId}</p>
                    <p className="text-sm text-slate-500">Old value: {request.old_value || 'N/A'}</p>
                    <p className="text-sm text-slate-500">New value: {request.new_value || 'N/A'}</p>
                    <p className="text-xs text-slate-400">Requested: {new Date(request.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={processing === request.request_id}
                      onClick={() => handleAction(request.request_id, 'approve')}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={processing === request.request_id}
                      onClick={() => handleAction(request.request_id, 'reject')}
                      className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </ContentContainer>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}