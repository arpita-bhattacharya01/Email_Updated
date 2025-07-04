import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthProvider from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google'; // ✅ ADD THIS

const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

// ✅ Replace with your actual client ID
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  throw new Error('❌ VITE_GOOGLE_CLIENT_ID not set in .env file');
}

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}> {/* ✅ WRAP HERE */}
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <App />
            <ToastContainer position="top-right" autoClose={3000} />
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
