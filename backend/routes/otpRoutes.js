import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import axios from 'axios';
import { sendEmail } from './emailController.js';

// ✅ Generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ✅ Rate-limit map to avoid abuse
const cooldowns = new Map();
const COOLDOWN_MS = 60 * 1000; // 1 min cooldown

// ✅ Save logs for monitoring OTP usage
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

// ✅ Verify CAPTCHA using Google
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
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  // ✅ CAPTCHA Check
  const isCaptchaValid = await verifyCaptcha(captchaToken);
  if (!isCaptchaValid) {
    await logOtpActivity(req.app.locals.pool, email, 'send', 'captcha-fail', ip, userAgent);
    return res.status(403).json({ success: false, message: 'CAPTCHA verification failed' });
  }

  // ✅ Cooldown check
  const lastSent = cooldowns.get(email);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    return res.status(429).json({ success: false, message: `Please wait ${waitTime}s before retrying.` });
  }

  const pool = req.app.locals.pool;
  const otp = generateOTP();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  try {
    await pool.query('DELETE FROM otps WHERE email = ?', [email]);

    await pool.query(
      `INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)`,
      [email, hashedOTP, expires_at]
    );

    const html = `
      <h2>Your OTP Code</h2>
      <p>Use the following OTP to ${isResend ? 'continue verification' : 'verify your email'}:</p>
      <h3>${otp}</h3>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    await sendEmail({
      to: email,
      subject: 'Email Verification OTP',
      html,
    });

    cooldowns.set(email, Date.now());

    await logOtpActivity(pool, email, 'send', 'success', ip, userAgent);
    console.log(`[OTP SENT] ${email} (${isResend ? 'resend' : 'initial'})`);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[Send OTP Error]:', error);
    await logOtpActivity(pool, email, 'send', 'fail', ip, userAgent);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// ✅ Verify OTP
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!email || !otp || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const pool = req.app.locals.pool;
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  try {
    const [rows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW()',
      [email, hashedOTP]
    );

    const record = rows[0];
    if (!record) {
      await logOtpActivity(pool, email, 'verify', 'fail', ip, userAgent);
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await pool.query('DELETE FROM otps WHERE id = ?', [record.id]);

    await logOtpActivity(pool, email, 'verify', 'success', ip, userAgent);
    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('[Verify OTP Error]:', error);
    await logOtpActivity(pool, email, 'verify', 'fail', ip, userAgent);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

// ✅ Resend OTP
export const resendOTP = asyncHandler(async (req, res) => {
  const { email, captchaToken } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  // ✅ CAPTCHA Check
  const isCaptchaValid = await verifyCaptcha(captchaToken);
  if (!isCaptchaValid) {
    return res.status(403).json({ success: false, message: 'CAPTCHA verification failed' });
  }

  req.body.isResend = true; // Mark as resend
  await sendOTP(req, res);
});
