import api from './api';

export async function searchCandidatesForInterview(query) {
  const { data } = await api.get(`/api/admin/interviews/candidates-search?q=${encodeURIComponent(query)}`);
  return data;
}

export async function scheduleAIInterview(payload) {
  const { data } = await api.post('/api/admin/interviews/schedule', payload);
  return data;
}

export async function fetchAllInterviews() {
  const { data } = await api.get('/api/admin/interviews');
  return data;
}

export async function cancelInterview(interviewId) {
  const { data } = await api.patch(`/api/admin/interviews/${interviewId}/cancel`);
  return data;
}

export async function deleteInterview(interviewId) {
  const { data } = await api.delete(`/api/admin/interviews/${interviewId}`);
  return data;
}

