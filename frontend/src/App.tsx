import React, { useEffect, Suspense, Component, ReactNode } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './index.css';

// Lazy-loaded pages
const SignIn = React.lazy(() => import('./pages/auth/SignIn'));
const SignUp = React.lazy(() => import('./pages/auth/SignUp'));
const VerifyEmail = React.lazy(() => import('./pages/auth/VerifyEmail'));
const Inbox = React.lazy(() => import('./pages/Inbox'));
const EmailView = React.lazy(() => import('./pages/EmailView'));
const ComposeEmail = React.lazy(() => import('./pages/ComposeEmail'));
const Logout = React.lazy(() => import('./pages/auth/Logout'));
const Profile = React.lazy(() => import('./pages/auth/Profile'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const UserDashboard = React.lazy(() => import('./pages/user/UserDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSignIn = React.lazy(() => import('./pages/admin/AdminSignIn'));
const AdminSignUp = React.lazy(() => import('./pages/admin/AdminSignUp'));
const OTPLogin = React.lazy(() => import('./pages/auth/OTPLogin'));
const SuperAdminSignIn = React.lazy(() => import('./pages/superAdmin/SuperAdminSignin'));
const SuperAdminDashboard = React.lazy(() => import('./pages/superAdmin/SuperAdminDashboard'));

const AdminAuthProvider = React.lazy(() =>
  import('./context/AdminAuthContext').then((m) => ({ default: m.AdminAuthProvider }))
);
const AdminProtectedRoute = React.lazy(() =>
  import('./context/AdminProtectedRoute').then((m) => ({ default: m.default }))
);

// ❌ DO NOT lazy load SuperAdminAuthProvider
// ✅ Import SuperAdminAuthProvider directly
import SuperAdminAuthProvider from './context/SuperAdminContext';
const SuperAdminProtectedRoute = React.lazy(() =>
  import('./context/SuperAdminProtectedRoute').then((m) => ({ default: m.default }))
);

// Error Boundary
type ErrorBoundaryState = { hasError: boolean; error: Error | null };
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const err = error instanceof Error ? error : new Error('Unknown error');
    return { hasError: true, error: err };
  }
  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold text-red-600">Something went wrong.</h2>
          <p className="text-gray-600">{error?.message || 'Unexpected error occurred.'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Redirect if already signed in
const RedirectIfAuthenticated: React.FC<{ redirectTo: string }> = ({ redirectTo }) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" state={{ from: location }} replace />;
    if (role === 'user') return <Navigate to="/user-dashboard" state={{ from: location }} replace />;
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  return <Outlet />;
};

// Private route wrapper
const PrivateRoute: React.FC<{ children: ReactNode; role?: 'user' | 'admin' }> = ({ children, role }) => {
  const { isAuthenticated, role: userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (role && userRole !== role) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};

// Layout wrapper
const LayoutWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthRoute = [
    '/signin', '/signup', '/verify-email', '/otp-login',
    '/forgot-password', '/reset-password',
    '/admin', '/admin/signin', '/admin/signup',
    '/super-admin', '/super-admin/signin'
  ].some((path) => location.pathname.startsWith(path));

  return (
    <div
      className={`min-h-screen flex flex-col ${isAuthRoute ? 'bg-gray-100' : 'bg-gray-50'}`}
      style={{
        backgroundImage: `url("/background-blur.jpg")`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <main className="flex-grow">
        <div className="container mx-auto p-4">
          <div className="flex flex-col gap-4">
            <div className="w-full bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    console.log(isAuthenticated ? `${role} authenticated` : 'Not authenticated');
  }, [isAuthenticated, role]);

  return (
    <LayoutWrapper>
      <ErrorBoundary>
        <Suspense fallback={<div className="text-center p-6 text-gray-600">Loading...</div>}>
          <Routes>
            {/* Auth Routes */}
            <Route element={<RedirectIfAuthenticated redirectTo="/" />}>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/otp-login" element={<OTPLogin />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to="/admin/signin" replace />} />
            <Route path="/admin/signin" element={<AdminSignIn />} />
            <Route path="/admin/signup" element={<AdminSignUp />} />
            <Route path="/admin/dashboard" element={
              <AdminAuthProvider>
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              </AdminAuthProvider>
            } />

            {/* Super Admin Routes */}
            <Route path="/super-admin/signin" element={<SuperAdminSignIn />} />
            <Route path="/super-admin/dashboard" element={
              <SuperAdminAuthProvider>
                <SuperAdminProtectedRoute>
                  <SuperAdminDashboard />
                </SuperAdminProtectedRoute>
              </SuperAdminAuthProvider>
            } />

            {/* User Routes */}
            <Route path="/" element={<PrivateRoute role="user"><UserDashboard /></PrivateRoute>} />
            <Route path="/user-dashboard" element={<PrivateRoute role="user"><UserDashboard /></PrivateRoute>} />
            <Route path="/inbox" element={<PrivateRoute role="user"><Inbox /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute role="user"><Profile /></PrivateRoute>} />
            <Route path="/email/:id" element={<PrivateRoute role="user"><EmailView /></PrivateRoute>} />
            <Route path="/compose" element={<PrivateRoute role="user"><ComposeEmail /></PrivateRoute>} />

            {/* Logout & Error */}
            <Route path="/logout" element={<Logout />} />
            <Route path="/unauthorized" element={
              <div className="text-center mt-20">
                <h2 className="text-2xl font-bold text-red-600">Unauthorized Access</h2>
                <p className="text-gray-600">You do not have permission to view this page.</p>
              </div>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </LayoutWrapper>
  );
};

export default App;
