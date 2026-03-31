import RootCauseAnalysisForm from './RootCauseAnalysisForm';
import RootCauseAnalysisView from '../../../admin/components/modules/RootCauseAnalysisView';
import { hasRcaContent } from '../../../utils/rcaReport';

const RCAFormModal = ({ isOpen, grievance, onClose, onRCASaved, onResolved }) => {
  if (!isOpen || !grievance) return null;

  const showReadOnlyView =
    grievance.rootCauseAnalysis?.rcaStatus === 'resolved' && hasRcaContent(grievance);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 px-8 py-7 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Root Cause Analysis</h2>
                <p className="text-blue-100 text-sm mt-1">
                  ID: {grievance.trackingId || grievance.referenceNumber}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2.5 transition-colors flex-shrink-0"
            title="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content with padding */}
        <div className="overflow-y-auto flex-1 bg-gray-50/50">
          {showReadOnlyView ? (
            <div className="p-6">
              <RootCauseAnalysisView grievance={grievance} />
            </div>
          ) : (
            <RootCauseAnalysisForm
              grievance={grievance}
              onRCASaved={onRCASaved}
              onResolved={onResolved}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white px-8 py-5 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};

export default RCAFormModal;
