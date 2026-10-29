import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiEye, FiFilter, FiSearch } from 'react-icons/fi';
import ContentContainer from '../components/layout/ContentContainer';
import Modal from '../components/common/Modal';
import PageHeader from '../components/layout/PageHeader';
import CandidateTable from '../components/candidates/CandidateTable';
import api from '../services/api';
import { useToast } from '../components/common/ToastProvider';

function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const { data } = await api.get('/candidates');
        setCandidates(data.map((candidate) => ({
          ...candidate,
          name: candidate.user?.full_name || (candidate.user_id ? `Candidate ${candidate.id}` : 'Candidate'),
          email: candidate.user?.email || 'N/A',
          phone: candidate.phone || candidate.user?.phone || 'N/A',
          appliedPosition: candidate.user?.role || 'Candidate',
          college: candidate.user?.college || candidate.user?.university || 'N/A',
          skills: candidate.user?.skills || candidate.experience_summary || 'N/A',
          experience: candidate.experience_summary || 'N/A',
          passoutYear: candidate.user?.graduation_year || 'N/A',
          notes: candidate.experience_summary || 'No notes yet',
        })));
      } catch (error) {
        addToast(error?.response?.data?.detail || 'Unable to load candidates', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, [addToast]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = [candidate.name, candidate.email, candidate.appliedPosition, candidate.college]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || candidate.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/candidates/${id}`, { status });
      setCandidates((prev) => prev.map((candidate) => (candidate.id === id ? { ...candidate, ...data, status: data.status } : candidate)));
      addToast('Candidate status updated', 'success');
    } catch (error) {
      addToast(error?.response?.data?.detail || 'Unable to update candidate status', 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Candidates" subtitle="Track applicants and hiring pipeline" />

      <ContentContainer>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-md">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search candidates"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 outline-none focus:border-cyan-500"
              />
            </div>
            <div className="relative w-full md:max-w-xs">
              <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 outline-none focus:border-cyan-500"
              >
                <option value="All">All Status</option>
                <option value="Applied">Applied</option>
                <option value="Resume Reviewed">Resume Reviewed</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
                <option value="Joined">Joined</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading candidates…</p> : <CandidateTable candidates={filteredCandidates} onView={setSelectedCandidate} onStatusChange={updateStatus} />}
      </ContentContainer>

      {selectedCandidate && (
        <Modal
          isOpen={Boolean(selectedCandidate)}
          title="Candidate Details"
          description="Detailed profile and application overview"
          onClose={() => setSelectedCandidate(null)}
          width="min(95vw, 760px)"
          scrollable
          footer={
            <button
              type="button"
              onClick={() => setSelectedCandidate(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Close
            </button>
          }
        >
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Name</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.phone}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">College</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.college}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Skills</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.skills}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Experience</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.experience}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Passout Year</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.passoutYear}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Applied Position</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedCandidate.appliedPosition}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin Notes</p>
            <p className="mt-2 text-sm text-slate-700">{selectedCandidate.notes}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              <FiEye className="h-4 w-4" />
              Resume Preview
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700">
              <FiDownload className="h-4 w-4" />
              Download Resume
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CandidatesPage;
