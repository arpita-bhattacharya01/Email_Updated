// routes/otpRoutes.js
import express from 'express';
import {
  sendOTP,
  verifyOTP,
  resendOTP
} from '../controllers/otpController.js';

const router = express.Router();

// @route   POST /api/auth/send-otp
router.post('/send-otp', sendOTP);

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', verifyOTP);

// @route   POST /api/auth/resend-otp
router.post('/resend-otp', resendOTP);

export default router;
