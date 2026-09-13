const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query('SELECT id, email, role, name FROM "User"');
  console.log('Database Users:');
  console.table(res.rows);
  await pool.end();
}

check().catch(console.error);
