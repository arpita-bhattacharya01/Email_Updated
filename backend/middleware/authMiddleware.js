import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import {
  getUserById,
  getRefreshTokenByToken,
  saveRefreshToken,
  deleteRefreshTokenByUserId,
} from '../models/User.js';

// =========================
// 🔐 Access Token Generator
// =========================
export const generateAccessToken = (user) => {
  console.log('🔐 Generating access token:', { id: user.id, role: user.role });
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// ==========================
// 🔄 Refresh Token Generator
// ==========================
export const generateRefreshToken = (user) => {
  console.log('🔄 Generating refresh token:', { id: user.id });
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );
};

// ======================
// 🔐 Protect - For Users
// ======================
export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ protect error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// ====================================
// 🔐 Admin Protection Middleware
// ====================================
export const protectAdmin = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.adminToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Optionally use ADMIN_JWT_SECRET
    const user = await getUserById(decoded.id);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied for non-admin' });
    }

    req.admin = user;
    next();
  } catch (err) {
    console.error('❌ protectAdmin error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
});

// ===========================================
// ✅ Role-Based Authorization for Any Route
// ===========================================
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.admin?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${role || 'unknown'}' is not allowed to access this resource.`,
      });
    }
    next();
  };
};

// ==============================
// 🔄 Refresh Token Handler Logic
// ==============================
export const handleRefreshToken = asyncHandler(async (req, res) => {
  const refreshToken =
    req.cookies?.refreshToken || req.body.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const savedToken = await getRefreshTokenByToken(refreshToken);

    if (!savedToken || savedToken.user_id !== decoded.id) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await getUserById(decoded.id);
    if (!user) {
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
    console.error('❌ Refresh error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// ==========================
// 🔓 Logout Logic
// ==========================
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.admin?.id;
  const refreshToken = req.cookies?.refreshToken;

  if (userId && refreshToken) {
    await deleteRefreshTokenByUserId(userId, refreshToken);
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('adminToken'); // optional for admin

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ============================
// 🔍 Quick Auth Checker
// ============================
export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});
