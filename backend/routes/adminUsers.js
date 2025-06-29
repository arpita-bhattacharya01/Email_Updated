// backend/routes/adminUsers.js
import express from 'express';
import promisePool from '../config/db.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Middleware: protect all routes and ensure admin access
 */
router.use(protect);
router.use(authorizeRoles('admin'));

/**
 * GET /admin/user-stats
 * Returns statistics about user base
 */
router.get('/user-stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) AS totalUsers,
        COUNT(CASE WHEN createdAt >= NOW() - INTERVAL 7 DAY THEN 1 END) AS newUsersLast7Days,
        COUNT(CASE WHEN isBlocked = TRUE THEN 1 END) AS blockedUsers,
        COUNT(CASE WHEN isApproved = FALSE THEN 1 END) AS unapprovedUsers,
        COUNT(CASE WHEN lastLogin < NOW() - INTERVAL 30 DAY THEN 1 END) AS unusedUsersOver30Days,
        COUNT(CASE WHEN lastLogin >= NOW() - INTERVAL 7 DAY THEN 1 END) AS activeUsersLast7Days
      FROM users;
    `;
    const [statsResult] = await promisePool.query(statsQuery);
    res.status(200).json(statsResult[0]);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

/**
 * GET /admin/users
 * Fetch all users
 */
router.get('/users', async (_req, res) => {
  try {
    const [users] = await promisePool.query('SELECT * FROM users ORDER BY createdAt DESC');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/**
 * PUT /admin/users/:id/block
 * Block or unblock a user
 */
router.put('/users/:id/block', async (req, res) => {
  const userId = req.params.id;
  const { block } = req.body;

  if (typeof block !== 'boolean') {
    return res.status(400).json({ message: 'Invalid block value' });
  }

  try {
    const approvedAt = block ? null : new Date();
    await promisePool.query(
      'UPDATE users SET isBlocked = ?, isApproved = ?, approvedAt = ? WHERE id = ?',
      [block, !block, approvedAt, userId]
    );
    res.status(200).json({ success: true, message: `User ${block ? 'blocked' : 'unblocked'}` });
  } catch (error) {
    console.error('Error updating user block status:', error);
    res.status(500).json({ message: 'Failed to update block status' });
  }
});

/**
 * DELETE /admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    await promisePool.query('DELETE FROM users WHERE id = ?', [userId]);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
