import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button, Typography } from '@mui/material';
import { Trash2, UserCheck, UserX, UserPlus, Users, Clock } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import axios from 'axios';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isBlocked: boolean;
  lastLogin: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface Stats {
  totalUsers: number;
  newUsersLast7Days: number;
  deletedUsers: number;
  blockedUsers: number;
  unusedUsersOver30Days: number;
  activeUsersLast7Days: number;
}

interface OTPLog {
  id: string;
  email: string;
  type: 'send' | 'verify';
  status: 'success' | 'failed';
  createdAt: string;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="bg-white p-4 rounded shadow flex items-center gap-3">
    {icon}
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { isAdminAuthenticated, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [otpLogs, setOtpLogs] = useState<OTPLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminAuthenticated) navigate('/admin/signin');
  }, [isAdminAuthenticated, navigate]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [statsRes, usersRes, otpLogsRes] = await Promise.all([
          apiClient.get('/api/admin/user-stats'),
          apiClient.get('/api/admin/users'),
          apiClient.get('/api/auth/admin/otp-logs'),
        ]);

        setStats(statsRes.data);
        setUsers(usersRes.data);
        setOtpLogs(otpLogsRes.data);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err?.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdminAuthenticated]);

  const handleBlockToggle = async (userId: string, currentlyBlocked: boolean) => {
    setActionLoading(userId);
    try {
      await apiClient.put(`/api/admin/users/${userId}/block`, { block: !currentlyBlocked });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBlocked: !currentlyBlocked } : u))
      );
    } catch (err) {
      window.alert('Failed to update block status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user permanently?')) return;
    setActionLoading(userId);
    try {
      await apiClient.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      window.alert('Error deleting user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/signin');
  };

  const chartData = users
    .filter((u) => u.createdAt && !isNaN(new Date(u.createdAt).getTime()))
    .map((u) => ({
      name: `${u.firstName} ${u.lastName}`,
      Age: new Date().getFullYear() - new Date(u.createdAt).getFullYear(),
    }));

  if (loading) return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;

  if (error)
    return (
      <div className="text-center p-6 text-red-600">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Typography variant="h4" color="primary">
            Admin Dashboard
          </Typography>
          <p className="text-gray-600">Manage users, track stats, and more.</p>
        </div>
        <Button variant="outlined" color="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={<Users size={24} />} label="Total Users" value={stats.totalUsers} />
          <StatCard icon={<UserPlus size={24} />} label="New (7d)" value={stats.newUsersLast7Days} />
          <StatCard icon={<UserX size={24} />} label="Deleted" value={stats.deletedUsers} />
          <StatCard icon={<UserCheck size={24} />} label="Blocked" value={stats.blockedUsers} />
          <StatCard icon={<Clock size={24} />} label="Inactive (30d+)" value={stats.unusedUsersOver30Days} />
          <StatCard icon={<UserCheck size={24} />} label="Active (7d)" value={stats.activeUsersLast7Days} />
        </div>
      )}

      {/* User Chart */}
      <div className="bg-white p-6 rounded shadow mb-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">User Age (By Join Year)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Age" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Manage Users */}
      <div className="bg-white p-6 rounded shadow mb-10">
        <h3 className="text-lg font-semibold mb-4">Manage Users</h3>
        <ul className="divide-y divide-gray-300">
          {users.map((u) => (
            <li key={u.id} className="py-3 flex justify-between items-center">
              <div>
                <span className="font-medium">
                  {u.firstName} {u.lastName}
                </span>{' '}
                ({u.email}) -{' '}
                <span className={u.isBlocked ? 'text-red-600' : 'text-green-600'}>
                  {u.isBlocked ? 'Blocked' : 'Active'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBlockToggle(u.id, u.isBlocked)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  disabled={actionLoading === u.id}
                >
                  {u.isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  disabled={actionLoading === u.id}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* OTP Logs */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">OTP Logs</h3>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-300 text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-gray-600">Email</th>
                <th className="px-4 py-2 text-left text-gray-600">Type</th>
                <th className="px-4 py-2 text-left text-gray-600">Status</th>
                <th className="px-4 py-2 text-left text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {otpLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2">{log.email}</td>
                  <td className="px-4 py-2">{log.type}</td>
                  <td className="px-4 py-2">{log.status}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
