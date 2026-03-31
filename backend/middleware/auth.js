const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSystemSettingsSnapshot } = require('../utils/systemSettings');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database (source of truth)
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive or blocked'
      });
    }

    // Check if office handler is verified/approved by admin
    if (user.role === 'office_handler' && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending verification by an administrator. Please wait for approval.'
      });
    }

    const settings = await getSystemSettingsSnapshot();
    if (settings.maintenanceMode && !['admin', 'superadmin'].includes(user.role)) {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: 'The system is temporarily unavailable for maintenance. Please try again later.',
      });
    }

    // Attach user object to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based Authorization Middleware
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user role from database (source of truth)
    const userRole = req.user.role;

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}`
      });
    }

    // User has required role, proceed
    next();
  };
};

// Specific role middleware helpers
const isAdmin = checkRole('admin');
const isComplainant = checkRole('complainant');
const isOfficeHandler = checkRole('office_handler');
const isAdminOrOffice = checkRole('admin', 'office_handler');

module.exports = {
  authenticateToken,
  checkRole,
  isAdmin,
  isComplainant,
  isOfficeHandler,
  isAdminOrOffice
};
