import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import authService from '../services/authService';
import OfficeSelectionModal from './OfficeSelectionModal';
import ComplainantTypeModal from './ComplainantTypeModal';

function GoogleSignInButton({ role, context = 'login', onComplainantTypeNeeded }) {
  const navigate = useNavigate();
  const [showOfficeSelectionModal, setShowOfficeSelectionModal] = useState(false);
  const [showComplainantTypeModal, setShowComplainantTypeModal] = useState(false);
  const [availableOffices, setAvailableOffices] = useState([]);
  const [isOfficeLoading, setIsOfficeLoading] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);
  const [pendingOfficeUser, setPendingOfficeUser] = useState(null);
  const [pendingComplainantUser, setPendingComplainantUser] = useState(null);

  const handleOfficeSelectionRequired = async (googleToken, officeUser) => {
    setIsOfficeLoading(true);

    try {
      const officesResult = await authService.getOffices();

      if (!officesResult.success) {
        Swal.fire({
          icon: 'error',
          title: 'Unable to Load Offices',
          text: officesResult.message || 'Please try again before continuing your office registration.',
          confirmButtonColor: '#d33',
        });
        return;
      }

      setPendingGoogleToken(googleToken);
      setPendingOfficeUser({ user: officeUser });
      setAvailableOffices(officesResult.offices || []);
      setShowOfficeSelectionModal(true);
    } finally {
      setIsOfficeLoading(false);
    }
  };

  const handleComplainantTypeRequired = async (googleToken, complainantUser) => {
    setPendingGoogleToken(googleToken);
    setPendingComplainantUser(complainantUser);
    setShowComplainantTypeModal(true);
  };

  const handleComplainantTypeSubmit = async (selectedType) => {
    if (!pendingGoogleToken) {
      Swal.fire({
        icon: 'error',
        title: 'Session Expired',
        text: 'Please try signing in with Google again.',
        confirmButtonColor: '#d33',
      });
      throw new Error('Missing pending Google token');
    }

    try {
      const setupResult = await authService.completeGoogleComplainantSetup(pendingGoogleToken, selectedType);

      if (!setupResult.success) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: setupResult.message || 'Failed to save your complainant type.',
          confirmButtonColor: '#d33',
        });
        throw new Error(setupResult.message || 'Complainant setup failed');
      }

      authService.setToken(setupResult.token);
      authService.setUser(setupResult.user);
      setShowComplainantTypeModal(false);
      setPendingGoogleToken(null);
      setPendingComplainantUser(null);

      await Swal.fire({
        icon: 'success',
        title: 'Welcome!',
        text: `Your account has been created successfully as a ${selectedType}.`,
        timer: 2000,
        showConfirmButton: false,
      });

      navigate('/complainant');
    } catch (error) {
      console.error('Complainant type submission error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'An error occurred. Please try again.',
        confirmButtonColor: '#d33',
      });
    }
  };

  const handleOfficeSetupSubmit = async (officeId) => {
    if (!pendingGoogleToken) {
      Swal.fire({
        icon: 'error',
        title: 'Session Expired',
        text: 'Please try signing in with Google again.',
        confirmButtonColor: '#d33',
      });
      throw new Error('Missing pending Google token');
    }

    const setupResult = await authService.completeGoogleOfficeSetup(pendingGoogleToken, officeId);

    if (!setupResult.success) {
      const title = setupResult.status === 'ROLE_MISMATCH'
        ? 'Role Mismatch'
        : setupResult.status === 'ALREADY_APPROVED'
          ? 'Already Approved'
          : 'Unable to Submit';

      Swal.fire({
        icon: setupResult.status === 'ALREADY_APPROVED' ? 'info' : 'error',
        title,
        text: setupResult.message || 'We could not finish your office registration right now.',
        confirmButtonColor: setupResult.status === 'ALREADY_APPROVED' ? '#3085d6' : '#d33',
      });

      throw new Error(setupResult.message || 'Office setup failed');
    }

    authService.logout();
    setShowOfficeSelectionModal(false);
    setPendingGoogleToken(null);
    setPendingOfficeUser(null);

    await Swal.fire({
      icon: 'info',
      title: 'Account Pending Approval',
      html: `
        <div style="text-align: left; line-height: 1.6;">
          <p>Your office account request has been submitted successfully.</p>
          <p>Please wait for the administrator approval email before accessing the office dashboard.</p>
        </div>
      `,
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
      allowOutsideClick: false,
    });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // credentialResponse.credential is the ID token (JWT)
      const googleToken = credentialResponse.credential;
      const result = await authService.googleSignIn(googleToken, role);

      if (!result.success) {
        // Handle errors
        if (result.status === 'ROLE_MISMATCH') {
          Swal.fire({
            icon: 'warning',
            title: 'Role Mismatch',
            html: `<p style="font-size: 16px; color: #666;">This email is already registered as a <strong>${result.existingRole
              .replace('_', ' ')
              .toUpperCase()}</strong></p><p style="font-size: 14px; color: #999; margin-top: 10px;">Please log in with your registered role or use a different email.</p>`,
            confirmButtonText: 'Go to Login',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: true,
          }).then(() => {
            navigate(`/login?role=${result.existingRole}`);
          });
        } else if ((result.message || '').includes('already registered') || (result.message || '').includes('exists')) {
          // User trying to register with existing email
          Swal.fire({
            icon: 'info',
            title: context === 'signup' ? 'Account Exists' : 'Login Required',
            html: `
              <p style="font-size: 16px; color: #666; margin-bottom: 15px;">This email is already registered in our system.</p>
              <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3085d6;">
                <p style="margin: 0; font-weight: 500; color: #2c5aa0;">What would you like to do?</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #555;">
                  <li style="margin: 5px 0;">${context === 'signup' ? 'Switch to Login tab and sign in with Google' : 'Sign in with your existing account'}</li>
                  <li style="margin: 5px 0;">If you forgot which role you registered with, contact administrator</li>
                </ul>
              </div>
            `,
            confirmButtonText: context === 'signup' ? 'Go to Login' : 'Try Again',
            confirmButtonColor: '#3085d6',
            showCancelButton: context === 'signup',
            cancelButtonText: 'Cancel'
          }).then((swalResult) => {
            if (swalResult.isConfirmed && context === 'signup') {
              // Dispatch event to switch to login view
              window.dispatchEvent(new CustomEvent('switchToLogin'));
            }
          });
        } else if (result.status === 'NOT_VERIFIED') {
          Swal.fire({
            icon: 'info',
            title: 'Account Pending Approval',
            html: `
              <div style="text-align: left; line-height: 1.6;">
                <p>Your office account is still pending administrator approval.</p>
                <p>Please wait for the approval email before accessing the dashboard.</p>
              </div>
            `,
            confirmButtonColor: '#3085d6',
          });
        } else if (result.status === 'BLOCKED') {
          Swal.fire({
            icon: 'error',
            title: 'Account Blocked',
            text: result.message || 'Your account has been blocked. Please contact the administrator.',
            confirmButtonColor: '#d33',
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Authentication Failed',
            text: result.message || 'Failed to authenticate with Google. Please try again.',
            confirmButtonColor: '#d33',
          });
        }
        return;
      }

      if (result.status === 'OFFICE_SELECTION_REQUIRED' && role === 'office_handler') {
        await handleOfficeSelectionRequired(googleToken, result.user);
        return;
      }

      // Handle complainant type selection requirement
      if (result.status === 'COMPLAINANT_TYPE_REQUIRED' && role === 'complainant') {
        await handleComplainantTypeRequired(googleToken, result.user);
        return;
      }

      // Success
      authService.setToken(result.token);
      authService.setUser(result.user);

      const successMessage =
        result.status === 'SUCCESS_NEW_USER'
          ? `Welcome! Your ${role.replace('_', ' ')} account has been created successfully.`
          : `Welcome back, ${result.user.name}!`;

      const successTitle =
        result.status === 'SUCCESS_NEW_USER'
          ? 'Account Created'
          : 'Login Successful';

      const proceedNavigation = () => {
        // Navigate to appropriate dashboard based on role
        if (result.user.role === 'superadmin') {
          navigate('/admin-manage');
        } else {
          const roleRoutes = {
            admin: '/admin',
            complainant: '/complainant',
            office_handler: '/office',
          };
          const dashboardRoute = roleRoutes[result.user.role] || '/';
          navigate(dashboardRoute);
        }
      };

      // For new complainant users, show type selection modal before navigating
      if (
        result.status === 'SUCCESS_NEW_USER' &&
        role === 'complainant' &&
        onComplainantTypeNeeded &&
        !result.user.complainantType
      ) {
        authService.setToken(result.token);
        authService.setUser(result.user);
        
        // Call the callback to let parent component show the modal
        onComplainantTypeNeeded(result.user, result.token).then(() => {
          // After type is selected, proceed with navigation
          Swal.fire({
            icon: 'success',
            title: successTitle,
            text: successMessage,
            timer: 2000,
            showConfirmButton: false,
          }).then(proceedNavigation);
        }).catch((error) => {
          console.error('Complainant type selection failed:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to set your complainant type. Please try again.',
            confirmButtonColor: '#d33',
          });
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: successTitle,
        text: successMessage,
        timer: 2000,
        showConfirmButton: false,
      }).then(proceedNavigation);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred',
        confirmButtonColor: '#d33',
      });
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google Sign-In Error:', error);
    
    // More specific error handling
    if (error?.error === 'idpiframe_initialization_failed' || 
        error?.details?.includes('origin') ||
        error?.message?.includes('403') ||
        error?.error === 'popup_closed_by_user' ||
        (typeof error === 'string' && error.includes('403'))) {
      
      // Check if this is just a button loading issue vs actual auth failure
      if (error.error === 'popup_closed_by_user') {
        // User closed the popup - not really an error
        return;
      }
      
      Swal.fire({
        icon: 'warning',
        title: 'Google Sign-In Configuration Needed',
        html: `
          <div class="text-left">
            <p class="mb-3"><strong>Google Sign-In requires configuration:</strong></p>
            <ol class="list-decimal pl-5 space-y-2 text-sm">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" class="text-blue-600 underline">Google Cloud Console</a></li>
              <li>Navigate to "APIs & Services" → "Credentials"</li>
              <li>Edit your OAuth 2.0 Client ID</li>
              <li>Add these authorized origins:
                <div class="bg-gray-100 p-2 mt-2 rounded text-xs">
                  http://localhost:5173<br>
                  http://127.0.0.1:5173
                </div>
              </li>
              <li>Save and try again</li>
            </ol>
            <p class="mt-3"><strong>You can still use email/password login below.</strong></p>
          </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        width: '500px'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Failed',
        text: 'Failed to authenticate with Google. Please try again or use email/password login.',
        confirmButtonColor: '#d33',
      });
    }
  };

  return (
    <div className="relative">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text="signin_with"
        size="large"
        useOneTap={false}
        shape="rectangular"
      />
      {/* Fallback message for when Google fails */}
      <div className="text-xs text-gray-500 text-center mt-2">
        Having trouble? Use email/password login
      </div>
      {showOfficeSelectionModal && (
        <OfficeSelectionModal
          offices={availableOffices}
          userData={pendingOfficeUser}
          onSelect={handleOfficeSetupSubmit}
          isLoading={isOfficeLoading}
          mode="approval"
        />
      )}

      {showComplainantTypeModal && (
        <ComplainantTypeModal
          isOpen={showComplainantTypeModal}
          onClose={() => {
            setShowComplainantTypeModal(false);
            setPendingGoogleToken(null);
            setPendingComplainantUser(null);
          }}
          onSelect={handleComplainantTypeSubmit}
        />
      )}
    </div>
  );
}

export default GoogleSignInButton;
