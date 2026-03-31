import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AdminLoginForm from "./AdminLoginForm";
import OfficeLoginForm from "./OfficeLoginForm";
import ComplainantLoginForm from "./ComplainantLoginForm";

function LoginForm() {
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState("");
  const [showRoleForm, setShowRoleForm] = useState(false);

  useEffect(() => {
    const role = new URLSearchParams(location.search).get('role') || "";
    const allowedRoles = new Set(['admin', 'office', 'complainant']);
    const nextRole = allowedRoles.has(role) ? role : "";

    setSelectedRole(nextRole);
    setShowRoleForm(Boolean(nextRole));
  }, [location.search]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleForm(true);
  };

  // If a specific role form is selected, show that form
  if (showRoleForm) {
    if (selectedRole === 'admin') return <AdminLoginForm />;
    if (selectedRole === 'office') return <OfficeLoginForm />;
    if (selectedRole === 'complainant') return <ComplainantLoginForm />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
        <p className="text-gray-600">Select your role to continue</p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">💡 Quick Guide:</p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• <strong>Administrator</strong>: System management and oversight</li>
            <li>• <strong>Complainant</strong>: Submit and track complaints</li>
            <li>• <strong>Office Handler</strong>: Process and manage complaints</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleRoleSelect('admin')}
          className={`w-full py-4 rounded-xl border-2 transition-all duration-300 ${
            selectedRole === 'admin'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
              : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.548-.99 3.19-.99 4.732 0 1.548.99 1.548 2.607 0 3.606-1.548 1.001-3.19 1.001-4.732 0-1.548-1.001-2.924-1.001-4.732 0-1.548-1.001-1.548-2.607 0-3.606a1.724 1.724 0 00-2.573-1.066z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-semibold text-lg">Administrator</span>
          </div>
        </button>

        <button
          onClick={() => handleRoleSelect('complainant')}
          className={`w-full py-4 rounded-xl border-2 transition-all duration-300 ${
            selectedRole === 'complainant'
              ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/30'
              : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-semibold text-lg">Complainant</span>
          </div>
        </button>

        <button
          onClick={() => handleRoleSelect('office')}
          className={`w-full py-4 rounded-xl border-2 transition-all duration-300 ${
            selectedRole === 'office'
              ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/30'
              : 'border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-semibold text-lg">Office Handler</span>
          </div>
        </button>
      </div>

      <div className="text-center pt-4">
        <p className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <button 
            className="text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('switchToSignup'))}
          >
            Contact Administrator
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
