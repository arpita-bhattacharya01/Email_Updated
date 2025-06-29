import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { sendAppEmail } from './emailController.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ Generate Access Token
export const generateAccessToken = (res, userId, role) => {
  const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000,
  });

  return token;
};

// ✅ Generate Refresh Token
export const generateRefreshToken = async (pool, userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()', [userId]);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, created_at, expires_at) VALUES (?, ?, NOW(), ?)',
    [userId, token, expiresAt]
  );

  return token;
};

export const verifyRefreshToken = async (pool, token) => {
  const [rows] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );
  return rows[0] || null;
};

export const deleteRefreshToken = async (pool, token) => {
  await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
};

// ✅ Signup
export const signup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword, role = 'user' } = req.body;

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);

  if (existing.length > 0) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  try {
    const [result] = await pool.query(
      `INSERT INTO users (firstName, lastName, email, password_hash, verificationToken, role, isBlocked, isApproved, isVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [firstName.trim(), lastName.trim(), normalizedEmail, hashed, verificationToken, role, false, true, false]
    );

    const id = result.insertId;

    const verifyURL = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
    await sendAppEmail({
      to: normalizedEmail,
      subject: 'Verify Your Email',
      html: `<p>Hello ${firstName},</p><p>Please verify your account by clicking <a href="${verifyURL}">this link</a>.</p>`,
    });

    const token = generateAccessToken(res, id, role);

    return res.status(201).json({
      success: true,
      message: 'Registered successfully. Please verify your email.',
      token,
      user: { id, email: normalizedEmail, firstName, lastName, role }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Signup failed: Unable to send verification email.',
      error: error.message || 'Unknown error'
    });
  }
});

// ✅ Signin
export const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const pool = req.app.locals.pool;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  const user = rows[0];

  if (!user || !user.isVerified || user.isBlocked) {
    return res.status(401).json({ success: false, message: 'Invalid credentials or account not verified' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateAccessToken(res, user.id, user.role);
  const refreshToken = await generateRefreshToken(pool, user.id);

  await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token,
    refreshToken
  });
});

// ✅ Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  const user = users[0];

  if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?', [
    token,
    expiry,
    user.id,
  ]);

  const rolePrefix = user.role === 'admin' ? '/admin' : '';
  const resetUrl = `${process.env.CLIENT_URL}${rolePrefix}/reset-password/${token}`;

  await sendAppEmail({
    to: normalizedEmail,
    subject: 'Reset Your Password',
    html: `<p>Hello ${user.firstName},</p><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });

  res.json({ success: true, message: 'Password reset link sent to your email' });
});

// ✅ Reset Password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  const pool = req.app.locals.pool;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const [users] = await pool.query(
    'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiry > NOW()',
    [token]
  );
  const user = users[0];

  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    'UPDATE users SET password_hash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?',
    [hashed, user.id]
  );

  res.json({ success: true, message: 'Password has been reset successfully' });
});

// ✅ Get user profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;
  const [rows] = await pool.query(
    'SELECT id, firstName, lastName, email, role FROM users WHERE id = ?',
    [req.user.id]
  );

  const user = rows[0];
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, user });
});

// ✅ Refresh Access Token
export const refreshToken = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;
  const token = req.body.refreshToken || req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token is required' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );
  const savedToken = rows[0];

  if (!savedToken) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const userId = savedToken.user_id;

  const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId]);
  const user = users[0];

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const newAccessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.cookie('authToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000,
  });

  res.status(200).json({ success: true, token: newAccessToken });
});
