const { Pool } = require('pg');
require('dotenv').config();

// 1. Definisikan Konfigurasi
const supabaseConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 20000, //mili detik
  ssl: { rejectUnauthorized: false }
};

const localConfig = {
  user: process.env.DB_USER || 'postgres',
  host: 'localhost',
  database: process.env.DB_NAME || 'toko_online',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5432,
  max: 10,
  connectionTimeoutMillis: 2000,
  ssl: false
};

// 2. State Management untuk Pool
let currentPool;
let isUsingLocal = false;

function createPool(config, isSupabase = true) {
  const pool = new Pool(config);
  
  pool.on('error', (err) => {
    if (!isUsingLocal && (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT')) {
      const errorType = err.code === 'ENOTFOUND' ? 'ENOTFOUND (DNS/Network Blocked)' : 'Timeout';
      console.error(`\x1b[31m✖ Supabase Connection Error: ${errorType}. Switching to Local...\x1b[0m`);
      switchToLocal();
    }
  });

  return pool;
}

function switchToLocal() {
  if (isUsingLocal) return;
  isUsingLocal = true;
  const oldPool = currentPool;
  currentPool = createPool(localConfig, false);
  console.log('\x1b[32m✔ Connected to Local Database (Fallback Mode)\x1b[0m');
  
  if (oldPool) {
    oldPool.end().catch(() => {});
  }
}

// Inisialisasi awal (Gunakan Supabase jika ada URL, jika tidak langsung Local)
if (process.env.DATABASE_URL) {
  console.log('\x1b[90m⚙ Attempting Supabase connection...\x1b[0m');
  currentPool = createPool(supabaseConfig, true);
} else {
  isUsingLocal = true;
  currentPool = createPool(localConfig, false);
}

// 3. Export Wrapper (Agar tetap konsisten di file lain)
const query = async (text, params) => {
  try {
    return await currentPool.query(text, params);
  } catch (error) {
    // Jika query gagal karena masalah koneksi DNS/Network
    if (!isUsingLocal && (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message.includes('terminated'))) {
      const errorType = error.code === 'ENOTFOUND' ? 'ENOTFOUND (Supabase Unreachable)' : 'Network Error';
      console.error(`\x1b[31m✖ Supabase Query Failed: ${errorType}. Automatic Fallback to Local...\x1b[0m`);
      switchToLocal();
      return await currentPool.query(text, params); // Coba lagi di Local
    }
    throw error;
  }
};

const transaction = async (callback) => {
  const client = await currentPool.connect();
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
  query,
  transaction,
  get pool() { return currentPool; }, // Getter dinamis
  connect: () => currentPool.connect(),
  end: () => currentPool.end()
};
