const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'toko_online',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5432,
  // Connection pool settings
  max: 20, // maksimal 20 koneksi dalam pool
  idleTimeoutMillis: 30000, // timeout untuk koneksi idle
  connectionTimeoutMillis: 2000, // timeout untuk koneksi baru
  // SSL configuration untuk production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// Jika ada DATABASE_URL (seperti di Heroku), gunakan itu
if (process.env.DATABASE_URL) {
  dbConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }
}

const pool = new Pool(dbConfig);

// Event listeners untuk monitoring
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
  // process.exit(-1); // Disabled for development
});

// Helper function untuk query dengan error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function untuk transaksi
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction
};

//backward comp
module.exports.query = pool.query.bind(pool);
module.exports.connect = pool.connect.bind(pool);
module.exports.end = pool.end.bind(pool);
