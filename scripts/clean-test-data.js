const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db',
});

async function cleanTestData() {
  console.log('🧹 Starting cleanup of test data...');

  try {
    // 1. Find test users
    const testUsersRes = await pool.query(`
      SELECT id, email, name, role FROM users 
      WHERE email LIKE '%test%' 
         OR email LIKE '%optionb%' 
         OR email LIKE 'admin.director.%' 
         OR name LIKE '%Test%'
         OR name LIKE '%OptionB%'
         OR name = 'Attacker User'
    `);

    const testUserIds = testUsersRes.rows.map(u => u.id);
    const testUserEmails = testUsersRes.rows.map(u => u.email);

    console.log(`Found ${testUserIds.length} test user account(s):`, testUserEmails);

    // 2. Find test inquiries
    const testInquiriesRes = await pool.query(`
      SELECT id, client_name, client_email, event_type, event_venue FROM inquiries 
      WHERE client_email = ANY($1::text[])
         OR client_name LIKE '%Test%'
         OR client_name LIKE '%OptionB%'
         OR event_venue LIKE '%Test%'
         OR notes LIKE '%Test%'
    `, [testUserEmails]);
    const testInquiryIds = testInquiriesRes.rows.map(i => i.id);
    console.log(`Found ${testInquiryIds.length} test inquiry/inquiries.`);

    // 3. Find test quotations
    const testQuotationsRes = await pool.query(`
      SELECT id, quotation_ref, client_email FROM quotations 
      WHERE client_email = ANY($1::text[])
         OR inquiry_id = ANY($2::int[])
         OR client_name LIKE '%Test%'
         OR venue LIKE '%Test%'
    `, [testUserEmails, testInquiryIds]);
    const testQuotationIds = testQuotationsRes.rows.map(q => q.id);
    console.log(`Found ${testQuotationIds.length} test quotation(s).`);

    // 4. Find test bookings
    const testBookingsRes = await pool.query(`
      SELECT id, booking_ref, event_title, venue FROM bookings 
      WHERE client_email = ANY($1::text[])
         OR inquiry_id = ANY($2::int[])
         OR quotation_id = ANY($3::int[])
         OR event_title LIKE '%Test%'
         OR venue LIKE '%Test%'
    `, [testUserEmails, testInquiryIds, testQuotationIds]);
    const testBookingIds = testBookingsRes.rows.map(b => b.id);
    console.log(`Found ${testBookingIds.length} test booking(s).`);

    // 5. Delete Payments related to test users, quotations, or bookings
    const delPaymentsRes = await pool.query(`
      DELETE FROM payment_transactions 
      WHERE booking_id = ANY($1::int[])
         OR quotation_id = ANY($2::int[])
         OR client_email = ANY($3::text[])
         OR notes LIKE '%Test%'
         OR reference_number LIKE '%TEST%'
    `, [testBookingIds, testQuotationIds, testUserEmails]);
    console.log(`Deleted ${delPaymentsRes.rowCount} test payment transaction(s).`);

    // 6. Delete Booking Relations (Schedules, Staff, Resources, Packages, Services)
    if (testBookingIds.length > 0) {
      await pool.query(`DELETE FROM event_schedules WHERE booking_id = ANY($1::int[])`, [testBookingIds]);
      await pool.query(`DELETE FROM booking_staff WHERE booking_id = ANY($1::int[])`, [testBookingIds]);
      await pool.query(`DELETE FROM booking_resources WHERE booking_id = ANY($1::int[])`, [testBookingIds]);
      await pool.query(`DELETE FROM booking_packages WHERE booking_id = ANY($1::int[])`, [testBookingIds]);
      await pool.query(`DELETE FROM booking_services WHERE booking_id = ANY($1::int[])`, [testBookingIds]);
      const delBookingsRes = await pool.query(`DELETE FROM bookings WHERE id = ANY($1::int[])`, [testBookingIds]);
      console.log(`Deleted ${delBookingsRes.rowCount} test booking(s) and their associated schedules/allocations.`);
    }

    // 7. Delete Quotations
    if (testQuotationIds.length > 0) {
      const delQuotationsRes = await pool.query(`DELETE FROM quotations WHERE id = ANY($1::int[])`, [testQuotationIds]);
      console.log(`Deleted ${delQuotationsRes.rowCount} test quotation(s).`);
    }

    // 8. Delete Inquiries
    if (testInquiryIds.length > 0) {
      const delInquiriesRes = await pool.query(`DELETE FROM inquiries WHERE id = ANY($1::int[])`, [testInquiryIds]);
      console.log(`Deleted ${delInquiriesRes.rowCount} test inquiry/inquiries.`);
    }

    // 9. Delete Test Users
    if (testUserIds.length > 0) {
      const delUsersRes = await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [testUserIds]);
      console.log(`Deleted ${delUsersRes.rowCount} test user account(s).`);
    }

    // 10. Clean any orphaned schedules or allocations if any
    await pool.query(`
      DELETE FROM event_schedules WHERE booking_id NOT IN (SELECT id FROM bookings);
      DELETE FROM booking_staff WHERE booking_id NOT IN (SELECT id FROM bookings);
      DELETE FROM booking_resources WHERE booking_id NOT IN (SELECT id FROM bookings);
      DELETE FROM booking_packages WHERE booking_id NOT IN (SELECT id FROM bookings);
      DELETE FROM booking_services WHERE booking_id NOT IN (SELECT id FROM bookings);
    `);

    console.log('\n✨ All test data has been cleanly removed from the database!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await pool.end();
  }
}

cleanTestData();
