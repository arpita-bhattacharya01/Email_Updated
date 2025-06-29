import promisePool from '../config/db.js';

// ✅ Get all users
export async function getAllUsers() {
  const [rows] = await promisePool.query('SELECT id, firstName, lastName, email, role, isApproved, isBlocked FROM users');
  return rows;
}

// ✅ Approve or block user
export async function updateUserStatus(userId, { isApproved = null, isBlocked = null }) {
  const updates = [];
  const params = [];

  if (isApproved !== null) {
    updates.push('isApproved = ?');
    params.push(isApproved);
  }

  if (isBlocked !== null) {
    updates.push('isBlocked = ?');
    params.push(isBlocked);
  }

  if (updates.length === 0) return false;

  params.push(userId);

  const [result] = await promisePool.query(
    `UPDATE users SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`,
    params
  );

  return result.affectedRows > 0;
}

// ✅ Delete user
export async function deleteUser(userId) {
  const [result] = await promisePool.query('DELETE FROM users WHERE id = ?', [userId]);
  return result.affectedRows > 0;
}
