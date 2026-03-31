const fmtStatus = (v) => String(v || '').replace('_', ' ').toUpperCase();

const GrievanceEditModal = ({
  isOpen,
  grievance,
  offices = [],
  value,
  saving = false,
  onChange,
  onSave,
  onClose,
}) => {
  if (!isOpen || !grievance) return null;

  const officeOptions = Array.isArray(offices)
    ? offices
        .map((office) => office?.name || office?.officeName || office?.id || office)
        .filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 flex items-center justify-between">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Edit Grievance</h2>
            <p className="text-white/80 text-sm">Tracking ID: {grievance.trackingId || grievance.referenceNumber}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              <input
                value={grievance.subject || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">Subject cannot be changed by admins.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Complainant</label>
              <input
                value={grievance.isAnonymous ? 'Anonymous' : grievance.complainantName || grievance.complainantId?.name || '--'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={value?.status || grievance.status || 'pending'}
                onChange={(e) => onChange({ ...(value || {}), status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {['pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'escalated'].map((status) => (
                  <option key={status} value={status}>
                    {fmtStatus(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reassigned Office</label>
              <select
                value={value?.office || grievance.office || ''}
                onChange={(e) => onChange({ ...(value || {}), office: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {officeOptions.map((office) => (
                  <option key={office} value={office}>
                    {office}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="whitespace-pre-wrap text-gray-800">{grievance.description || '--'}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">The grievance content is read-only in admin edit mode.</p>
          </div>

          <div className="rounded-xl p-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900">
            <p>Only the status and reassigned office can be updated here.</p>
          </div>
        </div>

        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrievanceEditModal;
