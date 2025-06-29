// ✅ Updated ForgotPassword.tsx — axios integration with backend
import React, { useState } from 'react';
import {
  Card, CardContent, TextField, Button, Typography,
  InputAdornment, useTheme, Alert
} from '@mui/material';
import { Email } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
});

type ForgotPasswordData = {
  email: string;
};

const ForgotPassword: React.FC = () => {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post(
        import.meta.env.VITE_API_URL + '/api/auth/forgot-password',
        data,
        { withCredentials: true }
      );
      setSuccess(res.data.message || 'Reset instructions sent.');
      reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.palette.background.default,
      padding: 16,
    }}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card sx={{ boxShadow: 4, borderRadius: 3, maxWidth: 450, width: '100%' }}>
          <CardContent sx={{ px: 4, py: 5 }}>
            <Typography variant="h5" fontWeight={500} textAlign="center" mb={3}>
              Forgot Password
            </Typography>

            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    fullWidth
                    size="small"
                    variant="outlined"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    placeholder="Enter your email"
                    margin="normal"
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, py: 1.5, textTransform: 'none' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
