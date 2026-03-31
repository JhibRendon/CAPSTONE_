import { axiosInstance } from './authService';

const adminService = {
  // =====================================================
  // ADMIN USERS MANAGEMENT
  // =====================================================
  
  // Get all admin users
  getAdminUsers: async () => {
    try {
      console.log('Fetching admin users...');
      const response = await axiosInstance.get('/admin/users');
      console.log('Admin users fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get admins error:', error.response?.data || error.message);
      return error.response?.data || {
        success: false,
        message: error.message || 'Network error'
      };
    }
  },

  // Create new admin user
  createAdminUser: async (name, email, password) => {
    try {
      console.log('Creating admin user:', { name, email });
      const response = await axiosInstance.post('/admin/users', {
        name,
        email,
        password
      });
      console.log('Admin user created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Admin creation error:', error.response?.data || error.message);
      return error.response?.data || {
        success: false,
        message: error.message || 'Network error'
      };
    }
  },

  // Update admin user
  updateAdminUser: async (adminId, name, password = null) => {
    try {
      const payload = { name };
      if (password) {
        payload.password = password;
      }
      const response = await axiosInstance.put(`/admin/users/${adminId}`, payload);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  },

  // Delete admin user
  deleteAdminUser: async (adminId) => {
    try {
      const response = await axiosInstance.delete(`/admin/users/${adminId}`);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  },

  // =====================================================
  // SYSTEM SETTINGS
  // =====================================================

  // Get system settings
  getSystemSettings: async () => {
    try {
      const response = await axiosInstance.get('/admin/settings');
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  },

  // Update system settings
  updateSystemSettings: async (settings) => {
    try {
      const response = await axiosInstance.post('/admin/settings', settings);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  },

  // =====================================================
  // AUDIT LOGS
  // =====================================================

  // Get audit logs
  getAuditLogs: async ({ type = '', startDate = '', endDate = '', limit = 20, skip = 0 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', String(limit));
      params.append('skip', String(skip));

      const response = await axiosInstance.get(`/admin/audit-logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  },

  // Get audit logs statistics
  getAuditLogsStats: async ({ type = '', startDate = '', endDate = '' } = {}) => {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const query = params.toString();
      const response = await axiosInstance.get(`/admin/audit-logs/stats${query ? `?${query}` : ''}`);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  },

  // Export audit logs
  exportAuditLogs: async ({ type = '', startDate = '', endDate = '' } = {}) => {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const query = params.toString();
      const response = await axiosInstance.get(`/admin/audit-logs/export${query ? `?${query}` : ''}`);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        success: false,
        message: 'Network error'
      };
    }
  }
};

export default adminService;
