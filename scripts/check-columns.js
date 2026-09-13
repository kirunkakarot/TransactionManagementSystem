const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jadevents',
});

async function check() {
  const res = await pool.query("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'payment_transactions'");
  console.log(res.rows);
  await pool.end();
}

check();
