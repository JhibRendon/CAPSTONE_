import React, { useState, useEffect } from 'react';
import axios from 'axios';
import authService from '../../../services/authService';
import API_BASE_URL from '../../../config/api';

const OfficesModule = () => {
  const [activeView, setActiveView] = useState('pending');
  const [pendingHandlers, setPendingHandlers] = useState([]);
  const [verifiedHandlers, setVerifiedHandlers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [verifyModal, setVerifyModal] = useState({ open: false, handler: null });
  const [rejectModal, setRejectModal] = useState({ open: false, handler: null, reason: '' });
  const [editModal, setEditModal] = useState({ open: false, handler: null, office: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, handler: null });
  const [editCategoryModal, setEditCategoryModal] = useState({ open: false, category: null, name: '' });
  const [deleteCategoryModal, setDeleteCategoryModal] = useState({ open: false, category: null });
  const [addCategoryModal, setAddCategoryModal] = useState({ open: false, name: '' });
  const [modalLoading, setModalLoading] = useState(false);

  // Pending handlers search & filter state
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingOfficeFilter, setPendingOfficeFilter] = useState('');
  const [pendingSortBy, setPendingSortBy] = useState('createdAt');
  const [pendingSortOrder, setPendingSortOrder] = useState('desc');

  // Verified handlers search & filter state
  const [verifiedSearch, setVerifiedSearch] = useState('');
  const [verifiedOfficeFilter, setVerifiedOfficeFilter] = useState('');
  const [verifiedSortBy, setVerifiedSortBy] = useState('createdAt');
  const [verifiedSortOrder, setVerifiedSortOrder] = useState('desc');

  // Filtered & sorted pending handlers
  const filteredPendingHandlers = pendingHandlers
    .filter((h) => {
      const matchesSearch =
        !pendingSearch ||
        h.name?.toLowerCase().includes(pendingSearch.toLowerCase()) ||
        h.email?.toLowerCase().includes(pendingSearch.toLowerCase());
      const matchesOffice =
        !pendingOfficeFilter || h.office === pendingOfficeFilter;
      return matchesSearch && matchesOffice;
    })
    .sort((a, b) => {
      let valA, valB;
      if (pendingSortBy === 'name') {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      } else if (pendingSortBy === 'email') {
        valA = a.email?.toLowerCase() || '';
        valB = b.email?.toLowerCase() || '';
      } else if (pendingSortBy === 'office') {
        valA = a.office?.toLowerCase() || '';
        valB = b.office?.toLowerCase() || '';
      } else {
        valA = new Date(a[pendingSortBy] || 0).getTime();
        valB = new Date(b[pendingSortBy] || 0).getTime();
      }
      if (valA < valB) return pendingSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return pendingSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Get unique offices from pending handlers for filter dropdown
  const uniquePendingOffices = [...new Set(pendingHandlers.map((h) => h.office).filter(Boolean))];

  // Filtered & sorted verified handlers
  const filteredVerifiedHandlers = verifiedHandlers
    .filter((h) => {
      const matchesSearch =
        !verifiedSearch ||
        h.name?.toLowerCase().includes(verifiedSearch.toLowerCase()) ||
        h.email?.toLowerCase().includes(verifiedSearch.toLowerCase());
      const matchesOffice =
        !verifiedOfficeFilter || h.office === verifiedOfficeFilter;
      return matchesSearch && matchesOffice;
    })
    .sort((a, b) => {
      let valA, valB;
      if (verifiedSortBy === 'name') {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      } else if (verifiedSortBy === 'email') {
        valA = a.email?.toLowerCase() || '';
        valB = b.email?.toLowerCase() || '';
      } else if (verifiedSortBy === 'office') {
        valA = a.office?.toLowerCase() || '';
        valB = b.office?.toLowerCase() || '';
      } else {
        valA = new Date(a[verifiedSortBy] || 0).getTime();
        valB = new Date(b[verifiedSortBy] || 0).getTime();
      }
      if (valA < valB) return verifiedSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return verifiedSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Get unique offices from verified handlers for filter dropdown
  const uniqueOffices = [...new Set(verifiedHandlers.map((h) => h.office).filter(Boolean))];

  // Categories search & sort state
  const [categorySearch, setCategorySearch] = useState('');
  const [categorySortBy, setCategorySortBy] = useState('createdAt');
  const [categorySortOrder, setCategorySortOrder] = useState('desc');

  // Filtered & sorted categories
  const filteredCategories = categories
    .filter((c) => {
      return (
        !categorySearch ||
        c.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
        c.slug?.toLowerCase().includes(categorySearch.toLowerCase())
      );
    })
    .sort((a, b) => {
      let valA, valB;
      if (categorySortBy === 'name') {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      } else {
        valA = new Date(a[categorySortBy] || 0).getTime();
        valB = new Date(b[categorySortBy] || 0).getTime();
      }
      if (valA < valB) return categorySortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return categorySortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Fetch pending handlers
  const fetchPendingHandlers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/offices/handlers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const pending = response.data.pending || response.data.data?.pending || [];
      setPendingHandlers(pending);
    } catch (error) {
      console.error('Fetch pending handlers error:', error);
      setError('Failed to fetch pending handlers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch verified handlers
  const fetchVerifiedHandlers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/offices/handlers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const verified = response.data.verified || response.data.data?.verified || [];
      setVerifiedHandlers(verified);
    } catch (error) {
      console.error('Fetch verified handlers error:', error);
      setError('Failed to fetch verified handlers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/offices/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCategories(response.data.categories || response.data.data || []);
    } catch (error) {
      console.error('Fetch categories error:', error);
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // Verify handler
  const verifyHandler = async (handlerId) => {
    try {
      setModalLoading(true);
      const token = authService.getToken();
      const response = await axios.put(
        `${API_BASE_URL}/offices/handlers/${handlerId}/verify`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Handler verified successfully. A verification email has been sent.');
        setVerifyModal({ open: false, handler: null });
        await fetchPendingHandlers();
        await fetchVerifiedHandlers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Verify handler error:', error);
      setError('Failed to verify handler');
      setTimeout(() => setError(''), 3000);
    } finally {
      setModalLoading(false);
    }
  };

  // Reject handler
  const rejectHandler = async (handlerId, reason) => {
    if (!reason) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setModalLoading(true);
      const token = authService.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/offices/handlers/${handlerId}/reject`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Handler rejected successfully. A rejection email has been sent.');
        setRejectModal({ open: false, handler: null, reason: '' });
        await fetchPendingHandlers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Reject handler error:', error);
      setError('Failed to reject handler');
      setTimeout(() => setError(''), 3000);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete handler
  const deleteHandler = async (handlerId) => {
    setModalLoading(true);
    try {
      const token = authService.getToken();
      const response = await axios.delete(
        `${API_BASE_URL}/offices/handlers/${handlerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Handler deleted successfully');
        setDeleteModal({ open: false, handler: null });
        await fetchVerifiedHandlers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Delete handler error:', error);
      setError('Failed to delete handler');
      setTimeout(() => setError(''), 3000);
    } finally {
      setModalLoading(false);
    }
  };

  // Update handler office
  const updateHandlerOffice = async (handlerId, office) => {
    if (!office) {
      setError('Please select an office');
      return;
    }

    try {
      setModalLoading(true);
      const token = authService.getToken();
      const response = await axios.put(
        `${API_BASE_URL}/offices/handlers/${handlerId}`,
        { office },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Handler office re-assigned successfully');
        setEditModal({ open: false, handler: null, office: '' });
        await fetchVerifiedHandlers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Update handler office error:', error);
      setError('Failed to update handler office');
      setTimeout(() => setError(''), 3000);
    } finally {
      setModalLoading(false);
    }
  };

  // Create category
  const createCategory = async (name) => {
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const token = authService.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/offices/categories`,
        { name: name.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Category created successfully');
        await fetchCategories();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Create category error:', error);
      setError('Failed to create category');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update category
  const updateCategory = async (categoryId, name) => {
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const token = authService.getToken();
      const response = await axios.put(
        `${API_BASE_URL}/offices/categories/${categoryId}`,
        { name: name.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Category updated successfully');
        await fetchCategories();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Update category error:', error);
      setError('Failed to update category');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Delete category
  const deleteCategory = async (categoryId) => {
    setModalLoading(true);
    try {
      const token = authService.getToken();
      const response = await axios.delete(
        `${API_BASE_URL}/offices/categories/${categoryId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Category deleted successfully');
        setDeleteCategoryModal({ open: false, category: null });
        await fetchCategories();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Delete category error:', error);
      setError('Failed to delete category');
      setTimeout(() => setError(''), 3000);
    } finally {
      setModalLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      console.log('🏢 OfficesModule: Initializing data for view:', activeView);
      setLoading(true);
      setError('');
      try {
        if (activeView === 'pending') {
          await fetchPendingHandlers();
        } else if (activeView === 'verified') {
          await fetchVerifiedHandlers();
          await fetchCategories();
        } else if (activeView === 'categories') {
          await fetchCategories();
        }
      } catch (error) {
        console.error('🏢 OfficesModule: Error initializing data:', error);
      }
    };

    initializeData();
  }, [activeView]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatOfficeName = (slug) => {
    if (!slug) return 'Not specified';
    return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-white font-heading-md">Office Management</h2>
              <p className="text-white/80 font-body-sm">Manage office handlers and categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mx-8 mt-6 p-4 rounded-xl border bg-red-50 border-red-200 text-red-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mx-8 mt-4 p-4 rounded-xl border bg-green-50 border-green-200 text-green-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-8 mt-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'pending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </button>
          
          <button
            onClick={() => setActiveView('verified')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'verified'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verified
          </button>
          
          <button
            onClick={() => setActiveView('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'categories'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Categories
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <>
            {/* Pending Handlers View */}
            {activeView === 'pending' && (
              <div className="space-y-6">
                {/* Search & Filters */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={pendingSearch}
                          onChange={(e) => setPendingSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Office Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Office</label>
                      <select
                        value={pendingOfficeFilter}
                        onChange={(e) => setPendingOfficeFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">All Offices</option>
                        {uniquePendingOffices.map((office) => (
                          <option key={office} value={office}>
                            {formatOfficeName(office)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={pendingSortBy}
                        onChange={(e) => setPendingSortBy(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="createdAt">Date Applied</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="office">Office</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                      <select
                        value={pendingSortOrder}
                        onChange={(e) => setPendingSortOrder(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Office Handlers</h3>
                  <div className="text-sm text-gray-500">
                    {filteredPendingHandlers.length} of {pendingHandlers.length} {pendingHandlers.length === 1 ? 'handler' : 'handlers'}
                  </div>
                </div>
                
                {filteredPendingHandlers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">
                      {pendingHandlers.length === 0 ? 'No pending handlers' : 'No handlers match your filters'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {pendingHandlers.length === 0 ? 'New office handler requests will appear here' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Handler Information
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Office
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Applied Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredPendingHandlers.map((handler) => (
                            <tr key={handler._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                                      <span className="text-white font-medium">
                                        {handler.name?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4 text-left">
                                    <div className="text-sm font-medium text-gray-900">{handler.name}</div>
                                    <div className="text-sm text-gray-500">{handler.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="text-sm text-gray-700">{formatOfficeName(handler.office)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  <svg className="w-3 h-3 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Pending
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(handler.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setVerifyModal({ open: true, handler })}
                                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    title="Verify handler"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setRejectModal({ open: true, handler, reason: '' })}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Reject handler"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verified Handlers View */}
            {activeView === 'verified' && (
              <div className="space-y-6">
                {/* Search & Filters */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={verifiedSearch}
                          onChange={(e) => setVerifiedSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Office Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Office</label>
                      <select
                        value={verifiedOfficeFilter}
                        onChange={(e) => setVerifiedOfficeFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">All Offices</option>
                        {uniqueOffices.map((office) => (
                          <option key={office} value={office}>
                            {formatOfficeName(office)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={verifiedSortBy}
                        onChange={(e) => setVerifiedSortBy(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="createdAt">Date Joined</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="office">Office</option>
                        <option value="lastLogin">Last Login</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                      <select
                        value={verifiedSortOrder}
                        onChange={(e) => setVerifiedSortOrder(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Verified Office Handlers</h3>
                  <div className="text-sm text-gray-500">
                    {filteredVerifiedHandlers.length} of {verifiedHandlers.length} {verifiedHandlers.length === 1 ? 'handler' : 'handlers'}
                  </div>
                </div>
                
                {filteredVerifiedHandlers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">
                      {verifiedHandlers.length === 0 ? 'No verified handlers' : 'No handlers match your filters'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {verifiedHandlers.length === 0 ? 'Verified office handlers will appear here' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Handler Information
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Office
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Login
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Verified Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredVerifiedHandlers.map((handler) => (
                            <tr key={handler._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                                      <span className="text-white font-medium">
                                        {handler.name?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4 text-left">
                                    <div className="text-sm font-medium text-gray-900">{handler.name}</div>
                                    <div className="text-sm text-gray-500">{handler.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="text-sm text-gray-700">{formatOfficeName(handler.office)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Verified
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(handler.lastLogin)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(handler.updatedAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEditModal({ open: true, handler, office: handler.office || '' })}
                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Edit office assignment"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDeleteModal({ open: true, handler })}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Delete handler"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Categories View */}
            {activeView === 'categories' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div>
                        <select
                          value={categorySortBy}
                          onChange={(e) => setCategorySortBy(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="createdAt">Sort by Date</option>
                          <option value="name">Sort by Name</option>
                        </select>
                      </div>
                      <div>
                        <select
                          value={categorySortOrder}
                          onChange={(e) => setCategorySortOrder(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="desc">Newest First</option>
                          <option value="asc">Oldest First</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results count and Add button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Office Categories</h3>
                    <div className="text-sm text-gray-500">
                      {filteredCategories.length} of {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                    </div>
                  </div>
                  <button
                    onClick={() => setAddCategoryModal({ open: true, name: '' })}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Add Category
                  </button>
                </div>
                
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                    </svg>
                    <p className="text-gray-500 font-medium">
                      {categories.length === 0 ? 'No categories' : 'No categories match your search'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {categories.length === 0 ? 'Create categories to organize office handlers' : 'Try adjusting your search'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Offices
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredCategories.map((category) => (
                            <tr key={category._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="ml-4 text-left">
                                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-500">{category.slug}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  category.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {category.status === 'active' ? (
                                    <svg className="w-3 h-3 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                  {category.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(category.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEditCategoryModal({ open: true, category, name: category.name })}
                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Edit category"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDeleteCategoryModal({ open: true, category })}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Delete category"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Verify Confirmation Modal */}
      {verifyModal.open && verifyModal.handler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setVerifyModal({ open: false, handler: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Verify Office Handler</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to verify this office handler? A verification email will be sent to their email address.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {verifyModal.handler.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{verifyModal.handler.name}</p>
                    <p className="text-sm text-gray-500">{verifyModal.handler.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Office: {formatOfficeName(verifyModal.handler.office)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setVerifyModal({ open: false, handler: null })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => verifyHandler(verifyModal.handler._id)}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Verify Handler
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && rejectModal.handler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setRejectModal({ open: false, handler: null, reason: '' })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Reject Office Handler</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                You are about to reject this office handler's application. Please provide a reason for the rejection. The handler will be notified via email.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {rejectModal.handler.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{rejectModal.handler.name}</p>
                    <p className="text-sm text-gray-500">{rejectModal.handler.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Office: {formatOfficeName(rejectModal.handler.office)}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please describe why this application is being rejected..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                />
                {rejectModal.reason.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">A reason is required to reject a handler</p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setRejectModal({ open: false, handler: null, reason: '' })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectHandler(rejectModal.handler._id, rejectModal.reason)}
                  disabled={modalLoading || !rejectModal.reason.trim()}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject Handler
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Office Modal */}
      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.handler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setDeleteModal({ open: false, handler: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Office Handler</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this office handler? This action cannot be undone.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {deleteModal.handler.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{deleteModal.handler.name}</p>
                    <p className="text-sm text-gray-500">{deleteModal.handler.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Office: {formatOfficeName(deleteModal.handler.office)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModal({ open: false, handler: null })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteHandler(deleteModal.handler._id)}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Handler
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal.open && editModal.handler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setEditModal({ open: false, handler: null, office: '' })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Re-assign Office</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Re-assign this office handler to a different office category.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {editModal.handler.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{editModal.handler.name}</p>
                    <p className="text-sm text-gray-500">{editModal.handler.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Current Office: {formatOfficeName(editModal.handler.office)}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Office Assignment <span className="text-red-500">*</span>
                </label>
                <select
                  value={editModal.office}
                  onChange={(e) => setEditModal(prev => ({ ...prev, office: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select an office...</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditModal({ open: false, handler: null, office: '' })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateHandlerOffice(editModal.handler._id, editModal.office)}
                  disabled={modalLoading || !editModal.office || editModal.office === editModal.handler.office}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCategoryModal.open && editCategoryModal.category && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setEditCategoryModal({ open: false, category: null, name: '' })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Edit Category</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">Update the name for this office category.</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{editCategoryModal.category.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  <span>{editCategoryModal.category.slug}</span>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editCategoryModal.name}
                  onChange={(e) => setEditCategoryModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter category name"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditCategoryModal({ open: false, category: null, name: '' })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setModalLoading(true);
                    await updateCategory(editCategoryModal.category._id, editCategoryModal.name);
                    setEditCategoryModal({ open: false, category: null, name: '' });
                    setModalLoading(false);
                  }}
                  disabled={modalLoading || !editCategoryModal.name.trim() || editCategoryModal.name === editCategoryModal.category.name}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteCategoryModal.open && deleteCategoryModal.category && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setDeleteCategoryModal({ open: false, category: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Category</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{deleteCategoryModal.category.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  <span>{deleteCategoryModal.category.slug}</span>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteCategoryModal({ open: false, category: null })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteCategory(deleteCategoryModal.category._id)}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Category
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {addCategoryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !modalLoading && setAddCategoryModal({ open: false, name: '' })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Add New Category</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">Create a new office category to organize office handlers.</p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addCategoryModal.name}
                  onChange={(e) => setAddCategoryModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  placeholder="Enter category name"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAddCategoryModal({ open: false, name: '' })}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setModalLoading(true);
                    await createCategory(addCategoryModal.name);
                    setAddCategoryModal({ open: false, name: '' });
                    setModalLoading(false);
                  }}
                  disabled={modalLoading || !addCategoryModal.name.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Category
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficesModule;
