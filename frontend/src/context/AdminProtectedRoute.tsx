import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAdminAuthenticated, adminUser } = useAdminAuth();
  const location = useLocation();

  // 🔒 Redirect if not authenticated or not admin
  if (!isAdminAuthenticated || !adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/admin/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
