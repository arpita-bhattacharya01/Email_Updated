// src/context/AdminAuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import axios from 'axios';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
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

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] =
    useState<boolean>(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiClient.get('/api/auth/admin/me');
        if (res.data?.user?.role === 'admin') {
          setAdminUser(res.data.user);
          setIsAdminAuthenticated(true);
        }
      } catch (err: any) {
        console.warn('🔐 Session check failed:', err?.response?.data || err);
        setAdminUser(null);
        setIsAdminAuthenticated(false);
      }
    };
    checkSession();
  }, []);

  const signin = async (
    email: string,
    password: string
  ): Promise<SigninResponse | { success: false; message: string }> => {
    try {
      const res = await axios.post(
        API_URL + '/api/auth/admin/signin',
        { email, password },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const { success, message, redirectTo, user } = res.data;

      if (success && user?.role === 'admin') {
        setAdminUser(user);
        setIsAdminAuthenticated(true);
        return {
          success: true,
          message,
          redirectTo: redirectTo || '/admin/dashboard',
          user,
        };
      } else {
        return {
          success: false,
          message: message || 'Not authorized as admin',
        };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/admin/logout');
    } catch {
      // no-op
    } finally {
      setAdminUser(null);
      setIsAdminAuthenticated(false);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{ isAdminAuthenticated, adminUser, signin, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthProvider;
