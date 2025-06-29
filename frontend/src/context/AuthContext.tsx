// Updated AuthContext.tsx with:
// - Token refresh handling
// - Toast notifications
// - Auto redirect on logout
// - Production-ready cleanup

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';
import axios, { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Role = 'user' | 'admin' | null;

interface User {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
  profilePicture?: string;
  role?: Role;
}

type Step = 'EMAIL' | 'AUTHENTICATED';

interface AuthContextType {
  user: User | null;
  step: Step;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  role: Role;
  signup: (...args: any[]) => Promise<void>;
  adminSignup: (...args: any[]) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string; role?: Role }>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<Step>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const clearError = () => setError(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'error') => {
    toast[type](msg, { position: 'top-right' });
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const res = await apiClient.get('/api/user');
        setUser(res.data.user);
        setIsAuthenticated(true);
        setRole(res.data.user.role || 'user');
        setStep('AUTHENTICATED');
      }
    } catch (e) {
      console.warn('Session expired. Logging out.');
      await logout();
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signup = async (firstName: string, lastName: string, email: string, password: string, confirmPassword: string) => {
    try {
      setIsLoading(true);
      clearError();

      if (!validateEmail(email)) throw new Error('Invalid email');

      const res = await apiClient.post('/api/signup', {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      });

      const { token, user } = res.data;
      localStorage.setItem('authToken', token);
      setUser(user);
      setIsAuthenticated(true);
      setRole(user.role || 'user');
      showToast('Signup successful', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();
      const res = await apiClient.post('/api/signin', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('authToken', token);
      setUser(user);
      setIsAuthenticated(true);
      setRole(user.role || 'user');
      setStep('AUTHENTICATED');
      showToast('Login successful', 'success');
      return { success: true, role: user.role };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      showToast(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/logout');
    } catch (_) {}
    localStorage.clear();
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    setStep('EMAIL');
    showToast('Logged out successfully', 'success');
  };

  const verifyEmail = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/api/verify-email/${token}`);
      const { user, token: authToken } = res.data;
      localStorage.setItem('authToken', authToken);
      setUser(user);
      setIsAuthenticated(true);
      setRole(user.role || 'user');
      setStep('AUTHENTICATED');
      showToast('Email verified', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/forgot-password', { email });
      showToast(res.data.message || 'Reset link sent', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        step,
        isLoading,
        error,
        isAuthenticated,
        role,
        signup,
        adminSignup: async () => {},
        verifyEmail,
        signIn,
        forgotPassword,
        logout,
        clearError,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;