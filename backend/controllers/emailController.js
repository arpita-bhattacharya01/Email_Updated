import dotenv from 'dotenv';
dotenv.config();

import db from '../config/db.js';
import nodemailer from 'nodemailer';
import { getUserByEmail } from '../models/User.js';
import Email from '../models/Email.js';

// Initialize SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP verification failed:', err.message);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

// Send Email Utility
export const sendAppEmail = async ({ to, subject, html }) => {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.error('❌ Invalid recipient email:', to);
    throw new Error('Email sending failed: Invalid recipient');
  }

  const from = process.env.SMTP_USER || process.env.EMAIL_FROM;

  const mailOptions = {
    from: `"EmailWeb App" <${from}>`,
    to,
    subject,
    html,
  };

  try {
    console.log(`📧 Sending email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ Email sending failed:', err.message);
    throw new Error('Email sending failed');
  }
};

// Send new email
export const sendNewEmail = async (req, res) => {
  try {
    console.log('📥 sendNewEmail req.body:', JSON.stringify(req.body, null, 2));

    const { recipientEmail, subject, body, attachments = [], labels = [] } = req.body;
    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const invalidPattern = /^(https?:\/\/|\/:)/;
    for (const field of [recipientEmail, subject, body, ...labels, ...attachments.map(a => a.path || '')]) {
      if (typeof field === 'string' && invalidPattern.test(field)) {
        console.error('❌ Invalid field content:', field);
        return res.status(400).json({ success: false, message: 'Invalid field content: URLs not allowed' });
      }
    }

    const senderId = req.user?.id;
    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: sender missing' });
    }

    const recipient = await getUserByEmail(recipientEmail);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // Store in "sent" and "inbox"
    await Email.createEmail({ senderId, recipientId: recipient.id, subject, body, folder: 'sent', attachments, labels });
    await Email.createEmail({ senderId, recipientId: recipient.id, subject, body, folder: 'inbox', attachments, labels });

    await sendAppEmail({ to: recipientEmail, subject, html: body });

    res.status(201).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('❌ sendNewEmail Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
};

// Fetch emails
export const getEmails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const folder = req.query.folder || null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let query = `SELECT * FROM emails WHERE (senderId = ? OR recipientId = ?) AND isDeleted = false`;
    const params = [userId, userId];

    if (folder) {
      query += ` AND folder = ?`;
      params.push(folder);
    }

    query += ` ORDER BY createdAt DESC`;

    const [rows] = await db.query(query, params);
    res.status(200).json({ success: true, emails: rows });
  } catch (error) {
    console.error('❌ getEmails Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get email by ID
export const getEmailById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const emailId = req.params.id;

    const [rows] = await db.query(
      'SELECT * FROM emails WHERE id = ? AND (senderId = ? OR recipientId = ?)',
      [emailId, userId, userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    res.status(200).json({ success: true, email: rows[0] });
  } catch (error) {
    console.error('❌ getEmailById Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Move to trash
export const moveToTrash = async (req, res) => {
  try {
    const userId = req.user?.id;
    const emailId = req.params.id;

    const [result] = await db.query(
      'UPDATE emails SET folder = "trash" WHERE id = ? AND (senderId = ? OR recipientId = ?)',
      [emailId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Email not found or unauthorized' });
    }

    res.json({ success: true, message: 'Email moved to trash' });
  } catch (error) {
    console.error('❌ moveToTrash Error:', error);
    res.status(500).json({ success: false, message: 'Server error moving to trash' });
  }
};

// Permanently delete email
export const deleteEmail = async (req, res) => {
  try {
    const userId = req.user?.id;
    const emailId = req.params.id;

    const [result] = await db.query(
      'DELETE FROM emails WHERE id = ? AND (senderId = ? OR recipientId = ?)',
      [emailId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Email not found or unauthorized' });
    }

    res.json({ success: true, message: 'Email permanently deleted' });
  } catch (error) {
    console.error('❌ deleteEmail Error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting email' });
  }
};

// Mark as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const emailId = req.params.id;

    const [result] = await db.query(
      'UPDATE emails SET isRead = true WHERE id = ? AND (senderId = ? OR recipientId = ?)',
      [emailId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Email not found or unauthorized' });
    }

    res.json({ success: true, message: 'Email marked as read' });
  } catch (error) {
    console.error('❌ markAsRead Error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// Star email
export const starEmail = async (req, res) => {
  try {
    const userId = req.user?.id;
    const emailId = req.params.id;

    const [result] = await db.query(
      'UPDATE emails SET isStarred = true WHERE id = ? AND (senderId = ? OR recipientId = ?)',
      [emailId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Email not found or unauthorized' });
    }

    res.json({ success: true, message: 'Email starred' });
  } catch (error) {
    console.error('❌ starEmail Error:', error);
    res.status(500).json({ success: false, message: 'Failed to star email' });
  }
};

// Update email (read, star, folder, labels)
export const updateEmail = async (req, res) => {
  try {
    console.log('📥 updateEmail req.body:', JSON.stringify(req.body, null, 2));

    const userId = req.user?.id;
    const emailId = req.params.id;
    const { isRead, isStarred, folder, labels } = req.body;

    const invalidPattern = /^(https?:\/\/|\/:)/;
    if (folder && invalidPattern.test(folder)) {
      console.error('❌ Invalid folder:', folder);
      return res.status(400).json({ success: false, message: 'Invalid folder: URLs not allowed' });
    }
    if (labels && labels.some(label => typeof label === 'string' && invalidPattern.test(label))) {
      console.error('❌ Invalid labels:', labels);
      return res.status(400).json({ success: false, message: 'Invalid labels: URLs not allowed' });
    }

    const updates = [];
    const params = [];

    if (typeof isRead === 'boolean') {
      updates.push('isRead = ?');
      params.push(isRead);
    }
    if (typeof isStarred === 'boolean') {
      updates.push('isStarred = ?');
      params.push(isStarred);
    }
    if (folder) {
      updates.push('folder = ?');
      params.push(folder);
    }
    if (labels) {
      updates.push('labels = ?');
      params.push(JSON.stringify(labels));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(emailId, userId, userId);

    const [result] = await db.query(
      `UPDATE emails SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ? AND (senderId = ? OR recipientId = ?)`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Email not found or unauthorized' });
    }

    res.json({ success: true, message: 'Email updated successfully' });
  } catch (error) {
    console.error('❌ updateEmail Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating email' });
  }
};

// Email stats for dashboard
export const getEmailStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [rows] = await db.query(
      `SELECT 
        COUNT(*) AS totalEmails,
        SUM(CASE WHEN isRead THEN 1 ELSE 0 END) AS readEmails,
        SUM(CASE WHEN isStarred THEN 1 ELSE 0 END) AS starredEmails,
        SUM(CASE WHEN folder = 'inbox' THEN 1 ELSE 0 END) AS inboxCount,
        SUM(CASE WHEN folder = 'sent' THEN 1 ELSE 0 END) AS sentCount,
        SUM(CASE WHEN folder = 'trash' THEN 1 ELSE 0 END) AS trashCount
      FROM emails
      WHERE senderId = ? OR recipientId = ?`,
      [userId, userId]
    );

    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    console.error('❌ getEmailStats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve email stats' });
  }
};
