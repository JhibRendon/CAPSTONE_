import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";

function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  // Listen for switch events from child components
  useEffect(() => {
    const handleSwitchToLogin = () => {
      setIsLogin(true);
      setShowSignup(false);
    };

    const handleSwitchToSignup = () => {
      setIsLogin(false);
      setShowSignup(true);
    };

    window.addEventListener('switchToLogin', handleSwitchToLogin);
    window.addEventListener('switchToSignup', handleSwitchToSignup);
    
    return () => {
      window.removeEventListener('switchToLogin', handleSwitchToLogin);
      window.removeEventListener('switchToSignup', handleSwitchToSignup);
    };
  }, []);

  const toggleView = () => {
    setIsLogin(!isLogin);
    setShowSignup(!showSignup);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Right Side - Full White Background (appears first on mobile) */}
      <div className="w-full lg:w-1/2 bg-white order-1 lg:order-2">
        <div className="min-h-screen flex flex-col">
          {/* Header - Compact */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label="Back to welcome page"
                title="Back to welcome page"
                className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
            </div>
            <h1 className="text-xl font-bold text-center text-gray-900">Welcome Back</h1>
          </div>

          {/* Toggle Switch - Compact */}
          <div className="p-6">
            <div className="flex bg-gray-100 rounded-full p-1 mb-6">
              <button
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isLogin
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => {
                  setIsLogin(true);
                  setShowSignup(false);
                }}
              >
                Sign In
              </button>
              <button
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  !isLogin
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={toggleView}
              >
                Sign Up
              </button>
            </div>

            {/* Form Content - Scrollable if needed */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {isLogin ? (
                <LoginForm />
              ) : (
                <SignupForm />
              )}
            </div>
          </div>

          {/* Footer - Compact */}
          <div className="mt-auto p-4 text-center border-t border-gray-200">
            <p className="text-gray-600 text-xs">
              © {new Date().getFullYear()} I-Serve Grievance Chatbot
            </p>
          </div>
        </div>
      </div>

      {/* Left Side - Full Navy Blue Background (appears second on mobile) */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-slate-800 to-blue-900 order-2 lg:order-1">
        <div className="min-h-screen flex flex-col justify-center p-6">
          {/* Animated SVG Illustration - Larger Focus on Document Icon */}
          <div className="relative h-80 mb-6">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-20 h-20 bg-blue-500/20 rounded-full animate-ping"></div>
              <div className="absolute bottom-10 right-10 w-16 h-16 bg-cyan-500/20 rounded-full animate-pulse"></div>
              <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-purple-500/10 rounded-full animate-bounce"></div>
            </div>
            
            {/* Main Illustration - Larger Document Icon Focus */}
            <div className="relative z-10 flex items-center justify-center h-full">
              {/* Document Icon - Much Larger */}
              <div className="relative">
                <div className="w-40 h-52 bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 flex flex-col items-center justify-center p-8 transform hover:scale-105 transition-transform duration-300 shadow-2xl">
                  <svg className="w-24 h-24 text-white mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-white text-lg font-bold text-center">Grievance</div>
                  <div className="text-white/80 text-sm text-center mt-1">Management</div>
                </div>
                
                {/* Floating Elements - Larger */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Connecting Lines - Longer */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-32 h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            {/* Animated Particles - Strategic Placement */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-white/30 rounded-full animate-float"
                  style={{
                    left: `${15 + i * 12}%`,
                    top: `${25 + (i % 4) * 15}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + i}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
