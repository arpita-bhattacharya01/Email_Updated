import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { sendAppEmail } from './emailController.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔐 Access Token
const generateAccessToken = (res, id, role) => {
  const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '15m' });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  return token;
};

// 🔁 Refresh Token
const generateRefreshToken = async (pool, userId) => {
  const token = crypto.randomBytes(64).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, created_at, expires_at) VALUES (?, ?, NOW(), ?)',
    [userId, token, expires]
  );

  return token;
};

// ✅ Signup
export const signup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const pool = req.app.locals.pool;

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length > 0) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (
      firstName, lastName, email, password_hash, role,
      isVerified, isBlocked, isApproved, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, NOW(), NOW())`,
    [
      firstName.trim(),
      lastName.trim(),
      normalizedEmail,
      hashedPassword,
      true,
      false,
      true,
    ]
  );

  const userId = result.insertId;
  const accessToken = generateAccessToken(res, userId, 'user');
  const refreshToken = await generateRefreshToken(pool, userId);

  return res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    token: accessToken,
    refreshToken,
    user: { id: userId, email: normalizedEmail, firstName, lastName, role: 'user' },
  });
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

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ success: false, message: 'Account is not verified' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: 'Account is blocked. Contact support.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateAccessToken(res, user.id, user.role);
  const refreshToken = await generateRefreshToken(pool, user.id);
  await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);

  return res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
});

// 🔄 Refresh Token
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

  const newAccessToken = generateAccessToken(res, user.id, user.role);

  return res.status(200).json({ success: true, token: newAccessToken });
});

// 👤 Get Profile
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

  return res.json({ success: true, user });
});

// 🔑 Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  const user = users[0];

  if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query('UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE id = ?', [
    token,
    expiry,
    user.id,
  ]);

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await sendAppEmail({
    to: normalizedEmail,
    subject: 'Reset Your Password',
    html: `<p>Hello ${user.firstName},</p><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
  });

  return res.json({ success: true, message: 'Password reset link sent to your email' });
});

// 🔄 Reset Password
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
    'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > NOW()',
    [token]
  );

  const user = users[0];

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    'UPDATE users SET password_hash = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?',
    [hashed, user.id]
  );

  return res.json({ success: true, message: 'Password has been reset successfully' });
});
