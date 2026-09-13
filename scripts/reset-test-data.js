const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db?schema=public'
});

async function resetTestData() {
  const client = await pool.connect();
  console.log('--- Resetting Inquiries, Bookings, Payment & Receipts, and Quotations ---');

  try {
    await client.query(`
      TRUNCATE TABLE 
        payment_transactions, 
        event_schedules, 
        booking_resources, 
        booking_staff, 
        booking_packages, 
        booking_services, 
        bookings, 
        quotations, 
        inquiries 
      RESTART IDENTITY CASCADE;
    `);

    console.log('✅ Successfully reset Inquiries, Bookings, Payments/Receipts, and Quotations to clean state!');
  } catch (err) {
    console.error('Error resetting test data:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetTestData();
