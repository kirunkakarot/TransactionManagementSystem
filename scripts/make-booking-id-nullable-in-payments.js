const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jadevents',
});

async function migrate() {
  console.log('Allowing booking_id to be nullable in payment_transactions for pre-booking quotation deposits...');
  await pool.query('ALTER TABLE payment_transactions ALTER COLUMN booking_id DROP NOT NULL');
  console.log('Successfully altered column booking_id in payment_transactions.');
  await pool.end();
}

migrate();
