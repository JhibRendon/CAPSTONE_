const STORAGE_KEY = 'office_system_preferences';

const DEFAULTS = {
  defaultTab: 'dashboard',
  notificationRefreshSeconds: 30,
  dashboardRefreshSeconds: 60,
  queuePageSize: 10,
  soundAlerts: false,
};

export const getOfficePreferences = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { ...DEFAULTS };
  }

  try {
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to parse office preferences:', error);
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULTS };
  }
};

export const saveOfficePreferences = (preferences) => {
  const nextPreferences = { ...DEFAULTS, ...preferences };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
  return nextPreferences;
};

export const OFFICE_PREFERENCE_DEFAULTS = DEFAULTS;
