const normalizeBaseUrl = (url) => (url || '').replace(/\/+$/, '');

const BACKEND_URL = normalizeBaseUrl(
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
);

const API_BASE_URL = `${BACKEND_URL}/api`;

export { BACKEND_URL, API_BASE_URL };
export default API_BASE_URL;
