const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 JAD EVENTS — WORKFLOW & BUG FIX VERIFICATION SUITE');
  console.log('====================================================\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. Ensure real test users in database
  const userAQuery = await pool.query(`
    INSERT INTO users (name, email, password, role, phone)
    VALUES ('Alice Walker', 'alice_audit@example.com', 'dummy_hash', 'Customer', '0917-555-1111')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
    RETURNING id, name, email, role, phone;
  `);
  const userA = userAQuery.rows[0];

  const userBQuery = await pool.query(`
    INSERT INTO users (name, email, password, role, phone)
    VALUES ('Bob Roberts', 'bob_audit@example.com', 'dummy_hash', 'Customer', '0918-555-2222')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
    RETURNING id, name, email, role, phone;
  `);
  const userB = userBQuery.rows[0];

  const adminQuery = await pool.query(`
    INSERT INTO users (name, email, password, role)
    VALUES ('Admin Director', 'admin@jadevents.com', 'dummy_hash', 'Administrator')
    ON CONFLICT (email) DO UPDATE SET role = 'Administrator'
    RETURNING id, name, email, role;
  `);
  const admin = adminQuery.rows[0];

  const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, name: admin.name }, JWT_SECRET, { expiresIn: '1d' });
  const customerTokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role, name: userA.name }, JWT_SECRET, { expiresIn: '1d' });
  const customerTokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role, name: userB.name }, JWT_SECRET, { expiresIn: '1d' });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const runId = Math.floor(1000 + Math.random() * 9000);
  const eventDateStr = '2026-10-25';

  try {
    // TEST 1: Customer Inquiry Submission & Persistence
    console.log('--- TEST 1: Customer Inquiry Submission & Persistence ---');
    const inqRes = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        fullName: 'Alice Walker',
        email: 'alice_audit@example.com',
        phone: '0917-555-1111',
        eventType: '18th Debut Extravaganza',
        eventDate: eventDateStr,
        venue: 'The Bellevue Hotel Grand Ballroom',
        guestCount: 180,
        selectedServices: ['event-styling', 'photo-booth'],
        packageId: 'pkg-debut',
        notes: 'VIP grand staircase setup with custom LED wall visual effects.',
        budgetRange: '₱120,000',
      }),
    });

    const inqData = await inqRes.json();
    assert(inqRes.status === 201, `POST /api/inquiries returned HTTP 201 (Created)`);
    assert(inqData.success === true, `Response success is true`);
    assert(inqData.inquiry && inqData.inquiry.id > 0, `Inquiry stored in PostgreSQL with ID #${inqData.inquiry.id}`);
    assert(inqData.inquiry.userId === userA.id, `Inquiry correctly associated with user ID #${userA.id}`);
    assert(inqData.inquiry.clientEmail === 'alice_audit@example.com', `Inquiry captures client email: ${inqData.inquiry.clientEmail}`);
    assert(inqData.inquiry.clientName === 'Alice Walker', `Inquiry captures client name: ${inqData.inquiry.clientName}`);

    const inquiryId = inqData.inquiry.id;
    const trackingId = inqData.trackingId;

    // TEST 2: Customer Dashboard Retrieval (Customer A sees their inquiry)
    console.log('\n--- TEST 2: Customer Dashboard Inquiry Retrieval ---');
    const portalResA = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    const portalDataA = await portalResA.json();
    assert(portalResA.status === 200, `GET /api/customer/portal returned HTTP 200 for Customer A`);
    const foundInqA = portalDataA.inquiries?.find(i => i.id === inquiryId || i.trackingId === trackingId);
    assert(Boolean(foundInqA), `Customer A sees submitted Inquiry in Dashboard (ID: ${inquiryId}, Ref: ${trackingId})`);
    assert(foundInqA && foundInqA.clientName === 'Alice Walker', `Customer dashboard inquiry displays full customer name`);

    // TEST 3: Customer Isolation (Customer B cannot see Customer A's inquiry)
    console.log('\n--- TEST 3: Customer Isolation Check ---');
    const portalResB = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerTokenB}` },
    });
    const portalDataB = await portalResB.json();
    const foundInqB = portalDataB.inquiries?.find(i => i.id === inquiryId || i.trackingId === trackingId);
    assert(!foundInqB, `Customer B dashboard CANNOT see Customer A's inquiry (Strict Isolation enforced)`);

    // Direct inquiry ID access check by Customer B
    const directAccessResB = await fetch(`${API_BASE}/inquiries/${inquiryId}`, {
      headers: { 'Authorization': `Bearer ${customerTokenB}` },
    });
    assert(directAccessResB.status === 403, `GET /api/inquiries/${inquiryId} by Customer B returned HTTP 403 Forbidden`);

    // TEST 4: Admin Inquiry Details Retrieval
    console.log('\n--- TEST 4: Admin Inquiry Details Retrieval ---');
    const adminInqRes = await fetch(`${API_BASE}/inquiries/${inquiryId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const adminInqData = await adminInqRes.json();
    assert(adminInqRes.status === 200, `GET /api/inquiries/${inquiryId} by Admin returned HTTP 200`);
    assert(adminInqData.clientName === 'Alice Walker', `Admin retrieved clientName: ${adminInqData.clientName}`);
    assert(adminInqData.clientPhone === '0917-555-1111', `Admin retrieved clientPhone: ${adminInqData.clientPhone}`);
    assert(adminInqData.notes.includes('VIP grand staircase setup'), `Admin retrieved complete customer notes`);
    assert(adminInqData.packageId === 'pkg-debut', `Admin retrieved selected package: ${adminInqData.packageId}`);

    // TEST 5: Quotation Creation from Inquiry
    console.log('\n--- TEST 5: Admin Creates Quotation from Inquiry ---');
    const quoteRef = `QT-2026-${runId}`;
    const createQuoteRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        quotationRef: quoteRef,
        inquiryId: inquiryId,
        clientName: 'Alice Walker',
        clientEmail: 'alice_audit@example.com',
        clientPhone: '0917-555-1111',
        eventType: '18th Debut Extravaganza',
        eventDate: eventDateStr,
        venue: 'The Bellevue Hotel Grand Ballroom',
        guestCount: 180,
        items: [
          { id: 'item-1', type: 'package', name: 'Grand Debut Package', rate: 100000, quantity: 1, amount: 100000 },
        ],
        subtotal: 100000,
        grandTotal: 100000,
        requiredDownpayment: 50000,
        validUntil: '2026-10-15',
        status: 'Quotation Sent',
      }),
    });

    const quoteData = await createQuoteRes.json();
    assert(createQuoteRes.status === 201, `POST /api/quotations returned HTTP 201 (Created)`);
    assert(quoteData.inquiryId === inquiryId, `Quotation successfully references Inquiry ID ${inquiryId}`);

    const quotationId = quoteData.id;

    // Customer accepts quotation
    const acceptRes = await fetch(`${API_BASE}/quotations/${quotationId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    assert(acceptRes.status === 200, `POST /api/quotations/${quotationId}/accept returned HTTP 200`);

    // TEST 6: Invalid Inquiry ID in Booking Creation
    console.log('\n--- TEST 6: Invalid Inquiry ID Rejection in Booking Creation ---');
    const invalidBookingRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId: 9999999, // Non-existent Inquiry ID
        clientName: 'Alice Walker',
        clientEmail: 'alice_audit@example.com',
        eventTitle: 'Invalid Inquiry Test',
        eventType: 'Debut',
        eventDate: '2026-11-30',
        venue: 'Some Random Venue',
        guestCount: 100,
        totalAmount: 50000,
      }),
    });
    const invalidBookingData = await invalidBookingRes.json();
    assert(invalidBookingRes.status === 400 || invalidBookingRes.status === 404, `Invalid inquiry ID rejected with HTTP ${invalidBookingRes.status} (Clean error)`);
    assert(invalidBookingData.message.includes('does not exist in database'), `Error message: "${invalidBookingData.message}"`);

    // TEST 7: Quotation & Inquiry Mismatch Rejection
    console.log('\n--- TEST 7: Quotation & Inquiry Mismatch Rejection ---');
    // Create another inquiry B
    const inqResB = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerTokenB}`,
      },
      body: JSON.stringify({
        fullName: 'Bob Roberts',
        email: 'bob_audit@example.com',
        eventType: 'Corporate Gala',
        eventDate: '2026-12-05',
        venue: 'Solaire Grand Ballroom',
        guestCount: 200,
      }),
    });
    const inqDataB = await inqResB.json();
    const inquiryIdB = inqDataB.inquiry.id;

    const mismatchRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        quotationId: quotationId, // Associated with Inquiry A
        inquiryId: inquiryIdB,     // Mismatched Inquiry B
        clientName: 'Alice Walker',
        clientEmail: 'alice_audit@example.com',
        eventTitle: 'Mismatch Booking',
        eventType: 'Debut',
        eventDate: eventDateStr,
        venue: 'The Bellevue Hotel Grand Ballroom',
        guestCount: 180,
        totalAmount: 100000,
      }),
    });
    const mismatchData = await mismatchRes.json();
    assert(mismatchRes.status === 400 || mismatchRes.status === 409, `Quotation/Inquiry mismatch rejected with HTTP ${mismatchRes.status}`);
    assert(mismatchData.message.includes('does not match requested Inquiry'), `Clean mismatch message: "${mismatchData.message}"`);

    // TEST 8: Valid Inquiry -> Quotation -> Booking Success
    console.log('\n--- TEST 8: Valid Inquiry -> Quotation -> Booking Creation ---');
    const validBookingRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        quotationId: quotationId,
        inquiryId: inquiryId,
        clientName: 'Alice Walker',
        clientEmail: 'alice_audit@example.com',
        clientPhone: '0917-555-1111',
        eventTitle: "Alice's 18th Debut Extravaganza",
        eventType: '18th Debut Extravaganza',
        eventDate: eventDateStr,
        startTime: '17:00',
        endTime: '23:00',
        venue: 'The Bellevue Hotel Grand Ballroom',
        guestCount: 180,
        totalAmount: 100000,
        status: 'Confirmed',
      }),
    });
    const validBookingData = await validBookingRes.json();
    assert(validBookingRes.status === 201, `POST /api/bookings returned HTTP 201 (Created)`);
    assert(validBookingData.inquiryId === inquiryId, `Booking foreign key inquiryId matches Inquiry ID ${inquiryId}`);
    assert(validBookingData.quotationId === quotationId, `Booking foreign key quotationId matches Quotation ID ${quotationId}`);

    const bookingId = validBookingData.id;

    // TEST 9: Scheduling & Venue Collision Protection Maintained
    console.log('\n--- TEST 9: Scheduling Conflict Detection Maintained ---');
    const collideRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        clientName: 'Colliding Client',
        clientEmail: 'collide@example.com',
        eventTitle: 'Overlapping Evening Event',
        eventType: 'Gala',
        eventDate: eventDateStr, // Same date
        startTime: '18:00',      // Overlaps with 17:00-23:00
        endTime: '22:00',
        venue: 'The Bellevue Hotel Grand Ballroom', // Same venue
        guestCount: 100,
        totalAmount: 40000,
        status: 'Confirmed',
      }),
    });
    const collideData = await collideRes.json();
    assert(collideRes.status === 409, `Overlapping venue booking rejected with HTTP 409 Conflict`);
    assert(collideData.message.includes('conflict') || collideData.message.includes('Venue'), `Conflict message received: "${collideData.message}"`);

    // Clean up
    console.log('\n--- Cleaning up test records ---');
    await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Audit cleanup' }),
    });

    await pool.query('DELETE FROM event_schedules WHERE booking_id = $1', [bookingId]);
    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    await pool.query('DELETE FROM quotations WHERE id = $1', [quotationId]);
    await pool.query('DELETE FROM inquiries WHERE id = ANY($1::int[])', [[inquiryId, inquiryIdB]]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', ['alice_audit@example.com', 'bob_audit@example.com']);

    console.log('Cleanup completed.\n');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');
}

runTests().catch(console.error);
