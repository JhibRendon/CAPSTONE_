import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import GoogleSignUpButton from "../../components/GoogleSignUpButton";
import Swal from 'sweetalert2';
import authService from "../../services/authService";
import API_BASE_URL from "../../config/api";

function SignupForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    office: "",
    complainantType: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({});
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [officeCategories, setOfficeCategories] = useState([]);

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/offices`);
        if (response.data.success) {
          setOfficeCategories(response.data.offices || []);
        }
      } catch (error) {
        console.error('Failed to fetch office categories:', error);
      }
    };
    fetchOffices();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Role selection is required";
    }
    
    // Office validation for office handlers
    if (formData.role === 'office_handler' && !formData.office) {
      newErrors.office = "Office selection is required for office handlers";
    }

    // Complainant type validation for complainants
    if (formData.role === 'complainant' && !formData.complainantType) {
      newErrors.complainantType = "Please select your type (Student, Parents, or Staff)";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      // Password strength requirements
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one uppercase letter";
      }
      if (!/[a-z]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one lowercase letter";
      }
      if (!/\d/.test(formData.password)) {
        newErrors.password = "Password must contain at least one number";
      }
      if (!Array.from(formData.password).some((char) => '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?'.includes(char))) {
        newErrors.password = "Password must contain at least one special character";
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignUp = (googleData) => {
    // Pre-fill the form with Google data
    setFormData(prev => ({
      ...prev,
      email: googleData.email,
      fullName: googleData.fullName,
      role: 'complainant', // Auto-set to complainant for Google sign-up
    }));

    // Show success message
    Swal.fire({
      icon: 'success',
      title: 'Great!',
      text: 'Please select your type below and create your account',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recaptchaToken) {
      setErrors(prev => ({
        ...prev,
        recaptcha: "Please verify that you are not a robot"
      }));
      return;
    }
    if (validateForm()) {
      setIsLoading(true);
      setErrors({});

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          office: formData.office || null,
          complainantType: formData.complainantType || null,
          recaptchaToken: recaptchaToken,
        });

        if (response.data.success) {
          // Store token and user data (ensure isVerified is present)
          const userWithVerified = {
            ...response.data.user,
            isVerified: response.data.user.isVerified === true // fallback to false if missing
          };
          authService.setToken(response.data.token);
          authService.setUser(userWithVerified);

          if (formData.role === 'complainant') {
            Swal.fire({
              icon: 'success',
              title: 'Account Created!',
              text: 'Your account has been created successfully. Redirecting...',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              navigate('/complainant');
            });
          } else if (formData.role === 'office_handler') {
            Swal.fire({
              icon: 'info',
              title: 'Account Pending Verification',
              html: '<div style="text-align:left">Your office handler account has been created and is pending verification by the superadmin.<br><br>You will receive an email once your account is approved or rejected.</div>',
              confirmButtonText: 'OK',
              allowOutsideClick: false
            });
            // Optionally, you can redirect to login or stay on the signup page
          }
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Signup failed';
        setErrors({ general: errorMessage });

        Swal.fire({
          icon: 'error',
          title: 'Signup Failed',
          text: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-600">Join our grievance management system</p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
          <p className="text-sm text-blue-800 font-medium">📋 Role Information:</p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• <strong>Complainant</strong>: File complaints and track progress</li>
            <li>• <strong>Office Handler</strong>: Review and process complaints</li>
            <li className="text-orange-600">• Administrator accounts are created by system admins</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Full Name
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
              errors.fullName 
                ? "border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:ring-blue-500"
            } text-gray-900 placeholder-gray-500`}
            placeholder="Enter your full name"
          />
          {errors.fullName && (
            <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
              errors.email 
                ? "border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:ring-blue-500"
            } text-gray-900 placeholder-gray-500`}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
              errors.role 
                ? "border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:ring-blue-500"
            } text-gray-900 bg-white`}
          >
            <option value="">Select your role</option>
            <option value="complainant">Complainant</option>
            <option value="office_handler">Office Handler</option>
          </select>
          {errors.role && (
            <p className="text-red-500 text-xs mt-1">{errors.role}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Note: Administrator accounts are created by system admins only
          </p>
        </div>

        {/* Complainant Type Selection - shown only for complainants */}
        {formData.role === 'complainant' && (
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Your Type
            </label>
            <select
              name="complainantType"
              value={formData.complainantType}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
                errors.complainantType 
                  ? "border-red-500 focus:ring-red-500" 
                  : "border-gray-300 focus:ring-blue-500"
              } text-gray-900 bg-white`}
            >
              <option value="">Select your type</option>
              <option value="student">Student</option>
              <option value="parents">Parents</option>
              <option value="staff">Staff</option>
            </select>
            {errors.complainantType && (
              <p className="text-red-500 text-xs mt-1">{errors.complainantType}</p>
            )}
          </div>
        )}

        {/* Office Selection - shown only for office handlers */}
        {formData.role === 'office_handler' && (
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Office/Department
            </label>
            <select
              name="office"
              value={formData.office}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
                errors.office 
                  ? "border-red-500 focus:ring-red-500" 
                  : "border-gray-300 focus:ring-blue-500"
              } text-gray-900 bg-white`}
            >
              <option value="">Select your office/department</option>
              {officeCategories.map((office) => (
                <option key={office.id} value={office.id}>{office.name}</option>
              ))}
            </select>
            {errors.office && (
              <p className="text-red-500 text-xs mt-1">{errors.office}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Select the office where you'll be filing complaints
            </p>
          </div>
        )}

        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
              errors.password 
                ? "border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:ring-blue-500"
            } text-gray-900 placeholder-gray-500`}
            placeholder="Create a strong password"
          />
          <PasswordStrengthIndicator password={formData.password} />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
              errors.confirmPassword 
                ? "border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:ring-blue-500"
            } text-gray-900 placeholder-gray-500`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="flex justify-center my-4">
          <ReCAPTCHA
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={(token) => setRecaptchaToken(token)}
          />
        </div>
        {errors.recaptcha && (
          <p className="text-red-500 text-xs text-center">{errors.recaptcha}</p>
        )}
        {errors.general && (
          <p className="text-red-500 text-xs text-center">{errors.general}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition duration-300 shadow-lg hover:shadow-blue-500/30 focus:ring-4 focus:ring-blue-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            </div>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="text-center pt-4">
        <p className="text-gray-600 text-sm">
          Already have an account?{' '}
          <button 
            type="button"
            className="text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('switchToLogin'))}
          >
            Sign In
          </button>
        </p>
      </div>

      <div className="relative pt-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or sign up with</span>
        </div>
      </div>

      <GoogleSignUpButton onGoogleSignUp={handleGoogleSignUp} buttonText="Sign up with Google" context="signup" />
    </div>
  );
}

export default SignupForm;
