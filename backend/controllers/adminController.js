import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendAppEmail } from './emailController.js';

const generateAccessToken = (res, userId, role) => {
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

// ✅ Admin Signup
export const adminSignup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existingUser.length > 0) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (
      firstName, lastName, email, password_hash,
      role, isVerified, isApproved, isBlocked,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'admin', true, true, false, NOW(), NOW())`,
    [firstName.trim(), lastName.trim(), normalizedEmail, hashed]
  );

  const id = result.insertId;

  res.status(201).json({
    success: true,
    message: 'Admin registered successfully',
    admin: {
      id,
      firstName,
      lastName,
      email: normalizedEmail,
      role: 'admin'
    }
  });
});

// ✅ Admin Signin
export const adminSignin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [normalizedEmail]);
  const admin = rows[0];

  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = generateAccessToken(res, admin.id, admin.role);
  await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [admin.id]);

  res.status(200).json({
    success: true,
    message: 'Admin signed in successfully',
    admin: {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
    },
    token,
  });
});

// ✅ Get Admin Profile
export const getAdminProfile = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;
  const [rows] = await pool.query(
    'SELECT id, firstName, lastName, email, role FROM users WHERE id = ? AND role = "admin"',
    [req.user.id]
  );
  const admin = rows[0];
  if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

  res.json({ success: true, admin });
});

// ✅ Update Admin Profile
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  await pool.query(
    'UPDATE users SET firstName = ?, lastName = ?, email = ?, updatedAt = NOW() WHERE id = ? AND role = "admin"',
    [firstName.trim(), lastName.trim(), normalizedEmail, req.user.id]
  );

  res.json({ success: true, message: 'Profile updated successfully' });
});

// ✅ Admin Forgot Password
export const adminForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const pool = req.app.locals.pool;
  const normalizedEmail = email.trim().toLowerCase();

  const [admins] = await pool.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [normalizedEmail]);
  const admin = admins[0];
  if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?', [token, expiry, admin.id]);

  const resetUrl = `${process.env.CLIENT_URL}/admin/reset-password/${token}`;
  await sendAppEmail({
    to: normalizedEmail,
    subject: 'Admin Password Reset',
    html: `<p>Hello ${admin.firstName},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. Valid for 1 hour.</p>`,
  });

  res.json({ success: true, message: 'Reset link sent to email' });
});

// ✅ Admin Reset Password
export const adminResetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  const pool = req.app.locals.pool;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const [admins] = await pool.query(
    'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiry > NOW() AND role = "admin"',
    [token]
  );
  const admin = admins[0];
  if (!admin) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

  const hashed = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE users SET password_hash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?',
    [hashed, admin.id]
  );

  res.json({ success: true, message: 'Password reset successful' });
});
