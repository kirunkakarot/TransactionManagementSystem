const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

const BASE_URL = 'http://localhost:3000';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runStorageSecurityTests() {
  console.log('========================================================================');
  console.log('🧪 JAD EVENTS: PAYMENT-PROOF SECURE STORAGE & AUTHORIZATION TEST SUITE');
  console.log('========================================================================\n');

  try {
    const timestamp = Date.now();

    // 1. Setup Users: Customer A, Customer B, Admin
    const emailA = `client.a.${timestamp}@example.com`;
    const emailB = `client.b.${timestamp}@example.com`;
    const adminEmail = `admin.proof.${timestamp}@jadevents.ph`;

    const resA = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [emailA, 'Alice Customer', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    const userA = resA.rows[0];

    const resB = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [emailB, 'Bob Customer', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    const userB = resB.rows[0];

    const resAdmin = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [adminEmail, 'Director Admin', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Administrator']
    );
    const userAdmin = resAdmin.rows[0];

    const tokenA = jwt.sign({ id: userA.id, email: userA.email, role: 'Customer', name: userA.name }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB.id, email: userB.email, role: 'Customer', name: userB.name }, JWT_SECRET, { expiresIn: '1h' });
    const tokenAdmin = jwt.sign({ id: userAdmin.id, email: userAdmin.email, role: 'Administrator', name: userAdmin.name }, JWT_SECRET, { expiresIn: '1h' });

    console.log('--- TEST 1: Unauthenticated file upload attempt ---');
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const formAnon = new FormData();
    formAnon.append('proof', new Blob([validPngBuffer], { type: 'image/png' }), 'test-anon.png');

    const anonUploadRes = await fetch(`${BASE_URL}/api/payments/upload-proof`, {
      method: 'POST',
      body: formAnon,
    });
    assert(anonUploadRes.status === 401, `Unauthenticated upload rejected with 401 Unauthorized (Status: ${anonUploadRes.status})`);

    console.log('\n--- TEST 2: Invalid file extension upload ---');
    const formBadExt = new FormData();
    formBadExt.append('proof', new Blob([Buffer.from('malicious script')], { type: 'application/octet-stream' }), 'evil.exe');
    const badExtRes = await fetch(`${BASE_URL}/api/payments/upload-proof`, {
      method: 'POST',
      body: formBadExt,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(badExtRes.status === 400, `Invalid file extension rejected with 400 Bad Request (Status: ${badExtRes.status})`);

    console.log('\n--- TEST 3: Invalid magic bytes upload (spoofed MIME/extension) ---');
    const formSpoofed = new FormData();
    formSpoofed.append('proof', new Blob([Buffer.from('<?php echo "fake jpeg"; ?>')], { type: 'image/jpeg' }), 'exploit.jpg');
    const spoofedRes = await fetch(`${BASE_URL}/api/payments/upload-proof`, {
      method: 'POST',
      body: formSpoofed,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(spoofedRes.status === 400, `Spoofed magic bytes rejected with 400 Bad Request (Status: ${spoofedRes.status})`);

    console.log('\n--- TEST 4: Oversized file upload (> 5MB limit) ---');
    const formOversized = new FormData();
    const bigBuffer = Buffer.alloc(5.2 * 1024 * 1024);
    validPngBuffer.copy(bigBuffer, 0, 0, validPngBuffer.length);
    formOversized.append('proof', new Blob([bigBuffer], { type: 'image/png' }), 'large.png');
    const oversizedRes = await fetch(`${BASE_URL}/api/payments/upload-proof`, {
      method: 'POST',
      body: formOversized,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(oversizedRes.status === 400, `Oversized file rejected with 400 Bad Request (Status: ${oversizedRes.status})`);

    console.log('\n--- TEST 5: Valid file upload into private storage ---');
    const formValid = new FormData();
    formValid.append('proof', new Blob([validPngBuffer], { type: 'image/png' }), 'receipt-proof.png');
    const validUploadRes = await fetch(`${BASE_URL}/api/payments/upload-proof`, {
      method: 'POST',
      body: formValid,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(validUploadRes.status === 200, `Valid file uploaded successfully (Status: ${validUploadRes.status})`);
    const validUploadData = await validUploadRes.json();
    assert(validUploadData.success === true, 'Response contains success: true');
    assert(validUploadData.proofUrl.startsWith('/api/payments/proof/'), `proofUrl uses secure API route: ${validUploadData.proofUrl}`);
    assert(!validUploadData.proofUrl.includes('/uploads/payments/'), 'proofUrl does NOT expose public directory path');

    const filenameA = validUploadData.fileName;
    const privateDiskPath = path.join(process.cwd(), 'storage', 'payments', filenameA);
    assert(fs.existsSync(privateDiskPath), `File physically stored in private location: ${privateDiskPath}`);

    const publicDiskPath = path.join(process.cwd(), 'public', 'uploads', 'payments', filenameA);
    assert(!fs.existsSync(publicDiskPath), 'File is NOT stored in public/uploads/payments/');

    // Check direct static HTTP GET to public webroot
    const publicUrlFetch = await fetch(`${BASE_URL}/uploads/payments/${filenameA}`);
    assert(publicUrlFetch.status === 404, `Direct unauthenticated public web access returns 404 Not Found (Status: ${publicUrlFetch.status})`);

    console.log('\n--- TEST 6: Unauthenticated access to proof viewing API ---');
    const unauthProofRes = await fetch(`${BASE_URL}/api/payments/proof/${filenameA}`);
    assert(unauthProofRes.status === 401, `Unauthenticated request to proof endpoint rejected with 401 (Status: ${unauthProofRes.status})`);

    console.log('\n--- TEST 7: Path traversal prevention ---');
    const traversalRes = await fetch(`${BASE_URL}/api/payments/proof/..%2f..%2fpackage.json`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(traversalRes.status === 400 || traversalRes.status === 404, `Path traversal attack denied (Status: ${traversalRes.status})`);

    console.log('\n--- TEST 8: Customer A links proof to Quotation & Downpayment ---');
    const quoteDate = new Date();
    quoteDate.setDate(quoteDate.getDate() + 30);
    const quoteRes = await pool.query(
      `INSERT INTO quotations (quotation_ref, user_id, client_name, client_email, client_phone, event_type, event_date, venue, guest_count, subtotal, grand_total, required_downpayment, valid_until, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, quotation_ref`,
      [
        `QT-${timestamp}-A`,
        userA.id,
        userA.name,
        userA.email,
        '0917-111-2222',
        'Wedding Ceremony',
        quoteDate,
        'Manila Hotel Pavilion',
        150,
        100000,
        100000,
        50000,
        quoteDate,
        'Accepted'
      ]
    );
    const quotationA = quoteRes.rows[0];

    const depositRes = await fetch(`${BASE_URL}/api/quotations/${quotationA.id}/pay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: `GCASH-A-${timestamp}`,
        amount: 50000,
        proofUrl: validUploadData.proofUrl,
        notes: 'Deposit proof attached securely',
      }),
    });
    assert(depositRes.status === 200, `Downpayment proof submitted successfully by Customer A (Status: ${depositRes.status})`);
    const depositData = await depositRes.json();
    assert(depositData.payment.status === 'Pending Verification', 'Payment status is "Pending Verification"');
    assert(depositData.payment.proofUrl === validUploadData.proofUrl, 'Payment record saved with secure proofUrl');

    console.log('\n--- TEST 9: Customer A views their own proof ---');
    const ownProofRes = await fetch(`${BASE_URL}/api/payments/proof/${filenameA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(ownProofRes.status === 200, `Customer A authorized to view their own proof (Status: ${ownProofRes.status})`);
    const ownContentType = ownProofRes.headers.get('content-type');
    assert(ownContentType === 'image/png', `Returns correct Content-Type: ${ownContentType}`);
    assert(ownProofRes.headers.get('x-content-type-options') === 'nosniff', 'Includes X-Content-Type-Options: nosniff');

    console.log('\n--- TEST 10: Customer B (adversary) attempts to view Customer A\'s proof ---');
    const adversaryProofRes = await fetch(`${BASE_URL}/api/payments/proof/${filenameA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(adversaryProofRes.status === 403, `Customer B strictly denied viewing Customer A\'s proof (Status: ${adversaryProofRes.status} 403 Forbidden)`);

    console.log('\n--- TEST 11: Administrator views Customer A\'s proof ---');
    const adminProofRes = await fetch(`${BASE_URL}/api/payments/proof/${filenameA}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(adminProofRes.status === 200, `Administrator successfully authorized to view proof (Status: ${adminProofRes.status})`);

    console.log('\n--- TEST 12: Admin verifies payment proof and checks status & balance ---');
    const paymentId = depositData.payment.id;
    const verifyRes = await fetch(`${BASE_URL}/api/payments/${paymentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(verifyRes.status === 200, `Admin verified payment proof successfully (Status: ${verifyRes.status})`);
    const verifyData = await verifyRes.json();
    assert(verifyData.payment.verified === true, 'Payment marked verified: true');
    assert(verifyData.payment.status === 'Verified', 'Payment status updated to "Verified"');

    const qCheckRes = await pool.query('SELECT status FROM quotations WHERE id = $1', [quotationA.id]);
    assert(qCheckRes.rows[0].status === 'Deposit Paid', `Quotation status advanced to "Deposit Paid" (Status: ${qCheckRes.rows[0].status})`);

    const bookingCheckRes = await pool.query('SELECT id, status, total_amount FROM bookings WHERE quotation_id = $1', [quotationA.id]);
    assert(bookingCheckRes.rows.length === 1, 'Booking automatically generated upon verified deposit');
    assert(bookingCheckRes.rows[0].status === 'Confirmed', 'Booking status confirmed');

    console.log('\n========================================================================');
    console.log(`🎉 COMPLETED PAYMENT PROOF SECURITY VALIDATION`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log('========================================================================\n');

    await pool.end();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    await pool.end();
    process.exit(1);
  }
}

runStorageSecurityTests();
