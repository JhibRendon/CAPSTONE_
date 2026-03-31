import RootCauseAnalysisView from './RootCauseAnalysisView';
import { hasRcaContent } from '../../../utils/rcaReport';

const GrievanceDetailsModal = ({ isOpen, grievance, onClose }) => {
  if (!isOpen || !grievance) return null;

  const fmtStatus = (v) => String(v || '').replace('_', ' ').toUpperCase();
  const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '--');
  const fmtConfidence = (value) => {
    if (value == null || value === '') return '--';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '--';
    return `${(numeric <= 1 ? numeric * 100 : numeric).toFixed(1)}%`;
  };

  const statusBadgeMap = {
    pending: 'bg-amber-100 text-amber-800',
    under_review: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    escalated: 'bg-purple-100 text-purple-800',
  };

  const priorityBadgeMap = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-cyan-100 text-cyan-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const getStatusBadge = (status) => statusBadgeMap[status] || 'bg-gray-100 text-gray-800';
  const getPriorityBadge = (priority) => priorityBadgeMap[priority] || 'bg-gray-100 text-gray-800';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Grievance Details</h2>
            <p className="text-white/80 text-sm">Tracking ID: {grievance.trackingId || grievance.referenceNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-8 py-6 space-y-6">
            {/* Subject and Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                <p className="text-gray-900 text-lg font-medium break-words">{grievance.subject}</p>
                <p className="text-xs text-gray-500 mt-1">Created: {fmtDate(grievance.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(grievance.status)}`}>
                  {fmtStatus(grievance.status)}
                </span>
                {grievance.archived && (
                  <p className="text-xs text-amber-700 mt-2">
                    Archived {grievance.archiveType === 'deleted' ? 'after deletion' : 'after rejection'}
                  </p>
                )}
              </div>
            </div>

            {/* Priority and Category */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityBadge(grievance.priority)}`}>
                  {grievance.priority || 'N/A'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <p className="text-gray-900">{grievance.category || 'General'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Office</label>
                <p className="text-gray-900">{grievance.office || '--'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tracking ID</label>
                <p className="text-gray-900 font-mono">{grievance.trackingId || grievance.referenceNumber}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap break-words">{grievance.description || '--'}</p>
              </div>
            </div>

            {/* Complainant Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Complainant Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <p className="text-gray-900">
                    {grievance.isAnonymous ? 'Anonymous' : (grievance.complainantName || grievance.complainantId?.name || '--')}
                  </p>
                </div>
                {!grievance.isAnonymous && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <p className="text-gray-900">
                        {grievance.complainantEmail || grievance.complainantId?.email || '--'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {grievance.complainantId?.contact || grievance.complainantId?.phone || '--'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <p className="text-gray-900">
                        {grievance.complainantType 
                          ? grievance.complainantType.charAt(0).toUpperCase() + grievance.complainantType.slice(1) 
                          : (grievance.complainantId?.complainantType 
                            ? grievance.complainantId.complainantType.charAt(0).toUpperCase() + grievance.complainantId.complainantType.slice(1) 
                            : '--')}
                      </p>
                    </div>
                  </>
                )}
                {grievance.isAnonymous && (
                  <div className="md:col-span-1">
                    <span className="inline-flex px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-sm font-medium">
                      Anonymous Grievance
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment and Dates */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment & Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned To</label>
                  <p className="text-gray-900">{grievance.assignedTo?.name || 'Unassigned'}</p>
                  {grievance.assignedTo?.office && (
                    <p className="text-xs text-gray-500">{grievance.assignedTo.office}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Date</label>
                  <p className="text-gray-900">{grievance.assignedDate ? fmtDate(grievance.assignedDate) : '--'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Created Date</label>
                  <p className="text-gray-900">{fmtDate(grievance.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Updated Date</label>
                  <p className="text-gray-900">{fmtDate(grievance.updatedAt)}</p>
                </div>
                {grievance.archivedAt && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Archived Date</label>
                    <p className="text-gray-900">{fmtDate(grievance.archivedAt)}</p>
                  </div>
                )}
                {grievance.incidentDate && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Incident Date</label>
                    <p className="text-gray-900">{fmtDate(grievance.incidentDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis if available */}
            {grievance.aiAnalysis && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
                  <span className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                    Highlighted Review
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {grievance.aiAnalysis.summary && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1">Summary</p>
                      <p className="text-gray-900 whitespace-pre-wrap break-words">{grievance.aiAnalysis.summary}</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Classified As</p>
                    <p className="text-gray-900 font-semibold">{grievance.aiAnalysis.category?.label || 'Administrative Concerns'}</p>
                    <p className="text-xs text-gray-600 mt-2">Confidence: {fmtConfidence(grievance.aiAnalysis.category?.confidence)}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Urgency Type</p>
                    <p className="text-gray-900 font-semibold">{grievance.aiAnalysis.urgency?.label || '--'}</p>
                    <p className="text-xs text-gray-600 mt-2">Confidence: {fmtConfidence(grievance.aiAnalysis.urgency?.confidence)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Sentiment Analysis</p>
                    <p className="text-gray-900 font-semibold">{grievance.aiAnalysis.sentiment?.label || '--'}</p>
                    <p className="text-xs text-gray-600 mt-2">Confidence: {fmtConfidence(grievance.aiAnalysis.sentiment?.confidence)}</p>
                  </div>
                </div>
              </div>
            )}

            {grievance.archiveReason && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Archive Reason</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap break-words">{grievance.archiveReason}</p>
                </div>
              </div>
            )}

            {/* Additional Details */}
            {grievance.notes && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap break-words">{grievance.notes}</p>
                </div>
              </div>
            )}

            {/* Root Cause Analysis View */}
            {hasRcaContent(grievance) && (
              <div className="border-t border-gray-200 pt-6">
                <RootCauseAnalysisView grievance={grievance} isEditable={false} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrievanceDetailsModal;
