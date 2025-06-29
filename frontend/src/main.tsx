import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // ✅ Now this should point to the AppRoutes default export
import AuthProvider from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <AdminAuthProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3000} />
      </AdminAuthProvider>
    </AuthProvider>
  </React.StrictMode>
);
