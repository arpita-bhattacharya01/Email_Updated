import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, useTheme, Alert, FormHelperText
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Person } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';

const schema = yup.object({
  firstName: yup.string().required('First Name is required').min(2, 'Min 2 characters'),
  lastName: yup.string().required('Last Name is required').min(2, 'Min 2 characters'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup
    .string()
    .min(8, 'Min 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Must include at least one letter and number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm Password is required'),
});

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const SignUp: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const theme = useTheme();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await axios.post(`${API_URL}/api/auth/signup`, data, {
        withCredentials: true,
      });

      if (response?.data?.success) {
        setSuccessMessage('✅ Signup successful! Please check your email to verify your account.');
        reset();
        setTimeout(() => navigate('/signin'), 3000);
      } else {
        setServerError(response?.data?.message || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      console.error('🚨 Signup error:', err?.response?.data || err.message);
      setServerError(
        err?.response?.data?.message || 'Signup failed. Please try again later.'
      );
    }
  };

  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

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
              Sign Up
            </Typography>

            {(serverError || successMessage) && (
              <Alert severity={serverError ? 'error' : 'success'} sx={{ mb: 2 }}>
                {serverError || successMessage}
              </Alert>
            )}

            <form noValidate onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name"
                    fullWidth
                    margin="normal"
                    size="small"
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><Person /></InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name"
                    fullWidth
                    margin="normal"
                    size="small"
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><Person /></InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <>
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      margin="normal"
                      size="small"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={isSubmitting}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start"><Email /></InputAdornment>
                        ),
                      }}
                    />
                    <FormHelperText sx={{ mt: -1, mb: 1 }}>
                      A verification link will be sent to this email.
                    </FormHelperText>
                  </>
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
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    size="small"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
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
                {isSubmitting ? 'Signing Up...' : 'Sign Up'}
              </Button>
            </form>

            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              Already have an account?{' '}
              <Link to="/signin" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>
                Sign In
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SignUp;
