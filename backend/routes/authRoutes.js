// routes/authRoutes.js
import express from 'express';
import multer from 'multer';
import asyncHandler from 'express-async-handler';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  signup,
  signin,
  forgotPassword as userForgotPassword,
  resetPassword as userResetPassword,
  refreshToken,
  getUserProfile,
} from '../controllers/authController.js';

import {
  adminSignup,
  adminSignin,
  getAdminProfile,
  updateAdminProfile,
  adminForgotPassword,
  adminResetPassword,
} from '../controllers/adminController.js';

import {
  sendOTP,
  verifyOTP,
  resendOTP,
} from '../controllers/otpVerification.js';

import {
  sendNewEmail,
  getEmails,
  getEmailById,
  moveToTrash,
  deleteEmail,
  markAsRead,
  starEmail,
  updateEmail,
  getEmailStats,
} from '../controllers/emailController.js';

import { getEmailsByUserId } from '../models/Email.js';
import { submitContactForm } from '../controllers/contactController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, join(__dirname, '../Uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { files: 5 } });

// ✅ User Auth
router.post('/auth/signup', signup);
router.post('/auth/signin', signin);
router.post('/auth/forgot-password', userForgotPassword);
router.post('/auth/reset-password/:token', userResetPassword);

// ✅ Admin Auth
router.post('/auth/admin/signup', adminSignup);
router.post('/auth/admin/signin', adminSignin);
router.post('/auth/admin/forgot-password', adminForgotPassword);
router.post('/auth/admin/reset-password/:token', adminResetPassword);

// ✅ OTP
router.post('/auth/send-otp', sendOTP);
router.post('/auth/verify-otp', verifyOTP);
router.post('/auth/resend-otp', resendOTP);

// ✅ Email
router.post('/emails', protect, upload.array('files'), sendNewEmail);
router.get('/emails/user/:userId', protect, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // ✅ Guard against malformed route like /emails/user/:
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid userId' });
  }

  const folder = req.query.folder || 'inbox';
  const result = await getEmailsByUserId({ userId, folder });
  res.json({ success: true, ...result });
}));

router.get('/emails', protect, getEmails);
router.get('/emails/:id', protect, getEmailById);
router.put('/emails/:id', protect, updateEmail);
router.patch('/emails/:id/star', protect, starEmail);
router.patch('/emails/:id/read', protect, markAsRead);
router.patch('/emails/:id/trash', protect, moveToTrash);
router.delete('/emails/:id', protect, deleteEmail);
router.get('/emails/stats', protect, getEmailStats);

// ✅ Contact
router.post('/auth/contact', submitContactForm);

// ✅ Token Refresh
router.post('/auth/refresh-token', refreshToken);

// ✅ Profiles
router.get('/auth/me', protect, getUserProfile);
router.get('/auth/admin/me', protect, authorizeRoles('admin'), (req, res) =>
  res.status(200).json({ success: true, user: req.user })
);
router.get('/auth/admin', protect, authorizeRoles('admin'), (req, res) =>
  res.status(200).json({ success: true, message: 'Welcome, Admin!' })
);
router.get('/auth/admin/profile', protect, authorizeRoles('admin'), getAdminProfile);
router.put('/auth/admin/profile', protect, authorizeRoles('admin'), updateAdminProfile);

// ✅ Debug route (token test)
router.get('/debug/token', (req, res) => {
  const jwt = require('jsonwebtoken');
  const user = { id: 'test-user-id', role: 'user' };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.status(200).json({ success: true, token });
});

// ✅ Ping
router.get('/ping', (req, res) => res.status(200).send('pong'));

// ✅ Catch-all 404
router.all('*', (req, res, next) => {
  try {
    const url = decodeURIComponent(req.originalUrl || '');
    if (url.startsWith('http')) {
      throw new Error('Invalid full URL passed as route');
    }
    res.status(404).json({ success: false, message: 'Route not found' });
  } catch (err) {
    next(err);
  }
});


export default router;
