import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface AdminUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin';
}

interface SigninResponse {
  success: boolean;
  message: string;
  redirectTo: string;
  user: AdminUser;
}

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  signin: (
    email: string,
    password: string
  ) => Promise<SigninResponse | { success: false; message: string }>;
  logout: () => Promise<void>;
}

// Create Context
const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

// Axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Admin Provider
export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Session check only on /admin routes
  useEffect(() => {
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    if (!isAdminRoute) return;

    const checkSession = async () => {
      try {
        const res = await apiClient.get('/api/auth/admin/me');
        if (res.data?.user?.role === 'admin') {
          setAdminUser(res.data.user);
          setIsAdminAuthenticated(true);
        }
      } catch (err: any) {
        setAdminUser(null);
        setIsAdminAuthenticated(false);
        console.warn('🔐 Admin session invalid:', err?.response?.data || err.message);
      }
    };

    checkSession();
  }, []);

  // Admin signin
  const signin = async (
    email: string,
    password: string
  ): Promise<SigninResponse | { success: false; message: string }> => {
    try {
      const res = await apiClient.post('/api/auth/admin/signin', { email, password });
      const { success, message, redirectTo, user, token } = res.data;

      if (success && user?.role === 'admin') {
        localStorage.setItem('adminToken', token);
        setAdminUser(user);
        setIsAdminAuthenticated(true);
        toast.success('Admin login successful');
        return {
          success: true,
          message,
          redirectTo: redirectTo || '/admin/dashboard',
          user,
        };
      } else {
        return {
          success: false,
          message: message || 'Unauthorized',
        };
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // Admin logout
  const logout = async () => {
    try {
      await apiClient.post('/api/auth/admin/logout');
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('adminToken');
      setAdminUser(null);
      setIsAdminAuthenticated(false);
      toast.success('Admin logged out');
      navigate('/admin/signin');
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, adminUser, signin, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// Hook
export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export default AdminAuthProvider;
