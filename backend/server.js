// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

import emailRoutes from './routes/emailRoutes.js';
import authRoutes from './routes/authRoutes.js';
import emailModelRoutes from './routes/emailModelRoutes.js';

dotenv.config();

const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'JWT_SECRET',
  'CLIENT_URL',
];
REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 5000;

// ✅ CORS
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL?.replace(/\/$/, ''),
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error(`❌ CORS not allowed from origin: ${origin}`));
    }
  },
  credentials: true,
}));

// ✅ Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ✅ Static Folder
app.use('/uploads', express.static(join(__dirname, 'Uploads')));

// ✅ MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
app.locals.pool = pool;
console.log('✅ MySQL pool created and connection verified (db.js)');

// ✅ Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP configuration failed:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});
app.locals.transporter = transporter;

// ✅ Routes
app.use('/api', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/emails/model', emailModelRoutes);

// ✅ Health Check
app.get('/', (req, res) => res.send('✅ Email App API is running'));

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.stack || err.message);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

// ✅ Handle Unhandled Promise Rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});


// ✅ server.js
// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import cookieParser from 'cookie-parser';
// import compression from 'compression';
// import rateLimit from 'express-rate-limit';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
// import mysql from 'mysql2/promise';
// import nodemailer from 'nodemailer';

// import emailRoutes from './routes/emailRoutes.js';
// import authRoutes from './routes/authRoutes.js';
// import emailModelRoutes from './routes/emailModelRoutes.js'; // ✅ ADD THIS

// dotenv.config();

// // ✅ Validate required environment variables
// [
//   'DB_HOST',
//   'DB_USER',
//   'DB_NAME',
//   'SMTP_USER',
//   'SMTP_PASS',
//   'JWT_SECRET',
// ].forEach((key) => {
//   if (!process.env[key]) {
//     console.error(`❌ Missing environment variable: ${key}`);
//     process.exit(1);
//   }
// });

// const app = express();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const PORT = process.env.PORT || 5000;

// // ✅ CORS Setup
// const allowedOrigins = [
//   'http://localhost:5173',
//   process.env.CLIENT_URL?.replace(/\/$/, ''),
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
//       callback(null, true);
//     } else {
//       callback(new Error(`❌ CORS not allowed from origin: ${origin}`));
//     }
//   },
//   credentials: true,
// }));

// // ✅ Middleware
// app.use(helmet());
// app.use(morgan('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(compression());

// const limiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 100,
//   message: { success: false, message: 'Too many requests, please try again later.' },
// });
// app.use(limiter);

// // ✅ Static folder
// app.use('/uploads', express.static(join(__dirname, 'Uploads')));

// // ✅ MySQL Connection Pool
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// console.log('🔐 DB Connection Debug:', {
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER,
//   database: process.env.DB_NAME,
//   connectionLimit: 10,
// });

// // ✅ Nodemailer Transporter
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT, 10) || 587,
//   secure: process.env.SMTP_SECURE === 'true',
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// transporter.verify((error, success) => {
//   if (error) {
//     console.error('❌ SMTP configuration failed:', error);
//   } else {
//     console.log('✅ SMTP server is ready to send emails');
//   }
// });

// // ✅ Attach to app.locals
// app.locals.pool = pool;
// app.locals.transporter = transporter;

// // ✅ Routes
// app.use('/api', authRoutes);
// app.use('/api/emails', emailRoutes);
// app.use('/api/emails/model', emailModelRoutes); // ✅ MOUNTED CORRECTLY

// // ✅ Health Check
// app.get('/', (req, res) => {
//   res.send('✅ Email App API is running');
// });

// // ✅ Global Error Handler
// app.use((err, req, res, next) => {
//   console.error('❌ Global Error:', err.stack || err.message);
//   res.status(500).json({ success: false, message: 'Internal Server Error' });
// });

// // ✅ Start Server
// app.listen(PORT, () => {
//   console.log(`🚀 Server is running at http://localhost:${PORT}`);
// });

// // ✅ Handle unhandled promise rejections
// process.on('unhandledRejection', (error) => {
//   console.error('❌ Unhandled Rejection:', error);
//   process.exit(1);
// });
