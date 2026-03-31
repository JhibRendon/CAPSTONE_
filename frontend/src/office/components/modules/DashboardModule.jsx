import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../services/authService';
import { getOfficePreferences } from '../../utils/preferences';

const formatStatus = (value) => String(value || '').replaceAll('_', ' ');

const statusClasses = {
  pending: 'bg-amber-100 text-amber-800',
  under_review: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  escalated: 'bg-purple-100 text-purple-800',
};

export const DashboardModule = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState(() => getOfficePreferences());

  useEffect(() => {
    const handlePreferencesUpdated = (event) => {
      if (event.detail) {
        setPreferences(event.detail);
      }
    };

    window.addEventListener('office-system-settings-updated', handlePreferencesUpdated);
    return () => window.removeEventListener('office-system-settings-updated', handlePreferencesUpdated);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async (isBackgroundRefresh = false) => {
      try {
        if (!isBackgroundRefresh && isMounted) {
          setLoading(true);
        }

        const response = await axiosInstance.get('/offices/grievances/dashboard');
        if (response.data?.success) {
          if (isMounted) {
            setDashboard(response.data.data);
            setError('');
          }
        } else if (isMounted) {
          setError('Unable to load dashboard data.');
        }
      } catch (fetchError) {
        console.error('Failed to fetch office dashboard:', fetchError);
        if (isMounted) {
          setError(fetchError.response?.data?.message || 'Failed to load dashboard data.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    const refreshSeconds = Number(preferences.dashboardRefreshSeconds || 0);
    const interval = refreshSeconds > 0
      ? setInterval(() => fetchDashboard(true), refreshSeconds * 1000)
      : null;

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [preferences.dashboardRefreshSeconds]);

  const summary = dashboard?.summary || {
    total: 0,
    pending: 0,
    inProgress: 0,
    escalated: 0,
    resolvedToday: 0,
    resolvedThisWeek: 0,
    resolvedTotal: 0,
    avgResolutionDays: 0,
  };

  const recentGrievances = dashboard?.recentGrievances || [];

  const cards = [
    {
      title: 'Pending Grievances',
      value: summary.pending,
      note: `${summary.total} assigned overall`,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      ),
    },
    {
      title: 'Resolved Today',
      value: summary.resolvedToday,
      note: `${summary.resolvedThisWeek} resolved this week`,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      title: 'In Progress',
      value: summary.inProgress,
      note: `${summary.escalated} escalated for attention`,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      ),
    },
    {
      title: 'Avg. Resolution Time',
      value: summary.avgResolutionDays,
      note: `${summary.resolvedTotal} resolved overall`,
      suffix: 'days',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-900">Office Dashboard</h1>
            <p className="text-gray-600">Live grievance activity assigned to your office account</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? '--' : card.value}
                  {card.suffix ? <span className="ml-2 text-base font-semibold text-gray-500">{card.suffix}</span> : null}
                </p>
                <p className="text-sm text-gray-500 mt-1">{loading ? 'Loading...' : card.note}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                <svg className={`w-6 h-6 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {card.icon}
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Grievances</h3>
            <button
              type="button"
              onClick={() => onNavigate?.('grievances')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Open queue
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-xl border border-gray-200 bg-gray-50 p-4 animate-pulse h-20"></div>
              ))}
            </div>
          ) : recentGrievances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-base font-semibold text-gray-900">No assigned grievances yet</p>
              <p className="mt-2 text-sm text-gray-500">Recent case activity will appear here once grievances are assigned.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentGrievances.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {item.subject} #{item.referenceNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.relativeTime}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusClasses[item.status] || 'bg-gray-100 text-gray-700'}`}>
                    {formatStatus(item.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Review Queue',
                hint: 'Open assigned cases',
                bg: 'bg-blue-50 hover:bg-blue-100',
                iconBg: 'bg-blue-500',
                tab: 'grievances',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
              },
              {
                label: 'Analytics',
                hint: 'View trends',
                bg: 'bg-green-50 hover:bg-green-100',
                iconBg: 'bg-green-500',
                tab: 'analytics',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1021 12h-9V3.055z" />,
              },
              {
                label: 'Reports',
                hint: 'Resolution metrics',
                bg: 'bg-purple-50 hover:bg-purple-100',
                iconBg: 'bg-purple-500',
                tab: 'resolution-reports',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
              },
              {
                label: 'Notifications',
                hint: 'Check updates',
                bg: 'bg-orange-50 hover:bg-orange-100',
                iconBg: 'bg-orange-500',
                tab: 'notifications',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
              },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate?.(action.tab)}
                className={`p-4 rounded-xl transition-colors duration-200 flex flex-col items-center ${action.bg}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${action.iconBg}`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {action.icon}
                  </svg>
                </div>
                <span className="font-medium text-gray-900">{action.label}</span>
                <span className="text-xs text-gray-600 mt-1">{action.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
