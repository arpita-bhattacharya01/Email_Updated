import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables (only if not already loaded by server.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (!process.env.DB_HOST) {
  const envPath = path.resolve(__dirname, '../.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Failed to load .env file:', result.error.message);
    process.exit(1);
  }
}

// ✅ DEBUG: Show DB credentials being used (with password hidden)
console.log('🔐 DB Connection Debug:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '******' : '(empty or missing)', // Hide actual password
  database: process.env.DB_NAME,
   waitForConnections: true,
  connectionLimit: 10,
});

// ✅ VALIDATE required DB variables
const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const missingVars = requiredVars.filter(
  (key) => !process.env[key] || process.env[key].trim() === ''
);
if (missingVars.length > 0) {
  console.error(`❌ Missing or empty required DB environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// ✅ Warn about potential MYSQL_PASSWORD conflicts
if (process.env.MYSQL_PASSWORD && process.env.MYSQL_PASSWORD !== process.env.DB_PASSWORD) {
  console.warn('⚠️ MYSQL_PASSWORD differs from DB_PASSWORD. Using DB_PASSWORD for MySQL connection.');
}

// Global MySQL pool
let promisePool;

// ✅ Create a new pool and verify connection
async function createPool() {
  try {
    const pool = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });

    // ✅ Verify connection with ping
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log('✅ MySQL pool created and connection verified (db.js)');
    return pool;
  } catch (error) {
    console.error('❌ Error creating MySQL pool (db.js):', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });

    // 💡 Suggest quoting .env password if connection fails due to special chars
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔐 HINT: Wrap your DB_PASSWORD in double quotes in .env if it contains special characters (like @ or #)');
    }

    process.exit(1);
  }
}

// ✅ Reconnection logic for pool
async function handleDisconnect() {
  if (promisePool) return;

  promisePool = await createPool();

  promisePool.on('error', async (err) => {
    console.error('❌ MySQL pool error (db.js):', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
    });

    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) {
      console.log('🔁 Reconnecting to MySQL (db.js)...');
      promisePool = null;
      await handleDisconnect();
      console.log('✅ MySQL reconnection successful (db.js)');
    } else {
      throw err;
    }
  });
}

// ✅ Initialize connection pool
await handleDisconnect();

// ✅ Export pool as default
const dbPool = promisePool;
export default dbPool;

// ✅ Export helper to get a fresh connection
export async function getConnection() {
  if (!promisePool) {
    console.log('⏳ No DB pool found, reconnecting (db.js)...');
    await handleDisconnect();
  }

  const conn = await promisePool.getConnection();

  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 DB connection retrieved from pool (db.js)');
  }

  return conn;
}
