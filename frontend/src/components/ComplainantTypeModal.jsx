import { useState } from 'react';
import Swal from 'sweetalert2';

function ComplainantTypeModal({ isOpen, onClose, onSelect }) {
  const [selectedType, setSelectedType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async () => {
    if (!selectedType) {
      Swal.fire({
        icon: 'warning',
        title: 'Please select a type',
        text: 'You must select Student, Parents, or Staff',
      });
      return;
    }

    setIsLoading(true);
    try {
      onSelect(selectedType);
      setSelectedType(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Type</h2>
          <p className="text-gray-600">Select what best describes you</p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            { value: 'student', label: '👨‍🎓 Student', desc: 'I am a student' },
            { value: 'parents', label: '👨‍👩‍👧‍👦 Parents', desc: 'I am a parent/guardian' },
            { value: 'staff', label: '👨‍💼 Staff', desc: 'I am staff/faculty' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedType === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name="complainantType"
                value={option.value}
                checked={selectedType === option.value}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-4 h-4 text-blue-600 cursor-pointer"
              />
              <div className="ml-4">
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-600">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSelect}
          disabled={isLoading || !selectedType}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
            selectedType && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Loading...' : 'Continue'}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can not change this later, choose carefully
        </p>
      </div>
    </div>
  );
}

export default ComplainantTypeModal;
