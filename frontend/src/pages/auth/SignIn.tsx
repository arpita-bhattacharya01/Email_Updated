import React, { useState } from 'react';
import {
  Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, useTheme, Alert, Checkbox, FormControlLabel
} from '@mui/material';
import { Visibility, VisibilityOff, Email } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

type FormData = {
  email: string;
  password: string;
};

const SignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error('API URL not defined');

      const response = await axios.post(`${apiUrl}/api/auth/signin`, data, {
        withCredentials: true,
      });

      if (response?.data?.success) {
        const token = response.data.accessToken;
        if (rememberMe && token) {
          localStorage.setItem('accessToken', token);
        }

        setSuccessMessage('Signed in successfully! Redirecting...');
        setTimeout(() => navigate('/user-dashboard'), 2000);
      } else {
        setServerError(response?.data?.message || 'Signin failed');
      }
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Signin failed. Try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = credentialResponse.credential;

      const res = await axios.post(`${apiUrl}/api/auth/google`, { token }, { withCredentials: true });

      if (res?.data?.success) {
        const accessToken = res.data.accessToken;
        if (rememberMe && accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        navigate('/user-dashboard');
      }
    } catch (error) {
      console.error('Google login failed:', error);
      setServerError('Google sign-in failed. Try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.palette.background.default,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        <Card sx={{ boxShadow: 3, borderRadius: 3 }}>
          <CardContent sx={{ px: 4, py: 5 }}>
            <Typography variant="h5" align="center" mb={3}>
              Sign In
            </Typography>

            {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            <form noValidate onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    fullWidth
                    margin="normal"
                    size="small"
                    autoComplete="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><Email /></InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    size="small"
                    autoComplete="current-password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword((prev) => !prev)}
                            edge="end"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    color="primary"
                  />
                }
                label="Remember Me"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  bgcolor: '#1a73e8',
                  '&:hover': { bgcolor: '#1557b0' },
                  mt: 2,
                  py: 1.5,
                  fontWeight: 500,
                  textTransform: 'none',
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <Typography variant="body2" align="center" sx={{ mt: 2, mb: 1 }}>
              Or continue with
            </Typography>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setServerError('Google sign-in failed')}
              />
            </div>

            <Typography variant="body2" align="center">
              Don’t have an account?{' '}
              <Link to="/signup" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>
                Sign Up
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SignIn;
