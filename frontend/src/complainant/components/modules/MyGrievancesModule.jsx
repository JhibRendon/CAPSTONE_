import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../services/authService';

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-100 text-amber-800',
    under_review: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    escalated: 'bg-purple-100 text-purple-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

const priorityBadge = (priority) => {
  const map = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-cyan-100 text-cyan-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return map[priority] || 'bg-gray-100 text-gray-800';
};

const fmtStatus = (value) => String(value || '').replaceAll('_', ' ');
const fmtDate = (value) => (value ? new Date(value).toLocaleString() : '--');

const MyGrievancesModule = () => {
  const [stats, setStats] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedGrievance = grievances.find((item) => item._id === selectedId) || grievances[0] || null;

  const loadStats = async () => {
    const response = await axiosInstance.get('/grievances/mine/stats');
    if (response.data?.success) {
      setStats(response.data.data);
    }
  };

  const loadGrievances = async (nextFilters = filters) => {
    const query = new URLSearchParams({
      page: String(nextFilters.page || 1),
      limit: String(nextFilters.limit || 10),
      search: nextFilters.search || '',
      status: nextFilters.status || '',
    });

    const response = await axiosInstance.get(`/grievances/mine?${query.toString()}`);
    if (response.data?.success) {
      const items = response.data.data || [];
      setGrievances(items);
      setPagination(response.data.pagination || pagination);

      if (!selectedId && items[0]) {
        setSelectedId(items[0]._id);
      } else if (selectedId && !items.find((item) => item._id === selectedId)) {
        setSelectedId(items[0]?._id || '');
      }
    }
  };

  const reloadAll = async (nextFilters = filters) => {
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadGrievances(nextFilters)]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your grievances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    loadGrievances(next).catch((err) => {
      setError(err.response?.data?.message || 'Failed to filter grievances');
    });
  };

  const handlePageChange = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    loadGrievances(next).catch((err) => {
      setError(err.response?.data?.message || 'Failed to load page');
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">My Grievances</h2>
          <p className="text-sm text-gray-600 mt-1">Track the status of your submitted grievances and review case details.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Total', stats.total],
              ['Pending', stats.pending],
              ['In Progress', stats.inProgress],
              ['Resolved', stats.resolved],
              ['Rejected', stats.rejected],
            ].map(([label, value]) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 space-y-3">
              <input
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search reference or subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Status</option>
                {['pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'escalated'].map((status) => (
                  <option key={status} value={status}>{fmtStatus(status)}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-200">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading grievances...</div>
              ) : grievances.length === 0 ? (
                <div className="p-6 text-center text-gray-500">You have not submitted any grievances yet.</div>
              ) : (
                grievances.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setSelectedId(item._id)}
                    className={`w-full text-left p-4 transition-colors ${selectedId === item._id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.referenceNumber}</p>
                        <p className="text-sm text-gray-700">{item.subject}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(item.status)}`}>
                        {fmtStatus(item.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-xs text-gray-500">{fmtDate(item.createdAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
                className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
            {!selectedGrievance ? (
              <div className="h-full flex items-center justify-center text-gray-500">Select a grievance to view its details.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedGrievance.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedGrievance.referenceNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${priorityBadge(selectedGrievance.priority)}`}>
                      {selectedGrievance.priority}
                    </span>
                    <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${statusBadge(selectedGrievance.status)}`}>
                      {fmtStatus(selectedGrievance.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-500 mb-1">Routing</p>
                    <p className="font-medium text-gray-900">Category: {selectedGrievance.category || 'general'}</p>
                    <p className="text-gray-600">Office: {selectedGrievance.office || '--'}</p>
                    <p className="text-gray-600">Incident date: {selectedGrievance.incidentDate || '--'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-500 mb-1">Assignment</p>
                    <p className="font-medium text-gray-900">{selectedGrievance.assignedTo?.name || 'Not assigned yet'}</p>
                    <p className="text-gray-600">{selectedGrievance.assignedTo?.office || '--'}</p>
                    <p className="text-gray-600">Submitted: {fmtDate(selectedGrievance.createdAt)}</p>
                  </div>
                </div>

                {selectedGrievance.aiAnalysis && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <p className="font-semibold text-blue-900 mb-2">AI Analysis</p>
                    {selectedGrievance.aiAnalysis.summary && (
                      <div className="mb-3 rounded-lg border border-blue-100 bg-white/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Summary</p>
                        <p className="text-blue-900 whitespace-pre-wrap break-words">{selectedGrievance.aiAnalysis.summary}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <p className="text-blue-800">Category: {selectedGrievance.aiAnalysis.category?.label || '--'}</p>
                      <p className="text-blue-800">Urgency: {selectedGrievance.aiAnalysis.urgency?.label || '--'}</p>
                      <p className="text-blue-800">Sentiment: {selectedGrievance.aiAnalysis.sentiment?.label || '--'}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-line">
                    {selectedGrievance.description}
                  </div>
                </div>

                {selectedGrievance.resolutionNotes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Resolution Notes</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-gray-800 whitespace-pre-line">
                      {selectedGrievance.resolutionNotes}
                    </div>
                  </div>
                )}

                {selectedGrievance.attachments?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Attachments</p>
                    <div className="space-y-2">
                      {selectedGrievance.attachments.map((attachment, index) => (
                        <a
                          key={`${attachment.url}-${index}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-blue-700 hover:text-blue-900 underline"
                        >
                          {attachment.fileName || attachment.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyGrievancesModule;
