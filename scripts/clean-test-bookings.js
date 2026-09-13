const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function cleanTestBookings() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🧹 Cleaning test bookings, schedules, and test payment records...');

    // Delete in cascade order
    await pool.query('DELETE FROM payment_transactions;');
    await pool.query('DELETE FROM event_schedules;');
    await pool.query('DELETE FROM booking_resources;');
    await pool.query('DELETE FROM booking_staff;');
    await pool.query('DELETE FROM booking_services;');
    await pool.query('DELETE FROM booking_packages;');
    await pool.query('DELETE FROM bookings;');
    await pool.query('DELETE FROM quotations;');
    await pool.query('DELETE FROM inquiries;');

    // Reset sequences if needed
    await pool.query('ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;');
    await pool.query('ALTER SEQUENCE IF EXISTS event_schedules_id_seq RESTART WITH 1;');
    await pool.query('ALTER SEQUENCE IF EXISTS payment_transactions_id_seq RESTART WITH 1;');
    await pool.query('ALTER SEQUENCE IF EXISTS quotations_id_seq RESTART WITH 1;');
    await pool.query('ALTER SEQUENCE IF EXISTS inquiries_id_seq RESTART WITH 1;');

    const b = await pool.query('SELECT count(*) FROM bookings');
    const p = await pool.query('SELECT count(*) FROM payment_transactions');
    const s = await pool.query('SELECT count(*) FROM event_schedules');
    const q = await pool.query('SELECT count(*) FROM quotations');

    console.log('✅ Clean-up complete!');
    console.log(`Current counts in database -> Bookings: ${b.rows[0].count}, Payments: ${p.rows[0].count}, Schedules: ${s.rows[0].count}, Quotations: ${q.rows[0].count}`);
  } catch (error) {
    console.error('Error during clean up:', error);
  } finally {
    await pool.end();
  }
}

cleanTestBookings();
