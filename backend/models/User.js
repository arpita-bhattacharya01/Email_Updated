import promisePool from '../config/db.js';
import bcrypt from 'bcryptjs';

// ✅ Create new user
export const createUser = async ({
  firstName,
  lastName,
  email,
  password,
  role = 'user',
  isVerified = false,
  verificationToken = null,
  isBlocked = false,
  isApproved = false,
  profilePicture = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
}) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await promisePool.query(
      `INSERT INTO users (
        firstName, lastName, email, password_hash, profilePicture,
        role, isVerified, verificationToken, isBlocked, isApproved,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        firstName,
        lastName,
        email,
        hashedPassword,
        profilePicture,
        role,
        isVerified,
        verificationToken,
        isBlocked,
        isApproved,
      ]
    );

    const userId = result.insertId;

    return { id: userId, firstName, lastName, email, profilePicture, role };
  } catch (error) {
    console.error('❌ CreateUser Error:', error);
    throw new Error('Failed to create user');
  }
};

// ✅ Get user by email (includes password hash)
export const getUserByEmail = async (email) => {
  const [rows] = await promisePool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

// ✅ Get user by ID (excludes password)
export const getUserById = async (id) => {
  const [rows] = await promisePool.query(
    `SELECT id, firstName, lastName, email, profilePicture, role,
            isVerified, isBlocked, isApproved, lastLogin, createdAt, updatedAt
     FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

// ✅ Update last login
export const updateLastLogin = async (userId) => {
  await promisePool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [userId]);
};

// ✅ Compare passwords
export const matchPassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

// ✅ Refresh token ops
export const getRefreshTokenByToken = async (token) => {
  const [rows] = await promisePool.query('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
  return rows[0] || null;
};

export const saveRefreshToken = async (userId, token, expiresAt = null) => {
  const query = expiresAt
    ? 'INSERT INTO refresh_tokens (user_id, token, created_at, expires_at) VALUES (?, ?, NOW(), ?)'
    : 'INSERT INTO refresh_tokens (user_id, token, created_at) VALUES (?, ?, NOW())';
  const params = expiresAt ? [userId, token, expiresAt] : [userId, token];
  await promisePool.query(query, params);
};

export const deleteRefreshTokenByUserId = async (userId, token) => {
  await promisePool.query('DELETE FROM refresh_tokens WHERE user_id = ? AND token = ?', [userId, token]);
};
export const deleteRefreshTokenByToken = async (token) => {
  await promisePool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
};