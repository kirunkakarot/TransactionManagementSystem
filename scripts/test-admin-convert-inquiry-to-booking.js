const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jadevents',
});

const JWT_SECRET = process.env.JWT_SECRET || 'jad-events-super-secure-production-jwt-secret-2026';
const BASE_URL = 'http://localhost:3000';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

async function run() {
  console.log('='.repeat(80));
  console.log('🧪 JAD EVENTS — INQUIRY CONVERT TO BOOKING & PREREQUISITES VERIFICATION');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  const createdInquiryIds = [];
  const createdQuotationIds = [];
  const createdBookingIds = [];

  try {
    // Setup Admin and Customer
    const adminRes = await pool.query("SELECT * FROM users WHERE role IN ('admin', 'Administrator') LIMIT 1");
    if (adminRes.rows.length === 0) throw new Error('No admin user found');
    const adminUser = adminRes.rows[0];

    let customerRes = await pool.query("SELECT * FROM users WHERE email = 'convert_workflow_test@example.com' LIMIT 1");
    let customer;
    if (customerRes.rows.length === 0) {
      const newCust = await pool.query(
        "INSERT INTO users (email, name, phone, role, password) VALUES ('convert_workflow_test@example.com', 'Workflow Test Customer', '0917-555-9988', 'Customer', 'dummy') RETURNING *"
      );
      customer = newCust.rows[0];
    } else {
      customer = customerRes.rows[0];
    }

    const adminToken = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: 'Administrator',
    });

    const customerToken = generateToken({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'Customer',
    });

    // ----------------------------------------------------
    // STEP 1: Submit Event Inquiry with Services & Package
    // ----------------------------------------------------
    console.log('\n--- Step 1: Customer Submits Event Inquiry ---');
    const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Clarissa Vance',
        email: customer.email,
        phone: '0917-555-9988',
        eventType: 'Luxury Wedding Reception',
        eventDate: '2026-11-25',
        venue: 'The Peninsula Manila Rigodon Ballroom',
        guestCount: 200,
        estimatedBudget: '250000',
        selectedServices: ['event-styling', 'photo-booth'],
        packageId: 'pkg-luxury-wedding',
        notes: 'Burgundy floral concept with mirror dancefloor',
      }),
    });

    const inqData = await inqRes.json();
    assert(inqRes.status === 201, `Inquiry created with HTTP 201`);
    const inquiry = inqData.inquiry;
    createdInquiryIds.push(inquiry.id);

    // ------------------------------------------------------------------
    // STEP 2: Prerequisite Check 1: Convert without Quotation (Must Fail)
    // ------------------------------------------------------------------
    console.log('\n--- Step 2: Convert Inquiry without Quotation (Must Fail) ---');
    const noQuoteBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        eventTitle: `${inquiry.clientName}'s ${inquiry.eventType}`,
        eventType: inquiry.eventType,
        eventDate: '2026-11-25',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        totalAmount: 250000,
      }),
    });

    const noQuoteBookData = await noQuoteBookRes.json();
    assert(noQuoteBookRes.status === 400, `Convert without quotation rejected with HTTP 400 (got ${noQuoteBookRes.status})`);
    assert(noQuoteBookData.message.includes('quotation must be created'), `Correct error message: "${noQuoteBookData.message}"`);

    // ----------------------------------------------------
    // STEP 3: Admin Creates Quotation (Status: Quotation Sent)
    // ----------------------------------------------------
    console.log('\n--- Step 3: Admin Creates Official Quotation ---');
    const quoteRes = await fetch(`${BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        clientPhone: inquiry.clientPhone,
        eventType: inquiry.eventType,
        eventDate: '2026-11-25',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        subtotal: 250000,
        grandTotal: 250000,
        requiredDownpayment: 125000,
        validUntil: '2026-11-10',
        validityDays: 14,
        status: 'Quotation Sent',
      }),
    });

    const quoteData = await quoteRes.json();
    assert(quoteRes.status === 201, `Quotation created with HTTP 201`);
    const quotation = quoteData.quotation || quoteData;
    createdQuotationIds.push(quotation.id);

    // ------------------------------------------------------------------
    // STEP 4: Prerequisite Check 2: Convert before Acceptance (Must Fail)
    // ------------------------------------------------------------------
    console.log('\n--- Step 4: Convert Unaccepted Quotation (Must Fail) ---');
    const unacceptedBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        quotationId: quotation.id,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        eventTitle: `${inquiry.clientName}'s ${inquiry.eventType}`,
        eventType: inquiry.eventType,
        eventDate: '2026-11-25',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        totalAmount: 250000,
      }),
    });

    const unacceptedBookData = await unacceptedBookRes.json();
    assert(unacceptedBookRes.status === 400, `Convert unaccepted quote rejected with HTTP 400`);
    assert(unacceptedBookData.message.includes('not been accepted'), `Correct error message: "${unacceptedBookData.message}"`);

    // ----------------------------------------------------
    // STEP 5: Customer Accepts Quotation
    // ----------------------------------------------------
    console.log('\n--- Step 5: Customer Accepts Quotation ---');
    const acceptRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });

    assert(acceptRes.status === 200, `Customer accepts quotation (HTTP 200)`);

    // ------------------------------------------------------------------
    // STEP 6: Prerequisite Check 3: Convert without Downpayment (Must Fail)
    // ------------------------------------------------------------------
    console.log('\n--- Step 6: Convert Accepted Quote without Downpayment (Must Fail) ---');
    const noDepositBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        quotationId: quotation.id,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        eventTitle: `${inquiry.clientName}'s ${inquiry.eventType}`,
        eventType: inquiry.eventType,
        eventDate: '2026-11-25',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        totalAmount: 250000,
      }),
    });

    const noDepositBookData = await noDepositBookRes.json();
    assert(noDepositBookRes.status === 400, `Convert without downpayment rejected with HTTP 400`);
    assert(noDepositBookData.message.includes('downpayment must be submitted'), `Correct error message: "${noDepositBookData.message}"`);

    // ----------------------------------------------------
    // STEP 7: Customer Submits 50% Reservation Downpayment
    // ----------------------------------------------------
    console.log('\n--- Step 7: Customer Submits 50% Reservation Downpayment ---');
    const payRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: 'GCASH-9988112233',
        proofUrl: '/uploads/payments/proof-sample.png',
        notes: '50% downpayment for wedding reservation',
      }),
    });

    assert(payRes.status === 200, `Deposit payment submitted with HTTP 200`);

    // Verify quotation status is now Deposit Paid
    const checkQuoteRes = await pool.query('SELECT * FROM quotations WHERE id = $1', [quotation.id]);
    assert(checkQuoteRes.rows[0].status === 'Deposit Paid', `Quotation status updated to "Deposit Paid" in PostgreSQL`);

    // ----------------------------------------------------
    // STEP 8: Admin Converts Inquiry to Confirmed Booking
    // ----------------------------------------------------
    console.log('\n--- Step 8: Admin Converts Inquiry to Confirmed Booking ---');
    const convertRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bookingRef: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        inquiryId: inquiry.id,
        quotationId: quotation.id,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        clientPhone: inquiry.clientPhone,
        eventTitle: `${inquiry.clientName}'s ${inquiry.eventType}`,
        eventType: inquiry.eventType,
        eventDate: '2026-11-25',
        startTime: '17:00',
        endTime: '23:00',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        totalAmount: 250000,
        status: 'Confirmed',
        assignedStaff: [{ id: 'st-1', role: 'Lead Director' }],
      }),
    });

    const convertData = await convertRes.json();
    const finalBooking = convertData.booking || convertData;
    assert(convertRes.status === 201, `Admin convert inquiry to booking returned HTTP 201 (Created)`);
    assert(finalBooking && finalBooking.id, `Booking persisted with ID #${finalBooking?.id}`);
    createdBookingIds.push(finalBooking.id);

    // ----------------------------------------------------
    // STEP 9: Verify Services & Packages Match in Booking
    // ----------------------------------------------------
    console.log('\n--- Step 9: Verify Services & Packages Matched in Booking ---');
    const bookingServicesRes = await pool.query('SELECT * FROM booking_services WHERE booking_id = $1', [finalBooking.id]);
    assert(bookingServicesRes.rows.length >= 2, `Booking has ${bookingServicesRes.rows.length} matched services (expected >= 2)`);
    const serviceCodes = bookingServicesRes.rows.map(r => r.service_code);
    assert(serviceCodes.includes('event-styling'), `Booking contains matched service: "event-styling"`);
    assert(serviceCodes.includes('photo-booth'), `Booking contains matched service: "photo-booth"`);

    const bookingPackagesRes = await pool.query('SELECT * FROM booking_packages WHERE booking_id = $1', [finalBooking.id]);
    assert(bookingPackagesRes.rows.length >= 1, `Booking has ${bookingPackagesRes.rows.length} matched package`);
    assert(bookingPackagesRes.rows[0].package_code === 'pkg-luxury-wedding', `Booking contains matched package: "pkg-luxury-wedding"`);

    // Verify Inquiry & Quotation statuses in PostgreSQL
    const finalInqRes = await pool.query('SELECT * FROM inquiries WHERE id = $1', [inquiry.id]);
    assert(finalInqRes.rows[0].status === 'Confirmed', `Inquiry status synchronized to "Confirmed" in PostgreSQL`);

    const finalQuoteRes = await pool.query('SELECT * FROM quotations WHERE id = $1', [quotation.id]);
    assert(finalQuoteRes.rows[0].status === 'Confirmed', `Quotation status synchronized to "Confirmed" in PostgreSQL`);

    console.log('\n--- Cleaning up test records ---');
    for (const bId of createdBookingIds) {
      await pool.query('DELETE FROM event_schedules WHERE booking_id = $1', [bId]);
      await pool.query('DELETE FROM booking_staff WHERE booking_id = $1', [bId]);
      await pool.query('DELETE FROM booking_resources WHERE booking_id = $1', [bId]);
      await pool.query('DELETE FROM booking_services WHERE booking_id = $1', [bId]);
      await pool.query('DELETE FROM booking_packages WHERE booking_id = $1', [bId]);
      await pool.query('DELETE FROM payment_transactions WHERE booking_id = $1', [bId]);
      await pool.query('DELETE FROM bookings WHERE id = $1', [bId]);
    }
    for (const qId of createdQuotationIds) {
      await pool.query('DELETE FROM payment_transactions WHERE quotation_id = $1', [qId]);
      await pool.query('DELETE FROM quotations WHERE id = $1', [qId]);
    }
    for (const inqId of createdInquiryIds) {
      await pool.query('DELETE FROM inquiries WHERE id = $1', [inqId]);
    }
    await pool.query("DELETE FROM users WHERE email = 'convert_workflow_test@example.com'");
    console.log('Cleanup completed.');

  } catch (err) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed > 0) process.exit(1);
}

run();
