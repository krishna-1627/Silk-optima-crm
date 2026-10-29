import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import ContentContainer from '../components/layout/ContentContainer';
import PageHeader from '../components/layout/PageHeader';
import PositionCard from '../components/positions/PositionCard';
import PositionModal from '../components/positions/PositionModal';
import api from '../services/api';
import { useToast } from '../components/common/ToastProvider';

function OpenPositionsPage() {
  const [positions, setPositions] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const loadPositions = async () => {
      try {
        const { data } = await api.get('/open-positions');
        setPositions(data.map((position) => ({ ...position, status: position.is_active ? 'Open' : 'Closed', candidatesApplied: 0 })));
      } catch (error) {
        addToast(error?.response?.data?.detail || 'Unable to load open positions', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadPositions();
  }, [addToast]);

  const filteredPositions = useMemo(() => {
    return positions.filter((position) => {
      const term = search.toLowerCase();
      return (
        position.title.toLowerCase().includes(term) ||
        position.department.toLowerCase().includes(term) ||
        position.location.toLowerCase().includes(term)
      );
    });
  }, [positions, search]);

  const openAddModal = () => {
    setSelectedPosition(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (position) => {
    setSelectedPosition(position);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openDetails = (position) => {
    setSelectedDetails(position);
  };

  const closePosition = async (position) => {
    try {
      const { data } = await api.put(`/open-positions/${position.id}`, { ...position, is_active: false });
      setPositions((prev) => prev.map((item) => (item.id === position.id ? { ...item, ...data, status: 'Closed' } : item)));
      addToast('Position closed', 'success');
    } catch (error) {
      addToast(error?.response?.data?.detail || 'Unable to close position', 'error');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPosition(null);
    setSelectedDetails(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (modalMode === 'edit' && selectedPosition) {
        const { data } = await api.put(`/open-positions/${selectedPosition.id}`, payload);
        setPositions((prev) => prev.map((item) => (item.id === selectedPosition.id ? { ...item, ...data, status: data.is_active ? 'Open' : 'Closed' } : item)));
      } else {
        const { data } = await api.post('/open-positions', payload);
        setPositions((prev) => [{ ...data, status: data.is_active ? 'Open' : 'Closed', candidatesApplied: 0 }, ...prev]);
      }
      addToast(modalMode === 'edit' ? 'Position updated' : 'Position created', 'success');
    } catch (error) {
      addToast(error?.response?.data?.detail || 'Unable to save position', 'error');
    } finally {
      closeModal();
    }
  };

  return (
    <div>
      <PageHeader title="Open Positions" subtitle="Review active hiring needs and status" />

      <ContentContainer>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search positions"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 outline-none focus:border-cyan-500"
            />
          </div>

          <button onClick={openAddModal} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700">
            <FiPlus className="h-4 w-4" />
            Create Position
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading positions…</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredPositions.map((position) => (<PositionCard key={position.id} position={position} onEdit={openEditModal} onClose={closePosition} onView={openDetails} />))}</div>}
      </ContentContainer>

      <PositionModal isOpen={isModalOpen} mode={modalMode} position={selectedPosition} onClose={closeModal} onSubmit={handleSubmit} />

      {selectedDetails && (
        <Modal
          isOpen={Boolean(selectedDetails)}
          title="Position Details"
          description="Detailed opening overview"
          onClose={closeModal}
          width="min(95vw, 760px)"
          scrollable
          footer={
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Close
            </button>
          }
        >
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Title</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedDetails.title}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Department</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedDetails.department}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Location</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedDetails.location}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Description</p>
              <p className="mt-1 text-sm text-slate-700">{selectedDetails.description}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default OpenPositionsPage;
