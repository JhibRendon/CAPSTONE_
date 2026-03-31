import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AdminUsersModule = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAdminUsers();
      if (response.success) {
        setAdmins(response.data || []);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to load admin users' });
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      setMessage({ type: 'error', text: 'Failed to load admin users' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!String(formData.name || '').trim()) {
      return 'Full name is required';
    }

    if (!editingAdmin) {
      if (!String(formData.email || '').trim()) {
        return 'Email address is required';
      }

      if (!emailRegex.test(formData.email)) {
        return 'Enter a valid email address';
      }
    }

    if (!editingAdmin || formData.password) {
      if (String(formData.password || '').length < 8) {
        return 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        return 'Passwords do not match';
      }
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      let response;
      if (editingAdmin) {
        response = await adminService.updateAdminUser(
          editingAdmin._id,
          String(formData.name).trim(),
          formData.password || undefined
        );
      } else {
        response = await adminService.createAdminUser(
          String(formData.name).trim(),
          String(formData.email).trim().toLowerCase(),
          formData.password
        );
      }

      if (response.success) {
        setMessage({ type: 'success', text: editingAdmin ? 'Admin updated successfully' : 'Admin created successfully' });
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setShowForm(false);
        setEditingAdmin(null);
        fetchAdmins();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to save admin' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save admin' });
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      confirmPassword: '',
    });
    setShowForm(true);
    setMessage({ type: '', text: '' });
  };

  const handleDelete = async (admin) => {
    if (admin.role === 'superadmin') {
      setMessage({ type: 'error', text: 'Superadmin accounts cannot be deleted.' });
      return;
    }

    if (!window.confirm(`Delete admin account for ${admin.email}?`)) {
      return;
    }

    try {
      const response = await adminService.deleteAdminUser(admin._id);

      if (response.success) {
        setMessage({ type: 'success', text: 'Admin deleted successfully' });
        fetchAdmins();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete admin' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete admin' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAdmin(null);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Users</h2>
          <p className="text-gray-600 mt-1">Manage admin user accounts and permissions</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingAdmin(null);
              setFormData({ name: '', email: '', password: '', confirmPassword: '' });
              setMessage({ type: '', text: '' });
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            + Create New Admin
          </button>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <p className="font-semibold">{message.type === 'success' ? 'Success' : 'Error'}</p>
          <p className="text-sm mt-1">{message.text}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingAdmin ? 'Edit Admin' : 'Create New Admin'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!!editingAdmin}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="admin@buksu.edu.ph"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingAdmin ? 'New Password (Optional)' : 'Password'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={editingAdmin ? 'Leave blank to keep current password' : 'Enter password (min 8 characters)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Confirm password"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
              >
                {editingAdmin ? 'Update Admin' : 'Create Admin'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {admins.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No admin users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{admin.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${admin.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(admin)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(admin)}
                        disabled={admin.role === 'superadmin'}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersModule;
