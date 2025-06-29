import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  useTheme,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAdminAuth } from '../../context/AdminAuthContext';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Invalid email format')
    .matches(/.*\d{4}.*/, 'Email must contain a 4-digit number')
    .required('Email is required'),
  password: yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
});

type SignInFormData = {
  email: string;
  password: string;
};

const AdminSignIn: React.FC = () => {
  const { isAdminAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Prefill remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedAdminEmail');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const onSubmit = async (data: SignInFormData) => {
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/admin/signin`,
        {
          email: data.email,
          password: data.password,
        },
        { withCredentials: true }
      );

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Invalid credentials');
      }

      if (rememberMe) {
        localStorage.setItem('rememberedAdminEmail', data.email);
      } else {
        localStorage.removeItem('rememberedAdminEmail');
      }

      navigate(response.data.redirectTo || '/admin/dashboard', { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.palette.background.default,
        padding: '16px',
      }}
    >
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card
          sx={{
            boxShadow: 4,
            borderRadius: 3,
            maxWidth: 400,
            width: '100%',
            bgcolor: isDark ? '#2a2a2a' : '#fff',
          }}
        >
          <CardContent sx={{ px: 4, py: 5 }}>
            <Typography variant="h5" fontWeight={600} textAlign="center" mb={3}>
              Admin Login
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form noValidate onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Admin Email"
                    fullWidth
                    margin="normal"
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
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

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    fullWidth
                    margin="normal"
                    type={showPassword ? 'text' : 'password'}
                    size="small"
                    error={!!errors.password}
                    helperText={errors.password?.message}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
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
                <Link to="/admin/forgot-password" style={{ fontSize: '0.85rem', color: theme.palette.primary.main }}>
                  Forgot?
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ mt: 2, py: 1.4, fontWeight: 600, fontSize: '1rem' }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
              </Button>
            </form>

            <Typography variant="body2" align="center" mt={3}>
              Don't have an account?{' '}
              <Link to="/admin/signup" style={{ fontWeight: 500, color: theme.palette.primary.main }}>
                Register as Admin
              </Link>
            </Typography>

            <Typography variant="body2" align="center" mt={2}>
              Are you a user?{' '}
              <Link to="/signin" style={{ fontWeight: 500, color: theme.palette.primary.main }}>
                Sign in as User
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminSignIn;
