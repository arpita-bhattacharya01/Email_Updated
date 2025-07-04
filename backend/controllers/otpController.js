// controllers/otpController.js
import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import  sendAppEmail  from './emailController.js';

// === Helper Functions ===
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const cooldowns = new Map();
const COOLDOWN_MS = 60 * 1000;

// === Log OTP activity ===
const logOtpActivity = async (pool, email, type, status, ip, userAgent) => {
  try {
    await pool.query(
      `INSERT INTO otp_logs (email, type, status, ip, user_agent, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [email, type, status, ip || null, userAgent || null]
    );
  } catch (err) {
    console.warn('[OTP LOGGING FAILED]', err.message);
  }
};

// === Verify Google reCAPTCHA ===
const verifyCaptcha = async (token) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const { data } = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: { secret, response: token },
    });
    return data.success && (data.score ?? 1) >= 0.5;
  } catch (err) {
    console.error('[CAPTCHA VERIFY ERROR]', err.message);
    return false;
  }
};

// === Send OTP ===
export const sendOTP = asyncHandler(async (req, res) => {
  const { email, isResend, captchaToken } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  const isCaptchaValid = await verifyCaptcha(captchaToken);
  if (!isCaptchaValid) {
    await logOtpActivity(req.app.locals.pool, email, 'send', 'captcha-fail', ip, userAgent);
    return res.status(403).json({ success: false, message: 'CAPTCHA verification failed' });
  }

  const lastSent = cooldowns.get(email);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${waitTime}s before retrying.`,
    });
  }

  const pool = req.app.locals.pool;
  const otp = generateOTP();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await pool.query('DELETE FROM otps WHERE email = ?', [email]);
  await pool.query(
    'INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)',
    [email, hashedOTP, expires_at]
  );

  const html = `
    <h2>Your OTP Code</h2>
    <p>Use this OTP to sign in:</p>
    <h3>${otp}</h3>
    <p>This OTP will expire in 10 minutes.</p>
  `;

  await sendAppEmail({
    to: email,
    subject: 'OTP for Login',
    html,
  });

  cooldowns.set(email, Date.now());
  await logOtpActivity(pool, email, 'send', 'success', ip, userAgent);

  res.status(200).json({ success: true, message: 'OTP sent successfully' });
});

// === Verify OTP & Login/Register ===
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !otp || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const pool = req.app.locals.pool;
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  const [rows] = await pool.query(
    'SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW()',
    [email, hashedOTP]
  );

  const otpRecord = rows[0];
  if (!otpRecord) {
    await logOtpActivity(pool, email, 'verify', 'fail', ip, userAgent);
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  await pool.query('DELETE FROM otps WHERE id = ?', [otpRecord.id]);

  // Check user existence
  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

  let userId = user?.id;
  let role = user?.role;

  if (!user) {
    const username = email.split('@')[0];
    const [result] = await pool.query(
      'INSERT INTO users (email, username, role, created_at) VALUES (?, ?, ?, NOW())',
      [email, username, 'user']
    );
    userId = result.insertId;
    role = 'user';
  }

  // Issue JWT tokens
  const accessToken = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  await pool.query('INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)', [userId, refreshToken]);

  res
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({
      success: true,
      message: 'OTP verified, logged in',
      accessToken,
      role,
    });
});

// === Resend OTP ===
export const resendOTP = asyncHandler(async (req, res) => {
  const { email, captchaToken } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  const isCaptchaValid = await verifyCaptcha(captchaToken);
  if (!isCaptchaValid) {
    return res.status(403).json({ success: false, message: 'CAPTCHA verification failed' });
  }

  req.body.isResend = true;
  await sendOTP(req, res); // Reuse sendOTP logic
});
// === Exported Routes ===
export default {        
    sendOTP,
    verifyOTP,
    resendOTP,
    };