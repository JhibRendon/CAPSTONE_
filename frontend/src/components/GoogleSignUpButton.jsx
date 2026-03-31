import { GoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';

function GoogleSignUpButton({ onGoogleSignUp }) {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Decode the credential to get user info
      const decoded = jwtDecode(credentialResponse.credential);
      
      const googleData = {
        email: decoded.email,
        fullName: decoded.name,
        profilePicture: decoded.picture,
        googleId: decoded.sub,
      };

      // Pass the data to parent component
      onGoogleSignUp(googleData);

      Swal.fire({
        icon: 'success',
        title: 'Great!',
        text: 'Email and name pre-filled from your Google account',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Google Sign-Up Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to process Google account information',
        confirmButtonColor: '#d33',
      });
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google Sign-Up Error:', error);
    
    // Check if it's a 403 or origin error
    if (error?.error === 'idpiframe_initialization_failed' || 
        error?.details?.includes('origin') ||
        error?.message?.includes('403') ||
        (typeof error === 'string' && error.includes('403'))) {
      Swal.fire({
        icon: 'warning',
        title: 'Google Sign-Up Configuration Needed',
        html: `
          <div class="text-left">
            <p class="mb-3"><strong>Google Sign-Up requires configuration:</strong></p>
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
            <p class="mt-3"><strong>In the meantime, please use manual sign-up below.</strong></p>
          </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        width: '500px'
      });
    } else if (error?.error === 'popup_closed_by_user') {
      // User closed the popup - not really an error
      return;
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Failed',
        text: 'Failed to authenticate with Google. Please try again or use manual sign-up.',
        confirmButtonColor: '#d33',
      });
    }
  };

  return (
    <div className="relative">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text="signup_with"
        size="large"
        width=""
        useOneTap={false}
        shape="rectangular"
      />
      {/* Fallback message */}
      <div className="text-xs text-gray-500 text-center mt-2">
        Or fill the form manually below
      </div>
    </div>
  );
}

export default GoogleSignUpButton;
