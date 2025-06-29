import React, { useContext, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  GitHub,
  Google,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
//import AuthContext from '@/context/AuthContext';
//import styles from './SignIn.module.css';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email required'),
  password: yup.string().min(6, 'Min 6 characters').required('Password required'),
});

const SignIn = () => {
  const { signIn } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data: any) => {
    setErrorMessage('');
    setSuccessMessage('');

    const result = await signIn(data.email, data.password);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      setSuccessMessage('Signed in!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setErrorMessage(result.message || 'Sign-in failed.');
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setValue('email', remembered);
      setRememberMe(true);
    }
  }, [setValue]);

  return (
    <Grid container className={styles['signin-container']} justifyContent="center">
      <Grid item xs={11} sm={8} md={6} lg={4}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={styles['signin-card']}>
            <CardContent>
              <Typography className={styles['form-title']} gutterBottom>
                Sign In
              </Typography>

              {errorMessage && <div className={styles['alert-error']}>{errorMessage}</div>}
              {successMessage && <div className={styles['alert-success']}>{successMessage}</div>}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      variant="outlined"
                      fullWidth
                      size="small"
                      margin="normal"
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
                      variant="outlined"
                      fullWidth
                      size="small"
                      type={showPassword ? 'text' : 'password'}
                      margin="normal"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)}>
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

                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <a href="#" className={styles['forgot-link']}>Forgot Password?</a>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  className={styles['button-primary']}
                >
                  Sign In
                </Button>
              </form>

              <Typography align="center" variant="body2" mt={2}>
                OR
              </Typography>

              <Grid container spacing={2} mt={1}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Google />}
                    className={styles['button-google']}
                  >
                    Google
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GitHub />}
                    className={styles['button-github']}
                  >
                    GitHub
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>
    </Grid>
  );
};

export default SignIn;


