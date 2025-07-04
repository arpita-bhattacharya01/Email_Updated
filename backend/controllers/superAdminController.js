import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendAppEmail } from './emailController.js';

// 🔐 JWT Access Token
const generateAccessToken = (res, userId, role) => {
  const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000, // 1 day
  });

  return token;
};

// ✅ Super Admin Signup
export const superAdminSignup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length > 0) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (
      firstName, lastName, email, password_hash, role,
      isVerified, isApproved, isBlocked, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'superadmin', true, true, false, NOW(), NOW())`,
    [firstName.trim(), lastName.trim(), normalizedEmail, hashed]
  );

  const id = result.insertId;

  res.status(201).json({
    success: true,
    message: 'Super Admin registered successfully',
    superadmin: {
      id,
      firstName,
      lastName,
      email: normalizedEmail,
      role: 'superadmin',
    },
  });
});

// ✅ Super Admin Signin
export const superAdminSignin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND role = "superadmin"',
    [normalizedEmail]
  );
  const superadmin = rows[0];

  if (!superadmin) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, superadmin.password_hash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = generateAccessToken(res, superadmin.id, superadmin.role);
  await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [superadmin.id]);

  res.status(200).json({
    success: true,
    message: 'Super Admin signed in successfully',
    token,
    superadmin: {
      id: superadmin.id,
      email: superadmin.email,
      firstName: superadmin.firstName,
      lastName: superadmin.lastName,
      role: superadmin.role,
    },
  });
});

// ✅ Get Super Admin Profile
export const getSuperAdminProfile = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;
  const [rows] = await pool.query(
    'SELECT id, firstName, lastName, email, role FROM users WHERE id = ? AND role = "superadmin"',
    [req.user.id]
  );
  const superadmin = rows[0];

  if (!superadmin) {
    return res.status(404).json({ success: false, message: 'Super Admin not found' });
  }

  res.json({ success: true, superadmin });
});

// ✅ Update Super Admin Profile
export const updateSuperAdminProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  await pool.query(
    'UPDATE users SET firstName = ?, lastName = ?, email = ?, updatedAt = NOW() WHERE id = ? AND role = "superadmin"',
    [firstName.trim(), lastName.trim(), normalizedEmail, req.user.id]
  );

  res.json({ success: true, message: 'Profile updated successfully' });
});

// ✅ Forgot Password (Super Admin)
export const superAdminForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND role = "superadmin"',
    [normalizedEmail]
  );
  const superadmin = rows[0];

  if (!superadmin) {
    return res.status(404).json({ success: false, message: 'Super Admin not found' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?', [
    token,
    expiry,
    superadmin.id,
  ]);

  const resetUrl = `${process.env.CLIENT_URL}/superadmin/reset-password/${token}`;
  await sendAppEmail({
    to: normalizedEmail,
    subject: 'Super Admin Password Reset',
    html: `<p>Hello ${superadmin.firstName},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. Valid for 1 hour.</p>`,
  });

  res.json({ success: true, message: 'Password reset link sent to your email' });
});

// ✅ Reset Password
export const superAdminResetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  const pool = req.app.locals.pool;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiry > NOW() AND role = "superadmin"',
    [token]
  );
  const superadmin = rows[0];

  if (!superadmin) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    'UPDATE users SET password_hash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?',
    [hashed, superadmin.id]
  );

  res.json({ success: true, message: 'Password reset successful' });
});
