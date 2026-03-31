import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [state, setState] = useState({
    loading: true,
    user: null,
    authenticated: false,
  });

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      const token = authService.getToken();
      if (!token) {
        if (isMounted) {
          setState({ loading: false, user: null, authenticated: false });
        }
        return;
      }

      let user = authService.getUser();
      if (!user) {
        user = await authService.hydrateUser();
      }

      if (!isMounted) {
        return;
      }

      if (!user) {
        setState({ loading: false, user: null, authenticated: false });
        return;
      }

      setState({ loading: false, user, authenticated: true });
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!state.authenticated || !state.user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(state.user.role)) {
    return <Navigate to="/auth" replace />;
  }

  if (state.user.role === 'office_handler' && state.user.isVerified === false) {
    return <Navigate to="/pending-verification" replace />;
  }

  return children;
};

export default ProtectedRoute;
