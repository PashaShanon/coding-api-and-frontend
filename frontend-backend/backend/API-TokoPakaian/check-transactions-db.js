const pool = require('./database/pool');

async function checkTransactionsTable() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'transactions';
    `);
    console.log('Columns in transactions table:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.character_maximum_length})`);
    });

    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'transactions'::regclass;
    `);
    console.log('\nConstraints in transactions table:');
    constraints.rows.forEach(row => {
      console.log(`- ${row.conname}: ${row.pg_get_constraintdef}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTransactionsTable();
