import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { sendAppEmail as sendEmail } from './emailController.js';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const cooldowns = new Map();
const COOLDOWN_MS = 60 * 1000;

async function logOtpActivity(pool, email, type, status, ip, userAgent) {
  try {
    await pool.query(
      `INSERT INTO otp_logs (email, type, status, ip, user_agent, timestamp) VALUES (?, ?, ?, ?, ?, NOW())`,
      [email, type, status, ip || null, userAgent || null]
    );
  } catch (err) {
    console.warn('[OTP LOGGING FAILED]', err.message);
  }
}

async function verifyCaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const { data } = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret,
        response: token,
      },
    });
    return data.success && (data.score ?? 1) >= 0.5;
  } catch (err) {
    console.error('[CAPTCHA VERIFY ERROR]', err.message);
    return false;
  }
}

// ✅ Send OTP
export const sendOTP = asyncHandler(async (req, res) => {
  const { email, isResend, captchaToken } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const normalizedEmail = email?.toLowerCase();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  const isCaptchaValid = await verifyCaptcha(captchaToken);
  if (!isCaptchaValid) {
    await logOtpActivity(req.app.locals.pool, normalizedEmail, 'send', 'captcha-fail', ip, userAgent);
    return res.status(403).json({ success: false, message: 'CAPTCHA verification failed' });
  }

  const lastSent = cooldowns.get(normalizedEmail);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    return res.status(429).json({ success: false, message: `Please wait ${waitTime}s before retrying.` });
  }

  const pool = req.app.locals.pool;
  const otp = generateOTP();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await pool.query('DELETE FROM otps WHERE email = ?', [normalizedEmail]);
    await pool.query('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', [normalizedEmail, hashedOTP, expires_at]);

    const html = `
      <h2>Your OTP Code</h2>
      <p>Use the following OTP to ${isResend ? 'continue verification' : 'verify your email'}:</p>
      <h3>${otp}</h3>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject: 'Email Verification OTP',
      html,
    });

    cooldowns.set(normalizedEmail, Date.now());
    await logOtpActivity(pool, normalizedEmail, 'send', 'success', ip, userAgent);

    console.log(`[OTP SENT] ${normalizedEmail} (${isResend ? 'resend' : 'initial'})`);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[Send OTP Error]:', error);
    await logOtpActivity(pool, normalizedEmail, 'send', 'fail', ip, userAgent);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// ✅ Verify OTP
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail || !otp || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  const pool = req.app.locals.pool;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW()',
      [normalizedEmail, hashedOTP]
    );

    const record = rows?.[0];
    if (!record) {
      await logOtpActivity(pool, normalizedEmail, 'verify', 'fail', ip, userAgent);
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Optional: Look up user
    const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    const user = userRows?.[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please sign up.' });
    }

    // Clean up OTP
    await pool.query('DELETE FROM otps WHERE id = ?', [record.id]);

    // Generate JWT token
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });

    await logOtpActivity(pool, normalizedEmail, 'verify', 'success', ip, userAgent);

    res
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        sameSite: 'Strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'Strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ success: true, message: 'OTP verified successfully', user: { id: user.id, role: user.role, email: user.email } });
  } catch (error) {
    console.error('[Verify OTP Error]:', error);
    await logOtpActivity(pool, normalizedEmail, 'verify', 'fail', ip, userAgent);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

// ✅ Resend OTP
export const resendOTP = asyncHandler(async (req, res) => {
  const { email, captchaToken } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  req.body.isResend = true;
  await sendOTP(req, res);
});
