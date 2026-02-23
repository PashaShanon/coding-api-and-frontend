const pool = require('./database/pool');

async function addImageColumn() {
  try {
    console.log('🔄 Checking products table...');
    
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='products' AND column_name='image';
    `;
    
    const res = await pool.query(checkQuery);
    
    if (res.rows.length === 0) {
      console.log('📦 Adding image column...');
      await pool.query('ALTER TABLE products ADD COLUMN image TEXT;');
      console.log('✅ Column added successfully.');
    } else {
      console.log('✅ Image column already exists.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addImageColumn();
