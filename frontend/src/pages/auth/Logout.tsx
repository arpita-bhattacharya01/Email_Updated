// ✅ Updated Logout.tsx — using axios + secure backend integration
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import axios from 'axios';

const Logout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(
        import.meta.env.VITE_API_URL + '/api/auth/logout',
        {},
        { withCredentials: true }
      );
      navigate('/signin');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Logout</h2>
          <p className="mt-2 text-sm text-gray-600">
            Are you sure you want to log out?
          </p>
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Logout;
