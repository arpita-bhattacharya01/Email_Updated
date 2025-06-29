import dotenv from 'dotenv';
dotenv.config();

import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { sendAppEmail } from './emailController.js';
import express from 'express';
import mysql from 'mysql2/promise';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//middlewares
const app = express();
app.use(express.json());

// Environment variable checks
[
  'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'JWT_EXPIRES_IN', 'REFRESH_TOKEN_EXPIRES_IN',
  'CLIENT_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'GOOGLE_CLIENT_ID'
].forEach(key => {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
});

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

const generateRefreshToken = async (pool, userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN));
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()', [userId]);
  await pool.query('INSERT INTO refresh_tokens (user_id, token, created_at, expires_at) VALUES (?, ?, NOW(), ?)', [userId, token, expiresAt]);
  return token;
};

const verifyRefreshToken = async (pool, token) => {
  const [rows] = await pool.query('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()', [token]);
  return rows[0] || null;
};

const deleteRefreshToken = async (pool, token) => {
  await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
};

const performSignIn = async (pool, res, email, password, isAdmin = false) => {
  const query = isAdmin ? 'SELECT * FROM users WHERE email = ? AND role = ?' : 'SELECT * FROM users WHERE email = ?';
  const params = isAdmin ? [email, 'admin'] : [email];
  const [rows] = await pool.query(query, params);
  const user = rows[0];
  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
  if (!isAdmin && (!user.isVerified || !user.isApproved))
    return res.status(403).json({ success: false, message: 'Please verify email and wait for approval.' });
  if (user.isBlocked)
    return res.status(403).json({ success: false, message: 'Your account has been blocked' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = generateAccessToken(res, user.id, user.role);
  const refresh = await generateRefreshToken(pool, user.id);
  await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);

  return res.status(200).json({
    success: true,
    message: `${isAdmin ? 'Admin' : 'User'} signed in successfully`,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      role: user.role,
      isVerified: !!user.isVerified,
      isApproved: !!user.isApproved,
      isBlocked: !!user.isBlocked
    },
    token,
    refreshToken: refresh
  });
};

// ✅ Signup
// export const signup = asyncHandler(async (req, res) => {
//   const { firstName, lastName, email, password, confirmPassword, role = 'user' } = req.body;
//   if (!firstName || !lastName || !email || !password || !confirmPassword)
//     return res.status(400).json({ success: false, message: 'All fields are required' });
//   if (password !== confirmPassword)
//     return res.status(400).json({ success: false, message: 'Passwords do not match' });

//   const pool = req.app.locals.pool;
//   const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
//   if (exists.length) return res.status(409).json({ success: false, message: 'Email already exists' });

//   const hashed = await bcrypt.hash(password, 10);
//   const verificationToken = crypto.randomBytes(32).toString('hex');
//   const id = uuidv4();
//   const isAdmin = role === 'admin';

//   await pool.query(
//     `INSERT INTO users
//      (id, firstName, lastName, email, password_hash, verificationToken, role, isBlocked, isApproved, isVerified, createdAt, updatedAt)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
//     [id, firstName, lastName, email, hashed, verificationToken, role, false, isAdmin, isAdmin]
//   );

//   if (isAdmin) {
//     await pool.query(
//       `INSERT INTO admin_details (admin_id, bio, contact_email, contact_phone, profile_picture, createdAt, updatedAt)
//        VALUES (?, '', ?, '', '', NOW(), NOW())`,
//       [id, email]
//     );
//   }

//   const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
//   await sendAppEmail(req, res, {
//     to: email,
//     subject: 'Verify Your Email',
//     html: `<p>Click <a href="${verifyURL}">here</a> to verify your email.</p>`
//   });

//   res.status(201).json({
//     success: true,
//     message: `${isAdmin ? 'Admin' : 'User'} registered successfully. Please verify your email.`
//   });
// });


export const signup = asyncHandler(async (req, res) => {
  try {
    // Log incoming request body for debugging
    console.log('Request body:', req.body);

    const { firstName, lastName, email, password, confirmPassword, role = 'user' } = req.body;

    // Check if all required fields are provided
    if (!firstName || !lastName || !email || !password || !confirmPassword)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    // Check if passwords match
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match' });

    const pool = req.app.locals.pool;

    // Check if email already exists in the database
    const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0)
      return res.status(409).json({ success: false, message: 'Email already exists' });

    // Hash the password
    const hashed = await bcrypt.hash(password, 10);

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const id = uuidv4();
    const isAdmin = role === 'admin';

    // Insert new user into the users table
    await pool.query(
      `INSERT INTO users
         (id, firstName, lastName, email, password_hash, verificationToken, role, isBlocked, isApproved, isVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        firstName,
        lastName,
        email,
        hashed,
        verificationToken,
        role,
        false,  // isBlocked
        isAdmin, // isApproved
        isAdmin  // isVerified
      ]
    );

    // If the user is an admin, insert additional details into the admin_details table
    if (isAdmin) {
      await pool.query(
        `INSERT INTO admin_details (admin_id, bio, contact_email, contact_phone, profile_picture, createdAt, updatedAt)
         VALUES (?, '', ?, '', '', NOW(), NOW())`,
        [id, email]
      );
    }

    // Send verification email
    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    try {
      await sendAppEmail(req, res, {
        to: email,
        subject: 'Verify Your Email',
        html: `<p>Click <a href="${verifyURL}">here</a> to verify your email.</p>`
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ success: false, message: 'Error sending verification email' });
    }

    // Send response back to client
    return res.status(201).json({
      success: true,
      message: `${isAdmin ? 'Admin' : 'User'} registered successfully. Please verify your email.`,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});




export const signin = asyncHandler((req, res) =>
  performSignIn(req.app.locals.pool, res, req.body.email, req.body.password)
);

// export const adminSignin = asyncHandler((req, res) =>
//   performSignIn(req.app.locals.pool, res, req.body.email, req.body.password, true)
// );
export const adminSignin = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Admin signin attempt:', email);
    const pool = req.app.locals.pool;

    console.log('Incoming login:', email, password);

    if (!email || !password) {
      return res.status(400).json({success: false, message: 'Email and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({success: false, message: 'Access denied: Admin only' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 3600000, // 1 hour
    });

    return res.status(200).json({
       success: true,
      message: 'Admin login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      redirectTo: '/admin/dashboard',
    });
  } catch (error) {
    console.error('Admin signin error:', error);
    return res.status(500).json({ message: 'Server error during admin login' });
  }
});


export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const pool = req.app.locals.pool;
  const [rows] = await pool.query('SELECT id, isVerified FROM users WHERE verificationToken = ?', [token]);
  const user = rows[0];
  if (!user) return res.redirect(`${process.env.CLIENT_URL}/verify-email?status=invalid`);
  if (user.isVerified) return res.redirect(`${process.env.CLIENT_URL}/verify-email?status=already_verified`);
  await pool.query('UPDATE users SET isVerified = 1, verificationToken = NULL WHERE id = ?', [user.id]);
  return res.redirect(`${process.env.CLIENT_URL}/signin?verified=true`);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const pool = req.app.locals.pool;
  const [rows] = await pool.query('SELECT id, isVerified FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) return res.status(404).json({ success: false, message: 'Email not found.' });
  if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified.' });

  const newToken = crypto.randomBytes(32).toString('hex');
  await pool.query('UPDATE users SET verificationToken = ? WHERE id = ?', [newToken, user.id]);
  const verifyURL = `${process.env.CLIENT_URL}/verify-email/${newToken}`;
  await sendAppEmail(req, res, {
    to: email,
    subject: 'Verify Your Email',
    html: `<p>Please click <a href="${verifyURL}">here</a> to verify your email address.</p>`
  });
  res.json({ success: true, message: 'Verification email resent.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const pool = req.app.locals.pool;
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  await pool.query('UPDATE users SET verificationToken = ? WHERE id = ?', [resetToken, user.id]);
  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  await sendAppEmail(req, res, {
    to: email,
    subject: 'Reset Your Password',
    html: `<p>Reset your password <a href="${resetURL}">here</a></p>`
  });
  res.json({ success: true, message: 'Password reset email sent' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, profilePicture } = req.body;
  const pool = req.app.locals.pool;
  await pool.query(
    'UPDATE users SET firstName = ?, lastName = ?, profilePicture = ?, updatedAt = NOW() WHERE id = ?',
    [firstName, lastName, profilePicture || null, req.user.id]
  );
  const [rows] = await pool.query(
    'SELECT id, firstName, lastName, email, role, profilePicture, isVerified, isBlocked, isApproved FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json({ success: true, user: rows[0] });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;
  const [rows] = await pool.query(
    'SELECT id, firstName, lastName, email, role, profilePicture, isVerified, isBlocked, isApproved FROM users WHERE id = ?',
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

export const logout = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;
  const token = req.body.refreshToken || req.cookies.refreshToken;
  if (token) await deleteRefreshToken(pool, token);
  res.clearCookie('authToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const pool = req.app.locals.pool;
  const data = await verifyRefreshToken(pool, refreshToken);
  if (!data) return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [data.user_id]);
  const user = rows[0];
  await deleteRefreshToken(pool, refreshToken);
  const newAccess = generateAccessToken(res, user.id, user.role);
  const newRefresh = await generateRefreshToken(pool, user.id);
  res.json({ success: true, token: newAccess, refreshToken: newRefresh });
});

export const googleAuthCallback = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const pool = req.app.locals.pool;
  const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
  const { email, given_name: fn, family_name: ln } = ticket.getPayload();
  let [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  let user = rows[0];
  if (!user) {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO users (id, firstName, lastName, email, isVerified, isApproved, isBlocked, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, true, true, false, "user", NOW(), NOW())',
      [id, fn || 'Google', ln || 'User', email]
    );
    [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    user = rows[0];
  }
  const access = generateAccessToken(res, user.id, user.role);
  const refresh = await generateRefreshToken(pool, user.id);
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    },
    token: access,
    refreshToken: refresh
  });
});
export const googleAuth = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Google token is required' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, given_name: firstName, family_name: lastName } = ticket.getPayload();
    const pool = req.app.locals.pool;

    let [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user = rows[0];

    if (!user) {
      const id = uuidv4();
      await pool.query(
        'INSERT INTO users (id, firstName, lastName, email, isVerified, isApproved, isBlocked, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, true, true, false, "user", NOW(), NOW())',
        [id, firstName || 'Google', lastName || 'User', email]
      );
      [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      user = rows[0];
    }

    const accessToken = generateAccessToken(res, user.id, user.role);
    const refreshToken = await generateRefreshToken(pool, user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
});