CREATE DATABASE IF NOT EXISTS email_app;
USE email_app;


---users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profilePicture VARCHAR(255) DEFAULT 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
  role ENUM('user', 'admin') DEFAULT 'user',
  isVerified BOOLEAN DEFAULT TRUE,
  isBlocked BOOLEAN DEFAULT FALSE,
  isApproved BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastLogin TIMESTAMP NULL
);

--- Password is stored as password_hash using bcrypt.


--- emails table
CREATE TABLE IF NOT EXISTS emails (
  id VARCHAR(36) PRIMARY KEY,
  senderId VARCHAR(36),
  recipientId VARCHAR(36),
  to_email VARCHAR(255),
  from_email VARCHAR(255),
  subject VARCHAR(255),
  body TEXT,
  folder VARCHAR(50) DEFAULT 'inbox', -- inbox, sent, trash
  labels JSON,
  attachments JSON,
  isRead BOOLEAN DEFAULT FALSE,
  isStarred BOOLEAN DEFAULT FALSE,
  isTrash BOOLEAN DEFAULT FALSE,
  isDeleted BOOLEAN DEFAULT FALSE,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error_message TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL,
  FOREIGN KEY (senderId) REFERENCES users(id),
  FOREIGN KEY (recipientId) REFERENCES users(id)
);



---refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

---Insert Sample Admin
-- Replace <HASHED_PASSWORD> with a bcrypt hash from Node.js
INSERT INTO users (id, firstName, lastName, email, password_hash, role, isVerified, isBlocked, isApproved)
VALUES (
  UUID(),
  'Admin',
  'User',
  'admin@example.com',
  '$2a$10$u9UG6oFv9akFwC9jhvC6VuXtfAcRmt9VRkEJyw1v8LyqDcv0zRCRe', -- password: Admin@123
  'admin',
  true,
  false,
  true
);
---Hash for Admin@123 above.


