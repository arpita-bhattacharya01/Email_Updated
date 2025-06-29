// controllers/contactController.js
import asyncHandler from 'express-async-handler';
import { sendAppEmail as sendEmail } from './emailController.js';

// ✅ Submit Contact Form
export const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  // 🚫 Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields (name, email, message) are required' });
  }

  // 📧 Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  // 🔐 Check for ADMIN_EMAIL in environment
  if (!process.env.ADMIN_EMAIL) {
    console.error('❌ Missing environment variable: ADMIN_EMAIL');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  const pool = req.app.locals.pool;

  try {
    // ✅ Store in MySQL (let ID auto-increment)
    await pool.query(
      `INSERT INTO contacts (name, email, message, createdAt)
       VALUES (?, ?, ?, NOW())`,
      [name, email, message]
    );

    // ✅ Send email to admin
    const htmlContent = `
      <h2>📩 New Contact Request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br/>${message}</p>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'New Contact Form Submission',
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      message: 'Contact form submitted and email sent successfully',
    });
  } catch (error) {
    console.error('❌ Contact form error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to process contact form submission' });
  }
});

// ✅ Get Contact Form Submissions (Admin Only)
export const getContactSubmissions = asyncHandler(async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const [rows] = await pool.query('SELECT * FROM contacts ORDER BY createdAt DESC');
    return res.status(200).json({ success: true, submissions: rows });
  } catch (error) {
    console.error('❌ getContactSubmissions error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch contact submissions' });
  }
});
