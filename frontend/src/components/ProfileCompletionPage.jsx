import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import authService from '../services/authService';
import OfficeSelectionModal from './OfficeSelectionModal';
import API_BASE_URL from '../config/api';

function ProfileCompletionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [formData, setFormData] = useState({
    office: ''
  });
  const [offices, setOffices] = useState([]);

  // Check profile completion status on mount
  useEffect(() => {
    checkProfileStatus();
    loadOffices();
  }, []);

  const checkProfileStatus = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/profile/completion-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUserData(response.data);
        setNeedsCompletion(response.data.needsCompletion);

        // If no completion needed, redirect to dashboard
        if (!response.data.needsCompletion) {
          redirectToDashboard(response.data.role);
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
      if (error.response?.status === 401) {
        authService.logout();
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async () => {
    try {
      const token = authService.getToken();
      const response = await axios.get(`${API_BASE_URL}/profile/offices`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setOffices(response.data.offices);
      }
    } catch (error) {
      console.error('Error loading offices:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = authService.getToken();
      const response = await axios.post(`${API_BASE_URL}/profile/complete`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Profile Completed!',
          text: 'Your profile has been successfully completed.',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          redirectToDashboard(userData.role);
        });
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to complete profile';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfficeSelect = async (officeId) => {
    const updatedFormData = {
      ...formData,
      office: officeId
    };
    setFormData(updatedFormData);
    
    setSubmitting(true);
    try {
      const token = authService.getToken();
      const response = await axios.post(`${API_BASE_URL}/profile/complete`, updatedFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Office Selected!',
          text: 'Your office has been successfully selected.',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          redirectToDashboard(userData.role);
        });
      }
    } catch (error) {
      console.error('Error selecting office:', error);
      const errorMessage = error.response?.data?.message || 'Failed to select office';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const redirectToDashboard = (role) => {
    const roleRoutes = {
      admin: '/admin',
      complainant: '/complainant',
      office_handler: '/office'
    };

    const dashboardRoute = roleRoutes[role] || '/';
    navigate(dashboardRoute);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      admin: 'Administrator',
      complainant: 'Complainant',
      office_handler: 'Office Handler'
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile information...</p>
        </div>
      </div>
    );
  }

  if (!needsCompletion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Complete!</h2>
          <p className="text-gray-600 mb-6">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show office selection modal for office handlers
  if (userData?.role === 'office_handler' && needsCompletion) {
    return (
      <OfficeSelectionModal 
        offices={offices}
        userData={userData}
        onSelect={handleOfficeSelect}
        isLoading={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">
              Welcome, {userData?.user?.name}!<br/>
              As an <span className="font-semibold text-blue-600">{getRoleDisplayName(userData?.role)}</span>, 
              please complete the following information.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display user info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Name:</span>
                <span className="font-medium">{userData?.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email:</span>
                <span className="font-medium">{userData?.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Role:</span>
                <span className="font-medium text-blue-600">{getRoleDisplayName(userData?.role)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Completing Profile...
                </div>
              ) : (
                'Complete Profile & Continue'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By completing your profile, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCompletionPage;
