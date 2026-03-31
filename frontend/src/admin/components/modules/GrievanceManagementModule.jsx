import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import authService from '../../../services/authService';
import GrievanceDetailsModal from './GrievanceDetailsModal';
import GrievanceEditModal from './GrievanceEditModal';
import GrievanceDeleteModal from './GrievanceDeleteModal';
import API_BASE_URL from '../../../config/api';

const API_BASE = `${API_BASE_URL}/admin`;

const statusOptions = ['pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'escalated'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-8 0h10" />
  </svg>
);

const ArchiveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M6 5h12a1 1 0 011 1v2H5V6a1 1 0 011-1zm0 5h12v8a1 1 0 01-1 1H7a1 1 0 01-1-1v-8z" />
  </svg>
);

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
    urgent: 'bg-red-100 text-red-700',
  };
  return map[priority] || 'bg-gray-100 text-gray-800';
};

const fmtStatus = (v) => String(v || '').replace('_', ' ');
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '--');
const fmtConfidence = (value) => {
  if (value == null || value === '') {
    return '--';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '--';
  }

  return `${(numeric <= 1 ? numeric * 100 : numeric).toFixed(1)}%`;
};

const aiLabel = (analysis, key, fallback) =>
  analysis?.[key]?.label || fallback || '--';

const GrievanceManagementModule = () => {
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState(null);
  const [offices, setOffices] = useState([]);
  const [officeHandlers, setOfficeHandlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'pending',
    office: '',
  });
  const [deleteReason, setDeleteReason] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    office: '',
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

  const token = authService.getToken();
  
  useEffect(() => {
    const user = authService.getUser();
    setCurrentUser(user);
  }, []);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadStats = async () => {
    const response = await axios.get(`${API_BASE}/grievances/stats`, { headers });
    if (response.data?.success) {
      setStats(response.data.data);
    }
  };

  const loadOffices = async () => {
    const response = await authService.getOffices();
    if (response?.success) {
      setOffices(response.offices || response.data?.offices || []);
    }
  };

  const loadOfficeHandlers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/offices/handlers`, { headers });
      if (response.data?.success) {
        setOfficeHandlers(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load office handlers:', err);
    }
  };

  const loadGrievances = async (nextFilters = filters, archived = showArchived) => {
    const query = new URLSearchParams({
      page: String(nextFilters.page || 1),
      limit: String(nextFilters.limit || 10),
      search: nextFilters.search || '',
      status: nextFilters.status || '',
      priority: nextFilters.priority || '',
      office: nextFilters.office || '',
      archived: archived ? 'true' : 'false',
    });
    const response = await axios.get(`${API_BASE}/grievances?${query.toString()}`, { headers });
    if (response.data?.success) {
      setGrievances(response.data.data || []);
      setPagination(response.data.pagination || pagination);
    }
  };

  const reloadAll = async (nextFilters = filters) => {
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadGrievances(nextFilters), loadOffices(), loadOfficeHandlers()]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load grievance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Missing authentication token. Please sign in again.');
      setLoading(false);
      return;
    }
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setNotice = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setError('');
    } else {
      setError(msg);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    loadGrievances(next, showArchived).catch((err) => {
      setNotice(err.response?.data?.message || 'Failed to filter grievances', 'error');
    });
  };

  const handlePageChange = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    loadGrievances(next, showArchived).catch((err) => {
      setNotice(err.response?.data?.message || 'Failed to load page', 'error');
    });
  };

  const openViewModal = (grievance) => {
    setSelectedGrievance(grievance);
    setShowDetailsModal(true);
  };

  const openEditModal = (grievance) => {
    setSelectedGrievance(grievance);
    setEditForm({
      status: grievance.status || 'pending',
      office: grievance.office || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (grievance) => {
    setSelectedGrievance(grievance);
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGrievance) return;

    try {
      setSaving(true);
      const response = await axios.put(
        `${API_BASE}/grievances/${selectedGrievance._id}`,
        {
          status: editForm.status,
          office: editForm.office,
        },
        { headers }
      );

      if (response.data?.success) {
        setNotice('Grievance updated successfully');
        setShowEditModal(false);
        setSelectedGrievance(null);
        await Promise.all([loadStats(), loadGrievances(filters, showArchived)]);
      }
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to update grievance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveDelete = async () => {
    if (!selectedGrievance) return;
    if (!deleteReason.trim()) {
      setNotice('Please provide a reason before deleting', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await axios.delete(`${API_BASE}/grievances/${selectedGrievance._id}`, {
        headers,
        data: { reason: deleteReason.trim() },
      });

      if (response.data?.success) {
        setNotice('Grievance archived and complainant notified');
        setShowDeleteModal(false);
        setSelectedGrievance(null);
        setDeleteReason('');
        await Promise.all([loadStats(), loadGrievances(filters, showArchived)]);
      }
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to archive grievance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchivedView = async () => {
    const nextArchived = !showArchived;
    setShowArchived(nextArchived);
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadGrievances(filters, nextArchived)]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load grievance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedGrievance(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedGrievance(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedGrievance(null);
    setDeleteReason('');
  };

  return (
    <div className="flex flex-col w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h2 className="text-white font-bold text-xl">Grievance Management</h2>
            <p className="text-white/80 text-sm">
              {showArchived ? 'Review archived and rejected grievance records' : 'Track, update, and route grievance cases'}
            </p>
          </div>
          <button
            onClick={toggleArchivedView}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <ArchiveIcon />
            {showArchived ? 'Back to Active' : 'Archived Grievance'}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className="px-8 pt-5">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>}
        </div>
      )}

      <div className="px-8 pt-6">
        <div className={`rounded-xl border px-4 py-3 text-sm ${showArchived ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
          {showArchived
            ? 'Archived grievances include rejected and deleted records. These entries are preserved for audit and complainant notification history.'
            : 'Active grievances are shown here. Use edit to change status or office, and delete to archive with a required reason.'}
        </div>
      </div>

      {stats && (
        <div className="px-8 pt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            ['Total', stats.total],
            ['Pending', stats.pending],
            ['In Progress', stats.inProgress],
            ['Resolved', stats.resolved],
            ['Escalated', stats.escalated],
            ['Resolution %', `${stats.resolutionRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search reference, subject, complainant..."
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{fmtStatus(s)}</option>
            ))}
          </select>
          <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Priority</option>
            {priorityOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            value={filters.office}
            onChange={(e) => handleFilterChange('office', e.target.value)}
            placeholder="Office"
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="px-8 py-6">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading grievances...</div>
        ) : grievances.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No grievances found.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Tracking ID</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Concern</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Classified As</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Complainant</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Urgency</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Office</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grievances.map((g) => (
                  <tr key={g._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p className="font-semibold font-mono">{g.trackingId || g.referenceNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">{fmtDate(g.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <p className="font-medium text-gray-900 max-w-xs truncate">{g.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <p className="font-medium text-gray-900">
                        {aiLabel(g.aiAnalysis, 'category', 'Administrative Concerns')}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Confidence: {fmtConfidence(g.aiAnalysis?.category?.confidence)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">
                        {g.isAnonymous ? 'Anonymous' : (g.complainantName || g.complainantId?.name || '--')}
                      </p>
                      {!g.isAnonymous && (
                        <>
                          <p className="text-xs text-gray-500">{g.complainantEmail || g.complainantId?.email || '--'}</p>
                          <p className="text-xs text-gray-500">
                            {g.complainantType 
                              ? g.complainantType.charAt(0).toUpperCase() + g.complainantType.slice(1)
                              : (g.complainantId?.complainantType 
                                ? g.complainantId.complainantType.charAt(0).toUpperCase() + g.complainantId.complainantType.slice(1)
                                : '--')}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <p className="font-medium text-gray-900">
                        {aiLabel(g.aiAnalysis, 'urgency', g.priority || '--')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {fmtConfidence(g.aiAnalysis?.urgency?.confidence)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <p className="font-medium text-gray-900">
                        {aiLabel(g.aiAnalysis, 'sentiment', '--')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {fmtConfidence(g.aiAnalysis?.sentiment?.confidence)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{g.office || g.assignedTo?.office || '--'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(g.status)}`}>
                        {fmtStatus(g.status)}
                      </span>
                      {g.archived && (
                        <p className="text-[11px] text-amber-700 mt-1">
                          {g.archiveType === 'deleted' ? 'Archived as deleted' : 'Archived as rejected'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(g)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          aria-label="View grievance"
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => !g.archived && openEditModal(g)}
                          disabled={g.archived}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Edit grievance"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => !g.archived && openDeleteModal(g)}
                          disabled={g.archived}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Delete grievance"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} items)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <GrievanceDetailsModal 
        isOpen={showDetailsModal} 
        grievance={selectedGrievance} 
        onClose={handleCloseModal} 
      />
      <GrievanceEditModal
        isOpen={showEditModal}
        grievance={selectedGrievance}
        offices={offices}
        value={editForm}
        saving={saving}
        onChange={setEditForm}
        onSave={handleSaveEdit}
        onClose={handleCloseEditModal}
      />
      <GrievanceDeleteModal
        isOpen={showDeleteModal}
        grievance={selectedGrievance}
        reason={deleteReason}
        saving={saving}
        onChangeReason={setDeleteReason}
        onDelete={handleArchiveDelete}
        onClose={handleCloseDeleteModal}
      />
    </div>
  );
};

export default GrievanceManagementModule;
