CREATE DATABASE IF NOT EXISTS email_app;
USE email_app;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  lastLogin TIMESTAMP NULL,
  resetToken VARCHAR(255),
  resetTokenExpires DATETIME
);

-- Insert Admin  password is Admin@123
INSERT INTO users (firstName, lastName, email, password_hash, role, isVerified, isBlocked, isApproved)
VALUES (
  'Admin',
  'User',
  'admin1234@example.com',
  '$2a$10$u9UG6oFv9akFwC9jhvC6VuXtfAcRmt9VRkEJyw1v8LyqDcv0zRCRe',
  'admin',
  TRUE,
  FALSE,
  TRUE
);

-- EMAILS TABLE
CREATE TABLE IF NOT EXISTS emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  recipientId INT NOT NULL,
  subject TEXT,
  body TEXT,
  folder VARCHAR(50) DEFAULT 'inbox',
  labels JSON DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  isStarred BOOLEAN DEFAULT FALSE,
  isTrash BOOLEAN DEFAULT FALSE,
  isDeleted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  to_email VARCHAR(255),
  from_email VARCHAR(255),
  type VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
);

-- ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emailId INT NOT NULL,
  filePath VARCHAR(255),
  fileName VARCHAR(255),
  mimeType VARCHAR(100),
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emailId) REFERENCES emails(id) ON DELETE CASCADE
);

-- REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX(token)
);

-- OTP TABLE
CREATE TABLE IF NOT EXISTS otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp CHAR(64) NOT NULL, -- SHA-256 hash
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(email)
);

-- OTP LOGS TABLE
CREATE TABLE IF NOT EXISTS otp_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  type ENUM('send', 'verify') NOT NULL,
  status VARCHAR(50),
  ip VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EMAIL THREADS TABLE
CREATE TABLE IF NOT EXISTS email_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


--change from uuid to id 
ALTER TABLE users MODIFY id INT AUTO_INCREMENT PRIMARY KEY;

--Add a New id_int Column (Temporary)
ALTER TABLE users ADD COLUMN id_int INT NOT NULL AUTO_INCREMENT UNIQUE;

--Update Foreign Keys in Other Tables to Use id_int
--Update emails.senderId and recipientId:
--Add new columns:
ALTER TABLE emails ADD COLUMN senderId_int INT;
ALTER TABLE emails ADD COLUMN recipientId_int INT;


--Write a SQL script to map senderId → id → id_int:
UPDATE emails e
JOIN users u ON e.senderId = u.id
SET e.senderId_int = u.id_int;

UPDATE emails e
JOIN users u ON e.recipientId = u.id
SET e.recipientId_int = u.id_int;

--Drop Old Foreign Keys and Columns, Rename id_int → id
--Once everything is migrated:
-- Drop foreign keys
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_1;
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_2;
ALTER TABLE refresh_tokens DROP FOREIGN KEY refresh_tokens_ibfk_1;

-- Drop old ID columns
ALTER TABLE emails DROP COLUMN senderId;
ALTER TABLE emails DROP COLUMN recipientId;
ALTER TABLE refresh_tokens DROP COLUMN user_id;
ALTER TABLE users DROP PRIMARY KEY, DROP COLUMN id;

-- Rename id_int → id
ALTER TABLE users CHANGE id_int id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;

-- Rename new FK columns
ALTER TABLE emails CHANGE senderId_int senderId INT;
ALTER TABLE emails CHANGE recipientId_int recipientId INT;
ALTER TABLE refresh_tokens ADD COLUMN user_id INT;

-- Re-create foreign keys
ALTER TABLE emails ADD CONSTRAINT emails_ibfk_1 FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE emails ADD CONSTRAINT emails_ibfk_2 FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 🚨 Drop dependent foreign key constraints first
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_1;
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_2;
ALTER TABLE refresh_tokens DROP FOREIGN KEY refresh_tokens_ibfk_1;

-- 🚨 Drop old `users` table with VARCHAR id
DROP TABLE IF EXISTS users;

-- ✅ Create new `users` table with INT AUTO_INCREMENT id
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  lastLogin TIMESTAMP NULL,
  resetToken VARCHAR(255),
  resetTokenExpires DATETIME
);

-- ✅ Recreate `emails` table with INT senderId/recipientId
DROP TABLE IF EXISTS emails;
CREATE TABLE IF NOT EXISTS emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  recipientId INT NOT NULL,
  subject TEXT,
  body TEXT,
  folder VARCHAR(50) DEFAULT 'inbox',
  labels JSON DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  isStarred BOOLEAN DEFAULT FALSE,
  isTrash BOOLEAN DEFAULT FALSE,
  isDeleted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  to_email VARCHAR(255),
  from_email VARCHAR(255),
  type VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
);

-- ✅ Recreate `refresh_tokens` table with INT user_id
DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX(token)
);

ALTER TABLE attachments DROP FOREIGN KEY attachments_ibfk_1;


--use email_app;
select * from users;
ALTER TABLE users MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
DROP TABLE IF EXISTS users;

-- Drop FK from emails.senderId
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_1;

-- Drop FK from emails.recipientId
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_2;

-- Drop FK from refresh_tokens.user_id
ALTER TABLE refresh_tokens DROP FOREIGN KEY refresh_tokens_ibfk_1;
ALTER TABLE users MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
SHOW CREATE TABLE users;
ALTER TABLE users ADD COLUMN id_int INT NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE emails ADD COLUMN senderId_int INT;
ALTER TABLE emails ADD COLUMN recipientId_int INT;

UPDATE emails e
JOIN users u ON CAST(e.senderId AS CHAR(36)) = u.id
SET e.senderId_int = u.id_int;
DESCRIBE emails;
DESCRIBE users;

ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_1;
ALTER TABLE emails DROP FOREIGN KEY emails_ibfk_2;
ALTER TABLE refresh_tokens DROP FOREIGN KEY refresh_tokens_ibfk_1;

DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  lastLogin TIMESTAMP NULL,
  resetToken VARCHAR(255),
  resetTokenExpires DATETIME
);

DROP TABLE IF EXISTS emails;
CREATE TABLE IF NOT EXISTS emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  recipientId INT NOT NULL,
  subject TEXT,
  body TEXT,
  folder VARCHAR(50) DEFAULT 'inbox',
  labels JSON DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  isStarred BOOLEAN DEFAULT FALSE,
  isTrash BOOLEAN DEFAULT FALSE,
  isDeleted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  to_email VARCHAR(255),
  from_email VARCHAR(255),
  type VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE attachments DROP FOREIGN KEY attachments_ibfk_1;
DROP TABLE IF EXISTS emails;
ALTER TABLE attachments
ADD CONSTRAINT attachments_ibfk_1 FOREIGN KEY (emailId) REFERENCES emails(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  recipientId INT NOT NULL,
  subject TEXT,
  body TEXT,
  folder VARCHAR(50) DEFAULT 'inbox',
  labels JSON DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  isStarred BOOLEAN DEFAULT FALSE,
  isTrash BOOLEAN DEFAULT FALSE,
  isDeleted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  to_email VARCHAR(255),
  from_email VARCHAR(255),
  type VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
);
select * from users;
select * from emails;

CREATE TABLE otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL
);

CREATE TABLE otp_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  type ENUM('send', 'verify') NOT NULL,
  status VARCHAR(50),
  ip VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
