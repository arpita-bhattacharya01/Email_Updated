// ✅ Fully Updated Profile.tsx for both user/admin with secure profile update
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, CheckCircle, XCircle, Settings } from 'lucide-react';
import axios from 'axios';

const Profile = () => {
  const auth = useAuth();
  const user = auth?.user;
  const loading = auth?.isLoading ?? false;
  const logout = auth?.logout ?? (() => {});
  const error = auth?.error ?? null;
  const clearError = auth?.clearError ?? (() => {});

  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(user?.profilePicture || null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
      return;
    }
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setProfilePicturePreview(user.profilePicture || null);

      const fetchUserProfile = async () => {
        setFetchLoading(true);
        setLocalError(null);
        clearError();
        try {
          const url = user.role === 'admin' ? '/api/auth/admin/me' : '/api/auth/user';
          const res = await axios.get(import.meta.env.VITE_API_URL + url, { withCredentials: true });
          if (res.data.success && res.data.user) {
            setFirstName(res.data.user.firstName || '');
            setLastName(res.data.user.lastName || '');
            setProfilePicturePreview(res.data.user.profilePicture || null);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          } else {
            throw new Error('No user data returned');
          }
        } catch (err: any) {
          const message = err.response?.data?.message || 'Failed to fetch profile data';
          setLocalError(message);
        } finally {
          setFetchLoading(false);
        }
      };
      fetchUserProfile();
    }
  }, [user, loading, navigate, clearError]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setLocalError('Please upload a JPEG or PNG image');
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    if (!firstName || !lastName) {
      setLocalError('First name and last name are required');
      return;
    }
    setUpdateLoading(true);
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    try {
      let profilePictureUrl = user?.profilePicture || '';
      if (profilePicture) {
        const formData = new FormData();
        formData.append('profilePicture', profilePicture);
        const uploadRes = await axios.post(
          import.meta.env.VITE_API_URL + '/api/upload-profile-picture',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true,
          }
        );
        if (uploadRes.data.success) {
          profilePictureUrl = uploadRes.data.url;
        } else {
          throw new Error(uploadRes.data.message || 'Failed to upload profile picture');
        }
      }

      const updateUrl = '/api/auth/user';
      const res = await axios.put(
        import.meta.env.VITE_API_URL + updateUrl,
        { firstName, lastName, profilePicture: profilePictureUrl },
        { withCredentials: true }
      );

      if (res.data.success) {
        setEditMode(false);
        setProfilePicture(null);
        setSuccessMessage('Profile updated successfully');
      } else {
        throw new Error(res.data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setLocalError(message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setProfilePicture(null);
    setProfilePicturePreview(user?.profilePicture || null);
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  };

  const handleAdminDashboard = () => {
    navigate('/admin/dashboard');
  };

  if (loading || fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <User className="h-16 w-16 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Your Profile</h2>
          <p className="mt-2 text-sm text-gray-600">Role: <span className="font-medium capitalize">{user.role || 'N/A'}</span></p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
          {(error || localError) && <p className="text-red-600 text-center">{error || localError}</p>}
          {successMessage && <p className="text-green-600 text-center">{successMessage}</p>}

          <div className="space-y-4">
            {editMode ? (
              <>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="firstName" className="text-gray-600 font-medium">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="border rounded-md p-2 w-full"
                    disabled={updateLoading}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="lastName" className="text-gray-600 font-medium">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="border rounded-md p-2 w-full"
                    disabled={updateLoading}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="profilePicture" className="text-gray-600 font-medium">Profile Picture</label>
                  <div className="flex items-center space-x-4">
                    {profilePicturePreview && (
                      <img
                        src={profilePicturePreview}
                        alt="Profile Preview"
                        className="h-16 w-16 rounded-full object-cover"
                        onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                      />
                    )}
                    <input
                      id="profilePicture"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleProfilePictureChange}
                      className="border rounded-md p-2 w-full"
                      disabled={updateLoading}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600 font-medium">First Name:</span>
                  <span>{user.firstName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600 font-medium">Last Name:</span>
                  <span>{user.lastName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600 font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600 font-medium">Verified:</span>
                  <span className="flex items-center">
                    {user.isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={user.isVerified ? 'text-green-600' : 'text-red-600'}>
                      {user.isVerified ? 'Yes' : 'No'}
                    </span>
                  </span>
                </div>
                {user.profilePicture && (
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-600 font-medium">Profile Picture:</span>
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="h-16 w-16 rounded-full object-cover"
                      onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            {editMode ? (
              <>
                <button
                  onClick={handleUpdateProfile}
                  disabled={updateLoading}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {updateLoading ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={updateLoading}
                  className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit Profile
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={handleAdminDashboard}
                    className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    <Settings className="inline-block mr-2" /> Admin Dashboard
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => logout()}
              className="w-full py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
