const pool = require('./database/pool');

async function describeAllTables() {
  try {
    const res = await pool.query(`
      SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable
      FROM 
          information_schema.columns
      WHERE 
          table_schema = 'public'
      ORDER BY 
          table_name, ordinal_position;
    `);
    
    console.log('Database Schema:');
    let currentTable = '';
    res.rows.forEach(row => {
      if (currentTable !== row.table_name) {
        currentTable = row.table_name;
        console.log(`\nTable: ${currentTable}`);
      }
      console.log(`- ${row.column_name} (${row.data_type})${row.is_nullable === 'YES' ? '' : ' NOT NULL'}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

describeAllTables();
