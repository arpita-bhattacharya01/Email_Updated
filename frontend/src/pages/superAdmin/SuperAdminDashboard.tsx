import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Example logic if needed: redirect if something is wrong
    // e.g., if no token or invalid role, navigate('/super-admin/signin')
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        Super Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Users Management</h2>
          <p className="text-gray-600">View, edit, or delete user accounts.</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Admins Overview</h2>
          <p className="text-gray-600">Manage admin roles and permissions.</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">System Stats</h2>
          <p className="text-gray-600">View usage metrics and logs.</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Email Analytics</h2>
          <p className="text-gray-600">Track email deliveries and bounce rates.</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
