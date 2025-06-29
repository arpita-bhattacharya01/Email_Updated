import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const AdminSignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/signup', formData, { withCredentials: true });
      navigate('/admin/signin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-6 text-center">Admin Sign Up</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input name="firstName" type="text" placeholder="First Name" className="w-full p-2 border rounded mb-4" onChange={handleChange} required />
        <input name="lastName" type="text" placeholder="Last Name" className="w-full p-2 border rounded mb-4" onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" className="w-full p-2 border rounded mb-4" onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" className="w-full p-2 border rounded mb-4" onChange={handleChange} required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Sign Up</button>
        <p className="text-sm mt-4 text-center">
          Already an admin? <Link to="/admin/signin" className="text-blue-600 underline">Sign In</Link>
        </p>
      </form>
    </div>
  );
};

export default AdminSignUp;
