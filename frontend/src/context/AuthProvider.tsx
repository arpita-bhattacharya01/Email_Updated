import React, { createContext, useContext, useState, ReactNode } from 'react';

type User = {
  name?: string;
  email: string;
  password?: string;
  verified?: boolean;
  role?: 'user' | 'admin';
};

type AuthContextType = {
  user: User | null;
  admin: User | null;
  step: string | null;
  isAuthenticated: boolean;
  role: string | null;
  isLoading: boolean;
  error: string | null;
  signup: (userData: User) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  sendLoginOtp: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  login: (credentials: User) => Promise<void>;
  loginAdmin: () => void;
  adminLogout: () => void;
  logout: () => void;
  clearError: () => void;
  userAuth: (email: string, password: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<User | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // --- USER AUTH FLOW ---
  const signup = async (userData: User) => {
    try {
      console.log('Signing up user:', userData);
      setUser({ ...userData, verified: false });
    } catch (error) {
      console.error('Signup Error:', error);
      setError('Signup failed.');
    }
  };

  const verifyOtp = async (otp: string) => {
    try {
      console.log('Verifying OTP:', otp);
      setUser((prevUser) => prevUser ? { ...prevUser, verified: true } : null);
    } catch (error) {
      console.error('OTP Verification Error:', error);
      setError('OTP verification failed.');
    }
  };

  const sendLoginOtp = async (email: string) => {
    try {
      console.log('Sending login OTP to:', email);
      return true;
    } catch (error) {
      console.error('Send Login OTP Error:', error);
      setError('Failed to send login OTP.');
      return false;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      console.log('Sending forgot password email to:', email);
    } catch (error) {
      console.error('Forgot Password Error:', error);
      setError('Failed to send forgot password email.');
    }
  };

  const login = async (credentials: User) => {
    try {
      console.log('User login with:', credentials);
      setUser({ ...credentials, role: 'user' });
      setRole('user');
      setIsAuthenticated(true);
      setStep('AUTHENTICATED');
      localStorage.setItem('userRole', 'user');
    } catch (error) {
      console.error('User Login Error:', error);
      setError('User login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ADMIN AUTH FLOW ---
  const loginAdmin = () => {
    try {
      setRole('admin');
      setIsAuthenticated(true);
      setStep('AUTHENTICATED');
      localStorage.setItem('isAdminAuthenticated', 'true');
      localStorage.setItem('userRole', 'admin');
      setUser({ email: 'admin1234@example.com', role: 'admin' });
    } catch (err) {
      console.error('Admin Login Error:', err);
      setError('Failed to authenticate as admin');
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogout = () => {
    logout();
  };

  const logout = () => {
    setUser(null);
    setAdmin(null);
    setIsAuthenticated(false);
    setRole(null);
    setStep(null);
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('userRole');
    console.log('Logged out');
  };

  const userAuth = async (email: string, password: string) => {
    console.log("Placeholder: authenticating user", email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        step,
        isAuthenticated,
        isLoading,
        error,
        role,
        signup,
        verifyOtp,
        sendLoginOtp,
        forgotPassword,
        login,
        loginAdmin,
        logout,
        adminLogout,
        clearError,
        userAuth,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
