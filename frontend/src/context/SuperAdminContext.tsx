// SuperAdminAuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SuperAdminAuthContextProps {
  isAuthenticated: boolean;
  superAdmin: any;
  signin: (token: string) => void;
  signout: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextProps | undefined>(undefined);

export const SuperAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('superadminToken');
    if (token) {
      setIsAuthenticated(true);
      // Optionally decode and set admin info here
    }
  }, []);

  const signin = (token: string) => {
    localStorage.setItem('superadminToken', token);
    setIsAuthenticated(true);
    // setSuperAdmin(...) if needed
  };

  const signout = () => {
    localStorage.removeItem('superadminToken');
    setIsAuthenticated(false);
    setSuperAdmin(null);
  };

  return (
    <SuperAdminAuthContext.Provider value={{ isAuthenticated, superAdmin, signin, signout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
};
export default SuperAdminAuthProvider;