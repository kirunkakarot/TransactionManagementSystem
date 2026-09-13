const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db',
});

async function clearInquiriesBookingsQuotations() {
  console.log('🧹 Clearing all inquiries, quotations, bookings, and payments...');

  try {
    // 1. Delete all payment transactions
    const delPayments = await pool.query('DELETE FROM payment_transactions');
    console.log(`Deleted ${delPayments.rowCount} payment transaction(s).`);

    // 2. Delete all booking relations & schedules
    await pool.query('DELETE FROM event_schedules');
    await pool.query('DELETE FROM booking_staff');
    await pool.query('DELETE FROM booking_resources');
    await pool.query('DELETE FROM booking_packages');
    await pool.query('DELETE FROM booking_services');

    // 3. Delete all bookings
    const delBookings = await pool.query('DELETE FROM bookings');
    console.log(`Deleted ${delBookings.rowCount} booking(s).`);

    // 4. Delete all quotations
    const delQuotations = await pool.query('DELETE FROM quotations');
    console.log(`Deleted ${delQuotations.rowCount} quotation(s).`);

    // 5. Delete all inquiries
    const delInquiries = await pool.query('DELETE FROM inquiries');
    console.log(`Deleted ${delInquiries.rowCount} inquiry/inquiries.`);

    // 6. Reset autoincrement sequences if possible
    await pool.query(`
      ALTER SEQUENCE IF EXISTS inquiries_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS quotations_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS payment_transactions_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS event_schedules_id_seq RESTART WITH 1;
    `).catch(() => {});

    console.log('\n✨ Inquiries, Bookings, Quotations, and Payments have been completely wiped clean!');
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await pool.end();
  }
}

clearInquiriesBookingsQuotations();
