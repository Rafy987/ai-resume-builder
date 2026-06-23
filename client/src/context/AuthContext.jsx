import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [hydrated, setHydrated] = useState(false); // true once the startup check finishes

  // ── On mount: if a token exists in localStorage, fetch the current user ──
  // This keeps the user logged in after a page refresh.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setHydrated(true);
      return;
    }
    api.get('/auth/me')
      .then(res => {
        // ApiResponse shape: { data: <user>, message, success, statusCode }
        setUser(res.data.data ?? res.data);
      })
      .catch(() => {
        // Token is invalid or expired — clear it so api.js interceptor
        // doesn't keep sending a bad token
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setHydrated(true));
  }, []);

  const value = { user, setUser, hydrated };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
