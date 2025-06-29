// ✅ backend/routes/adminRoutes.js
import express from 'express';
import { adminSignin, adminLogout } from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import promisePool from '../config/db.js';
import {
  adminForgotPassword,
  adminResetPassword,
} from '../controllers/adminController.js';
const router = express.Router();

/* ----------------------------
   🔐 Admin Authentication
---------------------------- */
router.post('/auth/admin/signin', adminSignin);

// 🔐 All routes below this require Admin Authentication
router.use(protect);
router.use(authorizeRoles('admin'));

router.post('/auth/admin/logout', adminLogout);

router.get('/auth/admin/me', (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

router.get('/auth/admin', (_req, res) => {
  res.status(200).json({ success: true, message: 'Welcome, Admin!' });
});

/* ----------------------------
   📊 Admin Dashboard: User Stats
---------------------------- */
router.get('/admin/user-stats', async (_req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) AS totalUsers,
        COUNT(CASE WHEN createdAt >= NOW() - INTERVAL 7 DAY THEN 1 END) AS newUsersLast7Days,
        COUNT(CASE WHEN isBlocked = TRUE THEN 1 END) AS blockedUsers,
        COUNT(CASE WHEN deletedAt IS NOT NULL THEN 1 END) AS deletedUsers,
        COUNT(CASE WHEN lastLogin < NOW() - INTERVAL 30 DAY THEN 1 END) AS unusedUsersOver30Days,
        COUNT(CASE WHEN lastLogin >= NOW() - INTERVAL 7 DAY THEN 1 END) AS activeUsersLast7Days
      FROM users
      WHERE role = 'user';
    `;
    const [rows] = await promisePool.query(query);
    res.status(200).json({ success: true, ...rows[0] });
  } catch (error) {
    console.error('❌ Error fetching user stats:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch user stats' });
  }
});

/* ----------------------------
   👥 Admin User Management
---------------------------- */
router.get('/admin/users', async (_req, res) => {
  try {
    const [users] = await promisePool.query(
      "SELECT id, firstName, lastName, email, role, isBlocked, isApproved, lastLogin, createdAt, deletedAt FROM users WHERE role = 'user' ORDER BY createdAt DESC"
    );
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.put('/admin/users/:id/block', async (req, res) => {
  const { id } = req.params;
  const { block } = req.body;

  if (typeof block !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid block value' });
  }

  try {
    const approvedAt = block ? null : new Date();
    await promisePool.query(
      'UPDATE users SET isBlocked = ?, isApproved = ?, approvedAt = ? WHERE id = ?',
      [block, !block, approvedAt, id]
    );
    res.status(200).json({
      success: true,
      message: `User has been ${block ? 'blocked' : 'unblocked'}`,
    });
  } catch (error) {
    console.error('❌ Error updating block status:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update user block status' });
  }
});

router.delete('/admin/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await promisePool.query('DELETE FROM users WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

router.post('/auth/admin/forgot-password', adminForgotPassword);
router.post('/auth/admin/reset-password/:token', adminResetPassword);

export default router;
