// ✅ SuperAdminProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';


interface Props {
  children: JSX.Element;
}

const SuperAdminProtectedRoute = ({ children }: Props) => {
  const token = localStorage.getItem('token');

  if (!token) return <Navigate to="/super-admin/signin" />;

  try {
    const decoded: any = jwtDecode(token);
    if (decoded.role !== 'superadmin') {
      return <Navigate to="/super-admin/signin" />;
    }
    return children;
  } catch {
    return <Navigate to="/super-admin/signin" />;
  }
};

export default SuperAdminProtectedRoute;
