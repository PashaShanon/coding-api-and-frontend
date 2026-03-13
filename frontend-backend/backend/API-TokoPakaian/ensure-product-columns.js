const pool = require('./database/pool');

async function ensureProductColumns() {
  try {
    console.log('🔄 Checking products table columns...');
    
    // Columns to ensure
    const columns = [
      { name: 'image', type: 'TEXT' },
      { name: 'cost', type: 'DECIMAL(15, 2)' },
      { name: 'sku', type: 'VARCHAR(50) UNIQUE' },
      { name: 'size', type: 'VARCHAR(10)' },
      { name: 'color', type: 'VARCHAR(50)' }
    ];
    
    for (const column of columns) {
      // Check if column exists
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='${column.name}';
      `;
      
      const res = await pool.query(checkQuery);
      
      if (res.rows.length === 0) {
        console.log(`📦 Adding ${column.name} column...`);
        await pool.query(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type};`);
        console.log(`✅ ${column.name} column added successfully.`);
      } else {
        console.log(`✅ ${column.name} column already exists.`);
      }
    }
    
    console.log('🎉 All product columns are ensured.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating database:', error);
    process.exit(1);
  }
}

ensureProductColumns();
