import { downloadRcaPdf, getRcaCategoryLabel, hasRcaContent } from '../../../utils/rcaReport';

const RootCauseAnalysisView = ({ grievance }) => {
  if (!hasRcaContent(grievance)) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">Root Cause Analysis not yet completed</p>
      </div>
    );
  }

  const rca = grievance.rootCauseAnalysis;
  const statusBadgeColor = {
    in_progress: 'bg-amber-100 text-amber-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    escalated: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">Root Cause Analysis</h3>
            <p className="text-blue-100">
              Completed by {rca.completedBy?.name || grievance.assignedTo?.name || 'Unknown'}
            </p>
            {(rca.completedAt || rca.resolutionDate) && (
              <p className="text-blue-100 text-sm">
                Completed on {new Date(rca.completedAt || rca.resolutionDate).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => downloadRcaPdf(grievance)}
            className="px-4 py-2 rounded-lg bg-white text-cyan-700 font-semibold hover:bg-cyan-50 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>

      {rca.problemSummary && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Problem Summary</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900 whitespace-pre-wrap break-words">{rca.problemSummary}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Root Cause Category</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900 font-medium">{getRcaCategoryLabel(rca.rootCauseCategory)}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">RCA Status</label>
          <div>
            <span
              className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
                statusBadgeColor[rca.rcaStatus] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {(rca.rcaStatus || '--').replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {rca.rootCauseDescription && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Root Cause Description</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
            <p className="text-gray-900 whitespace-pre-wrap break-words">{rca.rootCauseDescription}</p>
          </div>
        </div>
      )}

      {rca.actionTaken && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Action Taken</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
            <p className="text-gray-900 whitespace-pre-wrap break-words">{rca.actionTaken}</p>
          </div>
        </div>
      )}

      {rca.preventiveAction && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Preventive Action</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
            <p className="text-gray-900 whitespace-pre-wrap break-words">{rca.preventiveAction}</p>
          </div>
        </div>
      )}

      {(rca.responsibleOffice || grievance.office) && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Responsible Office</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900">{rca.responsibleOffice || grievance.office}</p>
          </div>
        </div>
      )}

      {(rca.resolutionDate || rca.completedAt) && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Resolution Date</label>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900">
              {new Date(rca.resolutionDate || rca.completedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RootCauseAnalysisView;
