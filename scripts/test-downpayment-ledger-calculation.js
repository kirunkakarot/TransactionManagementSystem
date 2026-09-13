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
  console.log('🧪 JAD EVENTS — DOWNPAYMENT CALCULATION & INQUIRY MODAL TEST');
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
    const adminRes = await pool.query("SELECT * FROM users WHERE role IN ('admin', 'Administrator') LIMIT 1");
    if (adminRes.rows.length === 0) throw new Error('No admin user found');
    const adminUser = adminRes.rows[0];

    let customerRes = await pool.query("SELECT * FROM users WHERE email = 'ledger_test_user@example.com' LIMIT 1");
    let customer;
    if (customerRes.rows.length === 0) {
      const newCust = await pool.query(
        "INSERT INTO users (email, name, phone, role, password) VALUES ('ledger_test_user@example.com', 'Ledger Test Customer', '0917-444-5566', 'Customer', 'dummy') RETURNING *"
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

    // 1. Submit Inquiry
    console.log('\n--- Step 1: Submit Event Inquiry ---');
    const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Clarissa Vance',
        email: customer.email,
        phone: '0917-444-5566',
        eventType: 'Corporate Gala Dinner',
        eventDate: '2026-12-15',
        venue: 'Marriott Grand Ballroom',
        guestCount: 300,
        estimatedBudget: '300000',
        selectedServices: ['event-styling', 'photo-booth'],
      }),
    });
    const inqData = await inqRes.json();
    assert(inqRes.status === 201, `Inquiry created with HTTP 201`);
    const inquiry = inqData.inquiry;
    createdInquiryIds.push(inquiry.id);

    // 2. Admin creates quotation for 300,000 (required downpayment = 150,000)
    console.log('\n--- Step 2: Admin Creates Quotation (Total: ₱300,000, 50% Deposit: ₱150,000) ---');
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
        eventDate: '2026-12-15',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        subtotal: 300000,
        grandTotal: 300000,
        requiredDownpayment: 150000,
        validUntil: '2026-12-01',
        status: 'Quotation Sent',
      }),
    });
    const quoteData = await quoteRes.json();
    const quotation = quoteData.quotation || quoteData;
    assert(quoteRes.status === 201, `Quotation created with HTTP 201`);
    createdQuotationIds.push(quotation.id);

    // 3. Customer accepts quotation
    console.log('\n--- Step 3: Customer Accepts Quotation ---');
    const acceptRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    assert(acceptRes.status === 200, `Quotation accepted (HTTP 200)`);

    // 4. Customer submits 50% downpayment
    console.log('\n--- Step 4: Customer Pays 50% Downpayment (₱150,000) ---');
    const payRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: 'GCASH-LEDGER-9988',
      }),
    });
    assert(payRes.status === 200, `Downpayment submitted (HTTP 200)`);

    // 5. Admin converts inquiry into booking
    console.log('\n--- Step 5: Admin Converts Inquiry to Booking ---');
    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
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
        eventDate: '2026-12-15',
        startTime: '17:00',
        endTime: '23:00',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        totalAmount: 300000,
        status: 'Confirmed',
      }),
    });
    const bookData = await bookRes.json();
    const finalBooking = bookData.booking || bookData;
    assert(bookRes.status === 201, `Booking created with HTTP 201`);
    assert(finalBooking && finalBooking.id, `Booking ID #${finalBooking?.id} persisted`);
    createdBookingIds.push(finalBooking.id);

    // 6. Verify Payment Record in Database
    console.log('\n--- Step 6: Verify Verified Payment Transaction Recorded for Booking ---');
    const paymentCheckRes = await pool.query(
      'SELECT * FROM payment_transactions WHERE booking_id = $1',
      [finalBooking.id]
    );
    assert(paymentCheckRes.rows.length >= 1, `Payment transaction found for Booking ID #${finalBooking.id}`);
    const downpaymentTx = paymentCheckRes.rows[0];
    assert(Number(downpaymentTx.amount) === 150000, `Payment amount matches 50% deposit: ₱150,000 (got ${downpaymentTx.amount})`);
    assert(downpaymentTx.verified === true, `Payment transaction is marked verified: true`);

    // 7. Verify Payments API returns the payment and Booking Ledger balances correctly
    console.log('\n--- Step 7: Verify Admin Ledger Balance Calculation ---');
    const paymentsApiRes = await fetch(`${BASE_URL}/api/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const paymentsApiData = await paymentsApiRes.json();
    const allPayments = paymentsApiData.payments || [];

    const bookingPayments = allPayments.filter(
      p => (p.bookingId === finalBooking.id || p.booking?.id === finalBooking.id || p.quotationId === quotation.id) && p.verified
    );
    const calculatedPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const calculatedBalance = Math.max(0, Number(finalBooking.totalAmount) - calculatedPaid);

    assert(calculatedPaid === 150000, `Admin Ledger Paid calculation equals ₱150,000 (got ₱${calculatedPaid})`);
    assert(calculatedBalance === 150000, `Admin Ledger Remaining Balance correctly equals ₱150,000 (NOT full ₱300,000!)`);

    // 8. Cleanup
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
    await pool.query("DELETE FROM users WHERE email = 'ledger_test_user@example.com'");
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
