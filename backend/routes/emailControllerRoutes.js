// ✅ backend/routes/emailControllerRoutes.js

import express from 'express';
import {
  sendNewEmail,
  deleteEmail,
  getEmailById,
  getEmails,
  moveToTrash,
  updateEmail,
  markAsRead,
  starEmail,
  getEmailStats
} from '../controllers/emailController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ Apply auth middleware globally
router.use(protect);

/* ----------------------------------------
   📬 Email Routes - Controller Based Logic
---------------------------------------- */

// 📤 Send an email
router.post('/send', sendNewEmail);

// 📥 Get all emails (Inbox/Sent/Drafts/Trash based on folder param or user context)
router.get('/', getEmails);

// 📊 Get email statistics for dashboard
router.get('/stats', getEmailStats);

// 📧 Get single email by ID
router.get('/:id', getEmailById);

// ✏️ Update email (labels, folder, read/starred status)
router.put('/:id', updateEmail);

// ⭐ Mark email as starred
router.patch('/:id/star', starEmail);

// ✅ Mark email as read
router.patch('/:id/read', markAsRead);

// 🗑️ Move email to trash
router.patch('/:id/trash', moveToTrash);

// ❌ Permanently delete email
router.delete('/:id', deleteEmail);

export default router;

// ✅ backend/routes/emailControllerRoutes.js




// import express from 'express';
// import {
//   sendNewEmail,
//   deleteEmail,
//   getEmailById,
//   getEmails,
//   moveToTrash,
//   updateEmail,
//   markAsRead,
//   starEmail,
//   getEmailStats
// } from '../controllers/emailController.js';

// import { protect } from '../middleware/authMiddleware.js';

// const router = express.Router();

// // ✅ All email routes are protected
// router.use(protect);

// /* ----------------------------
//    📧 Controller-Based Routes
// ---------------------------- */

// // ✅ Send an email
// router.post('/send', sendNewEmail);

// // ✅ Get all emails (inbox, sent, etc. based on req.user.id)
// router.get('/', getEmails);

// // ✅ Email stats for dashboard
// router.get('/stats', getEmailStats);

// // ✅ Mark as read
// router.patch('/:id/read', markAsRead);

// // ✅ Star email (optional, if implemented)
// router.patch('/:id/star', starEmail);

// // ✅ Move email to trash
// router.patch('/:id/trash', moveToTrash);

// // ✅ Update email (labels, folder, read/starred)
// router.put('/:id', updateEmail);

// // ✅ Get single email by ID
// router.get('/:id', getEmailById);

// // ✅ Permanently delete email
// router.delete('/:id', deleteEmail);

// export default router;
