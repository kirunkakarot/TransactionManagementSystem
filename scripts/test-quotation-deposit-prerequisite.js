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
  console.log('🧪 JAD EVENTS — QUOTATION ACCEPTANCE BEFORE DOWNPAYMENT TEST');
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

    let customerRes = await pool.query("SELECT * FROM users WHERE email = 'quote_accept_first_test@example.com' LIMIT 1");
    let customer;
    if (customerRes.rows.length === 0) {
      const newCust = await pool.query(
        "INSERT INTO users (email, name, phone, role, password) VALUES ('quote_accept_first_test@example.com', 'Accept First Customer', '0917-333-2211', 'Customer', 'dummy') RETURNING *"
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
    console.log('\n--- Step 1: Submit Inquiry ---');
    const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Clarissa Vance',
        email: customer.email,
        phone: '0917-333-2211',
        eventType: 'Golden Anniversary',
        eventDate: '2026-11-28',
        venue: 'Shangri-La The Fort Grand Ballroom',
        guestCount: 150,
        estimatedBudget: '200000',
        selectedServices: ['event-styling', 'photo-booth'],
      }),
    });
    const inqData = await inqRes.json();
    assert(inqRes.status === 201, `Inquiry created with HTTP 201`);
    const inquiry = inqData.inquiry;
    createdInquiryIds.push(inquiry.id);

    // 2. Admin creates quotation (status: 'Quotation Sent')
    console.log('\n--- Step 2: Admin Creates Quotation (Status: Quotation Sent) ---');
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
        eventDate: '2026-11-28',
        venue: inquiry.eventVenue,
        guestCount: inquiry.guestsCount,
        subtotal: 200000,
        grandTotal: 200000,
        requiredDownpayment: 100000,
        validUntil: '2026-11-15',
        status: 'Quotation Sent',
      }),
    });
    const quoteData = await quoteRes.json();
    const quotation = quoteData.quotation || quoteData;
    assert(quoteRes.status === 201, `Quotation created with status "Quotation Sent"`);
    createdQuotationIds.push(quotation.id);

    // 3. Customer attempts to pay downpayment BEFORE accepting quotation (MUST FAIL)
    console.log('\n--- Step 3: Customer Attempts Downpayment Before Acceptance (Must Fail) ---');
    const prematurePayRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: 'GCASH-PREMATURE-123',
      }),
    });
    const prematurePayData = await prematurePayRes.json();
    assert(prematurePayRes.status === 400, `Premature downpayment rejected with HTTP 400 (got ${prematurePayRes.status})`);
    assert(
      prematurePayData.message.includes('accept the official quotation before submitting the reservation downpayment'),
      `Correct prerequisite error: "${prematurePayData.message}"`
    );

    // 4. Customer accepts quotation
    console.log('\n--- Step 4: Customer Accepts Quotation ---');
    const acceptRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    assert(acceptRes.status === 200, `Quotation accepted with HTTP 200`);

    // 5. Customer pays downpayment AFTER accepting quotation (MUST SUCCEED)
    console.log('\n--- Step 5: Customer Pays Downpayment After Acceptance (Must Succeed) ---');
    const validPayRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: 'GCASH-VALID-123',
        notes: '50% reservation downpayment after acceptance',
      }),
    });
    assert(validPayRes.status === 200, `Downpayment settled with HTTP 200 after acceptance`);

    // Verify quotation status in database
    const quoteDbRes = await pool.query('SELECT * FROM quotations WHERE id = $1', [quotation.id]);
    assert(quoteDbRes.rows[0].status === 'Deposit Paid', `Quotation status updated to "Deposit Paid" in PostgreSQL`);

    // 6. Cleanup
    console.log('\n--- Cleaning up test records ---');
    for (const qId of createdQuotationIds) {
      await pool.query('DELETE FROM payment_transactions WHERE quotation_id = $1', [qId]);
      await pool.query('DELETE FROM quotations WHERE id = $1', [qId]);
    }
    for (const inqId of createdInquiryIds) {
      await pool.query('DELETE FROM inquiries WHERE id = $1', [inqId]);
    }
    await pool.query("DELETE FROM users WHERE email = 'quote_accept_first_test@example.com'");
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
