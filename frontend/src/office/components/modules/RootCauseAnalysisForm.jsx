import { useEffect, useState } from 'react';
import axios from 'axios';
import authService from '../../../services/authService';
import { BACKEND_URL } from '../../../config/api';

const API_BASE = BACKEND_URL;

const rcaCategoryOptions = [
  { value: 'academic_performance', label: 'Academic Performance - Grades, coursework, academic progress' },
  { value: 'administrative_process', label: 'Administrative Process - Registration, enrollment, policies' },
  { value: 'personnel_conduct', label: 'Personnel/Conduct - Staff behavior, professionalism' },
  { value: 'harassment_discrimination', label: 'Harassment/Discrimination - Bullying, sexual harassment, discrimination' },
  { value: 'infrastructure_facilities', label: 'Infrastructure/Facilities - Buildings, equipment, utilities' },
  { value: 'service_quality', label: 'Service Quality - Support services, responsiveness' },
  { value: 'policy_enforcement', label: 'Policy Enforcement - Rule violations, inconsistent application' },
  { value: 'others', label: 'Others - Any issue not listed above' },
];

const rcaStatusOptions = ['in_progress', 'escalated'];

const defaultFormData = {
  problemSummary: '',
  rootCauseCategory: '',
  rootCauseDescription: '',
  actionTaken: '',
  preventiveAction: '',
  rcaStatus: 'in_progress',
};

const buildFormDataFromRca = (rca) => ({
  problemSummary: rca?.problemSummary || '',
  rootCauseCategory: rca?.rootCauseCategory || '',
  rootCauseDescription: rca?.rootCauseDescription || '',
  actionTaken: rca?.actionTaken || '',
  preventiveAction: rca?.preventiveAction || '',
  rcaStatus: rca?.rcaStatus === 'escalated' ? 'escalated' : 'in_progress',
});

const RootCauseAnalysisForm = ({ grievance, onRCASaved, onResolved }) => {
  const token = authService.getToken();
  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resolutionConfirm, setResolutionConfirm] = useState(false);

  useEffect(() => {
    if (!grievance?._id) {
      setFormData(defaultFormData);
      return;
    }

    setFormData(buildFormDataFromRca(grievance.rootCauseAnalysis));
  }, [grievance]);

  const isComplete =
    formData.problemSummary?.trim() &&
    formData.rootCauseCategory &&
    formData.rootCauseDescription?.trim() &&
    formData.actionTaken?.trim() &&
    formData.preventiveAction?.trim();

  if (!grievance) return null;

  const handleSaveRCA = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const payload = {
        problemSummary: formData.problemSummary,
        rootCauseCategory: formData.rootCauseCategory,
        rootCauseDescription: formData.rootCauseDescription,
        actionTaken: formData.actionTaken,
        preventiveAction: formData.preventiveAction,
        rcaStatus: formData.rcaStatus,
      };

      const response = await axios.post(
        `${API_BASE}/api/offices/grievances/${grievance._id}/rca`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        const savedGrievance = response.data?.data;
        setFormData(buildFormDataFromRca(savedGrievance?.rootCauseAnalysis));
        setSuccess('RCA saved successfully.');
        onRCASaved?.(savedGrievance);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save RCA';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsResolved = async () => {
    if (!isComplete) {
      setError('Please complete all required fields before marking as resolved.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await axios.put(
        `${API_BASE}/api/offices/grievances/${grievance._id}/rca/resolve`,
        { rcaStatus: 'resolved' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        const resolvedGrievance = response.data?.data;
        setFormData(buildFormDataFromRca(resolvedGrievance?.rootCauseAnalysis));
        setSuccess('Grievance marked as resolved and complainant notified.');
        setResolutionConfirm(false);
        onResolved?.(resolvedGrievance);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to mark as resolved';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Complaint Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">ID</p>
            <p className="font-medium">{grievance.trackingId || grievance.referenceNumber}</p>
          </div>
          <div>
            <p className="text-gray-600">Complainant</p>
            <p className="font-medium">
              {grievance.isAnonymous ? 'Anonymous' : grievance.complainantName || grievance.complainantId?.name || 'Anonymous'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Department</p>
            <p className="font-medium">{grievance.department || '--'}</p>
          </div>
          <div>
            <p className="text-gray-600">Date</p>
            <p className="font-medium">{new Date(grievance.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Problem Summary <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.problemSummary}
          onChange={(e) => setFormData({ ...formData, problemSummary: e.target.value })}
          placeholder="Brief overview of the grievance and its impact"
          maxLength="2000"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.problemSummary.length}/2000</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Root Cause Category <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.rootCauseCategory}
          onChange={(e) => setFormData({ ...formData, rootCauseCategory: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Category --</option>
          {rcaCategoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Root Cause Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.rootCauseDescription}
          onChange={(e) => setFormData({ ...formData, rootCauseDescription: e.target.value })}
          placeholder="Detailed explanation of the underlying cause"
          maxLength="3000"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.rootCauseDescription.length}/3000</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Action Taken <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.actionTaken}
          onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
          placeholder="Steps taken to resolve the grievance"
          maxLength="3000"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.actionTaken.length}/3000</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Preventive Action <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.preventiveAction}
          onChange={(e) => setFormData({ ...formData, preventiveAction: e.target.value })}
          placeholder="Measures to prevent similar issues in the future"
          maxLength="3000"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.preventiveAction.length}/3000</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">RCA Status</label>
        <select
          value={formData.rcaStatus}
          onChange={(e) => setFormData({ ...formData, rcaStatus: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {rcaStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {isComplete ? (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          All required fields are complete. You can now mark this grievance as resolved.
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
          Complete all required fields (<span className="text-red-500">*</span>) before marking as resolved.
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSaveRCA}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save RCA'}
        </button>

        {isComplete && (
          <button
            onClick={() => setResolutionConfirm(true)}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Mark as Resolved
          </button>
        )}
      </div>

      {resolutionConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirm Resolution</h3>
            <p className="text-gray-700 mb-6">
              Mark this grievance as resolved? A notification will be sent to the complainant.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResolutionConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsResolved}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RootCauseAnalysisForm;
