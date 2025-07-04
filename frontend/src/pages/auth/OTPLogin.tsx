import React, { useState } from 'react';
import {
  Card, CardContent, TextField, Button, Typography, Alert,
  useTheme, CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const OTPLogin: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleSendOtp = async () => {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const res = await axios.post(`${API_URL}/api/auth/send-otp`, { email });
      if (res?.data?.success) {
        setStep(2);
        setSuccessMessage('OTP sent to your email. Please check your inbox.');
      } else {
        setServerError(res?.data?.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setServerError(err?.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp }, {
        withCredentials: true,
      });

      if (res?.data?.success) {
        const token = res.data.accessToken;
        if (token) localStorage.setItem('accessToken', token);

        setSuccessMessage('OTP verified! Redirecting...');
        setTimeout(() => navigate('/user-dashboard'), 2000);
      } else {
        setServerError(res?.data?.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setServerError(err?.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.palette.background.default,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        <Card sx={{ boxShadow: 3, borderRadius: 3 }}>
          <CardContent sx={{ px: 4, py: 5 }}>
            <Typography variant="h5" align="center" mb={3}>
              Sign In with OTP
            </Typography>

            {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            {step === 1 && (
              <>
                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  autoComplete="email"
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Send OTP'}
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Typography variant="subtitle1" align="center" mb={2}>
                  Enter the 6-digit OTP sent to <strong>{email}</strong>
                </Typography>

                <TextField
                  fullWidth
                  type="text"
                  label="OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  margin="normal"
                  inputProps={{ maxLength: 6, inputMode: 'numeric', autoComplete: 'one-time-code' }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleSendOtp}
                  disabled={loading}
                  sx={{ mt: 1 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Resend OTP'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OTPLogin;
