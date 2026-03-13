const pool = require('./database/pool');

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Add is_deleted to categories Table
    await pool.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    `);
    console.log('Added is_deleted to categories table');

    // Add is_deleted to products Table
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    `);
    console.log('Added is_deleted to products table');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
