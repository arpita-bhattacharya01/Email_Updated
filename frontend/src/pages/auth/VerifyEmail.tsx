// ✅ Updated VerifyEmail.tsx — Handles email verification via token
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Alert, Typography, Box } from '@mui/material';
import axios from 'axios';

const VerifyEmail: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/auth/verify-email/${token}`,
          { withCredentials: true }
        );
        if (res.status === 200) {
          setStatus('success');
          setMessage('Email verified successfully. Redirecting to sign in...');
          setTimeout(() => navigate('/signin?verified=true'), 2000);
        } else {
          setStatus('error');
          setMessage('Verification failed or link expired.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      }
    };
    if (token) verify();
  }, [token, navigate]);

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
      <Typography variant="h5" mb={2}>Email Verification</Typography>
      {status === 'verifying' && <CircularProgress />}
      {status !== 'verifying' && (
        <Alert severity={status === 'success' ? 'success' : 'error'}>{message}</Alert>
      )}
    </Box>
  );
};

export default VerifyEmail;
