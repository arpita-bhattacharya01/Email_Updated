import promisePool from '../config/db.js';

// ✅ Create a new email
export async function createEmail({
  senderId,
  recipientId,
  subject,
  body,
  folder = 'inbox',
  labels = [],
  attachments = [],
}) {
  console.log('📥 createEmail input:', { senderId, recipientId, subject, body, folder, labels, attachments });

  const invalidPattern = /^(https?:\/\/|\/:)/;
  for (const field of [subject, body, folder, ...labels]) {
    if (typeof field === 'string' && invalidPattern.test(field)) {
      throw new Error('Invalid field content: URLs not allowed');
    }
  }
  for (const attachment of attachments) {
    if (attachment.path && invalidPattern.test(attachment.path)) {
      throw new Error('Invalid attachment path: URLs not allowed');
    }
  }

  const [result] = await promisePool.query(
    `INSERT INTO emails (
      senderId, recipientId, subject, body,
      folder, labels, attachments,
      isRead, isStarred, isTrash, isDeleted, status,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, false, false, false, false, 'pending', NOW())`,
    [
      senderId,
      recipientId,
      subject,
      body,
      folder,
      JSON.stringify(labels ?? []),
      JSON.stringify(attachments ?? []),
    ]
  );

  return { id: result.insertId };
}

// ✅ Get email by ID
export async function getEmailById(emailId, userId = null) {
  let query = `SELECT * FROM emails WHERE id = ? AND isDeleted = false`;
  const params = [emailId];

  if (userId) {
    query += ` AND (senderId = ? OR recipientId = ?)`;
    params.push(userId, userId);
  }

  const [rows] = await promisePool.query(query, params);
  return rows[0] || null;
}

// ✅ Get emails by user and folder
export async function getEmailsByUserId({
  userId,
  folder = 'inbox',
  isRead,
  isStarred,
  search = '',
  limit = 20,
  offset = 0,
}) {
  console.log('📥 getEmailsByUserId input:', { userId, folder, isRead, isStarred, search, limit, offset });

  if (typeof search === 'string' && /^(https?:\/\/|\/:)/.test(search)) {
    throw new Error('Invalid search term: URLs not allowed');
  }

  const conditions = [`(senderId = ? OR recipientId = ?)`, `folder = ?`, `isDeleted = false`];
  const params = [userId, userId, folder];

  if (typeof isRead === 'boolean') {
    conditions.push(`isRead = ?`);
    params.push(isRead);
  }

  if (typeof isStarred === 'boolean') {
    conditions.push(`isStarred = ?`);
    params.push(isStarred);
  }

  if (search) {
    conditions.push(`(subject LIKE ? OR body LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM emails ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await promisePool.query(query, params);
  const [countResult] = await promisePool.query(
    `SELECT COUNT(*) AS count FROM emails ${whereClause}`,
    params.slice(0, -2)
  );

  return {
    emails: rows,
    totalCount: countResult[0].count,
  };
}

// ✅ Mark email as read
export async function markAsRead(emailId) {
  const [result] = await promisePool.query(
    `UPDATE emails SET isRead = true WHERE id = ?`,
    [emailId]
  );
  return result.affectedRows > 0;
}

// ✅ Star email
export async function starEmail(emailId) {
  const [result] = await promisePool.query(
    `UPDATE emails SET isStarred = true WHERE id = ?`,
    [emailId]
  );
  return result.affectedRows > 0;
}

// ✅ Move to trash
export async function moveToTrash(emailId, userId = null) {
  let query = `UPDATE emails SET isTrash = true, folder = 'trash' WHERE id = ?`;
  const params = [emailId];

  if (userId) {
    query += ` AND recipientId = ?`;
    params.push(userId);
  }

  const [result] = await promisePool.query(query, params);
  return result.affectedRows > 0;
}

// ✅ Soft delete
export async function deleteEmail(emailId, userId = null) {
  let query = `UPDATE emails SET isDeleted = true WHERE id = ?`;
  const params = [emailId];

  if (userId) {
    query += ` AND (senderId = ? OR recipientId = ?)`;
    params.push(userId, userId);
  }

  const [result] = await promisePool.query(query, params);
  return result.affectedRows > 0;
}

// ✅ Update email (labels, folder, flags)
export async function updateEmail(emailId, userId, updateData) {
  console.log('📥 updateEmail input:', { emailId, userId, updateData });

  const { isRead, isStarred, folder, labels } = updateData;
  const invalidPattern = /^(https?:\/\/|\/:)/;

  if (folder && invalidPattern.test(folder)) {
    throw new Error('Invalid folder: URLs not allowed');
  }
  if (labels && labels.some(label => typeof label === 'string' && invalidPattern.test(label))) {
    throw new Error('Invalid labels: URLs not allowed');
  }

  const [existing] = await promisePool.query(
    `SELECT * FROM emails WHERE id = ? AND recipientId = ?`,
    [emailId, userId]
  );
  if (existing.length === 0) return null;

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

  if (updates.length > 0) {
    await promisePool.query(
      `UPDATE emails SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ? AND recipientId = ?`,
      [...params, emailId, userId]
    );
  }

  return getEmailById(emailId, userId);
}

// ✅ Delete permanently
export async function deletePermanently(emailId, userId = null) {
  let query = `DELETE FROM emails WHERE id = ?`;
  const params = [emailId];

  if (userId) {
    query += ` AND (senderId = ? OR recipientId = ?)`;
    params.push(userId, userId);
  }

  const [result] = await promisePool.query(query, params);
  return result.affectedRows > 0;
}

// ✅ Export all
export default {
  createEmail,
  getEmailById,
  getEmailsByUserId,
  markAsRead,
  starEmail,
  moveToTrash,
  deleteEmail,
  updateEmail,
  deletePermanently,
};
