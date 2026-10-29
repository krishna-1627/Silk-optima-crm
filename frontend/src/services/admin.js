import api from './api';

export async function fetchUpdateRequests() {
    const { data } = await api.get('/admin/update-requests');
    return data;
}

export async function approveUpdateRequest(requestId) {
    const { data } = await api.post(`/admin/update-requests/${requestId}/approve`);
    return data;
}

export async function rejectUpdateRequest(requestId) {
    const { data } = await api.post(`/admin/update-requests/${requestId}/reject`);
    return data;
}