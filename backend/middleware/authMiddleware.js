import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import {
  getUserById,
  getRefreshTokenByToken,
  saveRefreshToken,
  deleteRefreshTokenByUserId,
} from '../models/User.js';

// Generate access token
export const generateAccessToken = (user) => {
  console.log('🔐 Generating access token for user:', { id: user.id, role: user.role });
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// Generate refresh token
export const generateRefreshToken = (user) => {
  console.log('🔄 Generating refresh token for user:', { id: user.id });
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET, // Updated to match .env
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );
};

// Middleware: Protect private routes
export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.error('❌ No token provided for request:', req.originalUrl);
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    console.log('🔐 Verifying token:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Decoded token:', decoded);
    const user = await getUserById(decoded.id);

    if (!user) {
      console.error('❌ User not found for ID:', decoded.id);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
    console.log('✅ User authenticated:', req.user);

    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// Role-based authorization
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.error('❌ Role unauthorized:', { userRole: req.user?.role, requiredRoles: roles });
      return res.status(403).json({
        success: false,
        message: `Role '${req.user?.role || 'unknown'}' is not allowed to access this resource.`,
      });
    }
    console.log('✅ Role authorized:', req.user.role);
    next();
  };
};

// Refresh token logic
export const handleRefreshToken = asyncHandler(async (req, res) => {
  const refreshToken =
    req.cookies?.refreshToken || req.body.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    console.error('❌ No refresh token provided');
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    console.log('🔄 Verifying refresh token:', refreshToken);
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); // Updated to match .env
    const savedToken = await getRefreshTokenByToken(refreshToken);

    if (!savedToken || savedToken.user_id !== decoded.id) {
      console.error('❌ Invalid refresh token for user ID:', decoded.id);
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await getUserById(decoded.id);
    if (!user) {
      console.error('❌ User not found for ID:', decoded.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await deleteRefreshTokenByUserId(user.id, refreshToken);
    await saveRefreshToken(user.id, newRefreshToken);

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    console.log('✅ Refresh token successful for user:', user.id);
    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Refresh token verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// Logout: clear cookies and tokens
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const refreshToken = req.cookies?.refreshToken;

  if (userId && refreshToken) {
    await deleteRefreshTokenByUserId(userId, refreshToken);
    console.log('✅ Refresh token deleted for user:', userId);
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  console.log('✅ User logged out:', userId);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// Middleware to check if user is authenticated
export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error('❌ No token provided for authentication check');
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    console.log('🔐 Verifying token for isAuthenticated:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) {
      console.error('❌ User not found for ID:', decoded.id);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    console.log('✅ User authenticated for isAuthenticated:', user.id);
    next();
  } catch (err) {
    console.error('❌ Token verification failed for isAuthenticated:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});