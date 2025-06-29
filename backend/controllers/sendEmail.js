import dotenv from 'dotenv';
import db from '../config/db.js';
import nodemailer from 'nodemailer';
import { getUserByEmail } from '../models/User.js';
import Email from '../models/Email.js';

dotenv.config();

// ✅ Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Send Email via Nodemailer and log in DB
const sendMailViaNodemailer = async ({ to, subject, html }) => {
  const conn = await db.getConnection();
  let emailId = null;

  try {
    const [result] = await conn.query(
      `INSERT INTO emails (type, to_email, from_email, subject, body, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      ['sent', to, process.env.SMTP_USER, subject, html, 'pending']
    );
    emailId = result.insertId;

    const info = await transporter.sendMail({
      from: `"YourApp Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);

    await conn.query(
      `UPDATE emails SET status = ?, updated_at = NOW() WHERE email_id = ?`,
      ['sent', emailId]
    );
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    if (emailId) {
      await conn.query(
        `UPDATE emails SET status = ?, error_message = ?, updated_at = NOW() WHERE email_id = ?`,
        ['failed', error.message, emailId]
      );
    }
    throw new Error('Email send failed: ' + error.message);
  } finally {
    conn.release();
  }
};

// ✅ Controller to handle sending email
export const sendEmail = async (req, res, next) => {
  try {
    const { recipientEmail, subject, body, attachments = [], labels = [] } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'recipientEmail, subject, and body are required',
      });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const recipient = await getUserByEmail(recipientEmail);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found',
      });
    }

    const senderId = req?.user?.id;
    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: sender not found',
      });
    }

    // Ensure arrays
    const attachmentsArr = Array.isArray(attachments) ? attachments : [];
    const labelsArr = Array.isArray(labels) ? labels : [];

    // Save in sender's "sent" folder
    await Email.createEmail({
      senderId,
      recipientId: recipient.id,
      subject,
      body,
      folder: 'sent',
      attachments: attachmentsArr,
      labels: labelsArr,
    });

    // Save in recipient's "inbox" folder
    await Email.createEmail({
      senderId,
      recipientId: recipient.id,
      subject,
      body,
      folder: 'inbox',
      attachments: attachmentsArr,
      labels: labelsArr,
    });

    // Send via Nodemailer
    await sendMailViaNodemailer({
      to: recipientEmail,
      subject,
      html: body,
    });

    return res.status(201).json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('❌ Error in sendEmail controller:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message,
    });
  }
};

// ✅ Placeholder: OTP sending
export const sendOtp = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'OTP sent (placeholder)' });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};
