import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT on every outgoing request ─────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 gracefully ───────────────────────────
// If the server returns 401 (missing / expired / invalid token), clear the
// stored token and redirect to /login so the user can re-authenticate.
// This prevents a broken half-authenticated state where the token exists in
// localStorage but is no longer accepted by the server.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear + redirect if this wasn't itself an auth endpoint —
      // we don't want to redirect mid-login on a bad-credentials 401.
      const url = error.config?.url ?? '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        // Hard redirect so React state is also wiped cleanly
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
