import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import authService from "../../../services/authService";
import { getOfficePreferences } from "../../utils/preferences";
import RCAFormModal from "./RCAFormModal";
import API_BASE_URL from "../../../config/api";
import { hasRcaContent } from "../../../utils/rcaReport";

const API_BASE = `${API_BASE_URL}/offices`;
const statusOptions = ["under_review", "in_progress", "resolved", "rejected", "escalated"];

const statusBadge = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-800",
    under_review: "bg-blue-100 text-blue-800",
    in_progress: "bg-indigo-100 text-indigo-800",
    resolved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    escalated: "bg-purple-100 text-purple-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

const priorityBadge = (priority) => {
  const map = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-cyan-100 text-cyan-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return map[priority] || "bg-gray-100 text-gray-800";
};

const fmtStatus = (value) => String(value || "").replaceAll("_", " ");
const fmtDate = (value) => (value ? new Date(value).toLocaleString() : "--");

export const GrievancesModule = () => {
  const token = authService.getToken();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const preferences = getOfficePreferences();

  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    page: 1,
    limit: preferences.queuePageSize || 10,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rcaModalOpen, setRcaModalOpen] = useState(false);

  const selectedGrievance = grievances.find((item) => item._id === selectedId) || grievances[0] || null;

  const mergeUpdatedGrievance = (updatedGrievance) => {
    if (!updatedGrievance?._id) {
      reloadAll().catch(() => {});
      return;
    }

    setGrievances((current) =>
      current.map((item) =>
        item._id === updatedGrievance._id
          ? {
              ...item,
              ...updatedGrievance,
              complainantId: updatedGrievance.complainantId || item.complainantId,
              assignedTo: updatedGrievance.assignedTo || item.assignedTo,
              rootCauseAnalysis: updatedGrievance.rootCauseAnalysis || item.rootCauseAnalysis,
            }
          : item
      )
    );

    setSelectedId(updatedGrievance._id);
  };

  const setNotice = (message, type = "success") => {
    if (type === "success") {
      setSuccess(message);
      setError("");
    } else {
      setError(message);
      setSuccess("");
    }

    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
  };

  const getRCAButtonState = () => {
    if (!hasRcaContent(selectedGrievance)) {
      return { 
        text: "Start RCA", 
        color: "bg-blue-600 hover:bg-blue-700 text-white",
        icon: "✓"
      };
    }
    
    const rca = selectedGrievance.rootCauseAnalysis;
    const hasAllFields = rca.problemSummary && rca.rootCauseCategory && rca.rootCauseDescription && rca.actionTaken && rca.preventiveAction;
    
    if (rca.rcaStatus === 'resolved') {
      return { 
        text: "View RCA", 
        color: "bg-emerald-700 hover:bg-emerald-800 text-white",
        icon: "📋"
      };
    } else if (hasAllFields) {
      return { 
        text: "Continue RCA", 
        color: "bg-blue-600 hover:bg-blue-700 text-white",
        icon: "✎"
      };
    } else {
      return { 
        text: "Continue RCA", 
        color: "bg-blue-600 hover:bg-blue-700 text-white",
        icon: "✎"
      };
    }
  };

  const loadStats = async () => {
    const response = await axios.get(`${API_BASE}/grievances/stats`, { headers });
    if (response.data?.success) {
      setStats(response.data.data);
    }
  };

  const loadGrievances = async (nextFilters = filters) => {
    const query = new URLSearchParams({
      page: String(nextFilters.page || 1),
      limit: String(nextFilters.limit || 10),
      search: nextFilters.search || "",
      status: nextFilters.status || "",
    });

    const response = await axios.get(`${API_BASE}/grievances/assigned?${query.toString()}`, { headers });
    if (response.data?.success) {
      const items = response.data.data || [];
      setGrievances(items);
      setPagination(response.data.pagination || pagination);

      if (!selectedId && items[0]) {
        setSelectedId(items[0]._id);
        setResolutionNotes(items[0].resolutionNotes || "");
      } else if (selectedId) {
        const nextSelected = items.find((item) => item._id === selectedId);
        if (nextSelected) {
          setResolutionNotes(nextSelected.resolutionNotes || "");
        } else if (items[0]) {
          setSelectedId(items[0]._id);
          setResolutionNotes(items[0].resolutionNotes || "");
        } else {
          setSelectedId("");
          setResolutionNotes("");
        }
      }
    }
  };

  const reloadAll = async (nextFilters = filters) => {
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadGrievances(nextFilters)]);
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to load assigned grievances", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Missing authentication token. Please sign in again.");
      setLoading(false);
      return;
    }
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedGrievance) {
      setResolutionNotes(selectedGrievance.resolutionNotes || "");
    }
  }, [selectedGrievance]);

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    loadGrievances(next).catch((err) => {
      setNotice(err.response?.data?.message || "Failed to filter grievances", "error");
    });
  };

  const handlePageChange = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    loadGrievances(next).catch((err) => {
      setNotice(err.response?.data?.message || "Failed to load page", "error");
    });
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedGrievance) return;

    try {
      setSaving(true);
      const response = await axios.put(
        `${API_BASE}/grievances/${selectedGrievance._id}/status`,
        { status, resolutionNotes },
        { headers }
      );

      if (response.data?.success) {
        setNotice("Grievance updated");
        await reloadAll();
      }
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to update grievance", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Assigned Grievances</h2>
          <p className="text-gray-600">Review and update cases assigned to your account</p>
        </div>
      </div>

      {(error || success) && (
        <div className="mb-6">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            ["Total", stats.total],
            ["Pending", stats.pending],
            ["In Progress", stats.inProgress],
            ["Resolved", stats.resolved],
            ["Escalated", stats.escalated],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-gray-200 rounded-xl">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <input
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Search reference or subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Status</option>
              <option value="pending">pending</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{fmtStatus(status)}</option>
              ))}
            </select>
          </div>

          <div className="max-h-[650px] overflow-y-auto divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading grievances...</div>
            ) : grievances.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No assigned grievances found.</div>
            ) : (
              grievances.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedId(item._id)}
                  className={`w-full text-left p-4 transition-colors ${selectedId === item._id ? "bg-blue-50" : "hover:bg-gray-50"}`}
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

        <div className="lg:col-span-2 border border-gray-200 rounded-xl p-6">
          {!selectedGrievance ? (
            <div className="h-full flex items-center justify-center text-gray-500">Select a grievance to review.</div>
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
                  <p className="text-gray-500 mb-1">Complainant</p>
                  <p className="font-medium text-gray-900">
                    {selectedGrievance.isAnonymous
                      ? "Anonymous"
                      : selectedGrievance.complainantName || selectedGrievance.complainantId?.name || "--"}
                  </p>
                  {!selectedGrievance.isAnonymous && (
                    <>
                      <p className="text-gray-600">{selectedGrievance.complainantEmail || selectedGrievance.complainantId?.email || "--"}</p>
                      <p className="text-gray-600 text-xs mt-1">Type: {selectedGrievance.complainantType ? selectedGrievance.complainantType.charAt(0).toUpperCase() + selectedGrievance.complainantType.slice(1) : (selectedGrievance.complainantId?.complainantType ? selectedGrievance.complainantId.complainantType.charAt(0).toUpperCase() + selectedGrievance.complainantId.complainantType.slice(1) : "--")}</p>
                    </>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 mb-1">Routing</p>
                  <p className="font-medium text-gray-900">Office: {selectedGrievance.office || "--"}</p>
                  <p className="text-gray-600">Category: {selectedGrievance.category || "general"}</p>
                  <p className="text-gray-600">Incident date: {selectedGrievance.incidentDate || "--"}</p>
                </div>
              </div>

              {selectedGrievance.aiAnalysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-blue-900 mb-2">AI Analysis</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <p className="text-blue-800">Category: {selectedGrievance.aiAnalysis.category?.label || "--"}</p>
                    <p className="text-blue-800">Urgency: {selectedGrievance.aiAnalysis.urgency?.label || "--"}</p>
                    <p className="text-blue-800">Sentiment: {selectedGrievance.aiAnalysis.sentiment?.label || "--"}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-line">
                  {selectedGrievance.description}
                </div>
              </div>

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

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full min-h-[130px] px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Add investigation details, actions taken, or resolution notes"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusUpdate(status)}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Mark {fmtStatus(status)}
                  </button>
                ))}
                
                {selectedGrievance?.status !== 'resolved' && selectedGrievance && (
                  <button
                    type="button"
                    onClick={() => setRcaModalOpen(true)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-md hover:shadow-lg ${getRCAButtonState().color}`}
                  >
                    <span className="text-base">{getRCAButtonState().icon}</span>
                    {getRCAButtonState().text}
                  </button>
                )}
                {selectedGrievance?.status === 'resolved' && selectedGrievance && (
                  <button
                    type="button"
                    onClick={() => setRcaModalOpen(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="text-base">📋</span>
                    View RCA
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RCA Form Modal */}
      <RCAFormModal
        isOpen={rcaModalOpen}
        grievance={selectedGrievance}
        onClose={() => setRcaModalOpen(false)}
        onRCASaved={(updatedGrievance) => {
          mergeUpdatedGrievance(updatedGrievance);
          reloadAll().catch(() => {});
        }}
        onResolved={(updatedGrievance) => {
          mergeUpdatedGrievance(updatedGrievance);
          reloadAll().catch(() => {});
          setRcaModalOpen(false);
        }}
      />
    </div>
  );
};
