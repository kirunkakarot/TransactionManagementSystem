const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db',
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-jad-events-production-2026';
const BASE_URL = 'http://localhost:3000';

async function testRecordRemainingBalance() {
  console.log('🧪 Testing Recording Remaining Balance on Confirmed Booking...\n');

  let customerUser, adminUser, inquiryId, quotationId, bookingId;

  try {
    const timestamp = Date.now();
    const customerEmail = `customer.balance.${timestamp}@example.com`;
    const adminEmail = `admin.balance.${timestamp}@jadevents.ph`;

    const custRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [customerEmail, 'Maria Balance Santos', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    customerUser = custRes.rows[0];

    const adminUserRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [adminEmail, 'Director Balance Admin', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Administrator']
    );
    adminUser = adminUserRes.rows[0];

    const customerToken = jwt.sign(
      { id: customerUser.id, email: customerUser.email, role: 'Customer', name: customerUser.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'Administrator', name: adminUser.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Submit Inquiry
    console.log('1. Submitting Inquiry...');
    const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        fullName: 'Maria Balance Santos',
        email: customerEmail,
        phone: '09179998877',
        eventType: 'Wedding Reception',
        eventDate: '2027-06-15',
        venue: 'Grand Vista Hall B',
        guestCount: 150,
      }),
    });
    const inqJson = await inqRes.json();
    const inqData = inqJson.inquiry || inqJson;
    inquiryId = inqData.id;
    console.log(`   ✅ Inquiry created: ID #${inquiryId}`);

    // 2. Create Quotation (₱100,000)
    console.log('\n2. Creating Quotation (₱100,000)...');
    const quoteRes = await fetch(`${BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        inquiryId,
        clientName: 'Maria Balance Santos',
        clientEmail: customerEmail,
        eventType: 'Wedding Reception',
        eventDate: '2027-06-15',
        venue: 'Grand Vista Hall B',
        guestCount: 150,
        items: [{ id: '1', type: 'package', name: 'Premium Wedding Package', rate: 100000, quantity: 1, amount: 100000 }],
        subtotal: 100000,
        grandTotal: 100000,
        requiredDownpayment: 50000,
        status: 'Quotation Sent',
      }),
    });
    const quoteData = await quoteRes.json();
    quotationId = quoteData.id;
    console.log(`   ✅ Quotation created: Ref #${quoteData.quotationRef || quotationId}`);

    // 3. Accept Quotation & Pay 50% Downpayment
    console.log('\n3. Accepting Quotation & Paying Downpayment (₱50,000)...');
    await fetch(`${BASE_URL}/api/quotations/${quotationId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });

    const depositRes = await fetch(`${BASE_URL}/api/quotations/${quotationId}/pay-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: `GCASH-DP-${timestamp}`,
        amount: 50000,
      }),
    });
    const depositData = await depositRes.json();
    console.log(`   ✅ Downpayment submitted: Transaction ID #${depositData.payment?.id}`);

    // 4. Admin verifies downpayment
    console.log('\n4. Admin verifying downpayment...');
    await fetch(`${BASE_URL}/api/payments/${depositData.payment.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    console.log('   ✅ Downpayment verified');

    // 5. Convert to Booking
    console.log('\n5. Converting to Confirmed Booking...');
    const bookingRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        inquiryId,
        quotationId,
        clientName: 'Maria Balance Santos',
        clientEmail: customerEmail,
        eventTitle: "Maria's Wedding Reception",
        eventType: 'Wedding Reception',
        eventDate: '2027-06-15',
        startTime: '17:00',
        endTime: '23:00',
        venue: 'Grand Vista Hall B',
        guestCount: 150,
        totalAmount: 100000,
        status: 'Confirmed',
      }),
    });
    const bookingJson = await bookingRes.json();
    const bookingData = bookingJson.booking || bookingJson;
    bookingId = bookingData.id;
    console.log(`   ✅ Booking created: ID #${bookingId} (${bookingData.bookingRef})`);

    // 6. Record Remaining Balance Payment (₱50,000) using booking reference string
    console.log('\n6. Admin recording remaining balance payment (₱50,000 Full Settlement)...');
    const balPaymentRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        bookingId: bookingData.bookingRef || bookingId, // Test with string ref!
        clientName: 'Maria Balance Santos',
        clientEmail: customerEmail,
        type: 'Full Settlement',
        amount: 50000,
        method: 'BDO Corporate Wire',
        referenceNumber: `BDO-BAL-${timestamp}`,
        date: new Date().toISOString().split('T')[0],
        verified: true,
        notes: 'Final remaining balance settled prior to event',
      }),
    });

    if (!balPaymentRes.ok) {
      const err = await balPaymentRes.json();
      throw new Error(`Failed to record remaining balance: ${err.message || balPaymentRes.statusText}`);
    }

    const balPaymentData = await balPaymentRes.json();
    console.log(`   ✅ Remaining balance payment recorded successfully: OR #${balPaymentData.receiptNumber || balPaymentData.id}`);

    // 7. Verify booking payment ledger summary
    console.log('\n7. Checking Booking Ledger Summary...');
    const bookingLedgerRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const bookingLedger = await bookingLedgerRes.json();
    const verifiedPayments = (bookingLedger.payments || []).filter(p => p.verified);
    const totalPaid = verifiedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingBalance = Math.max(0, Number(bookingLedger.totalAmount) - totalPaid);

    console.log(`   Total Contract: ₱${bookingLedger.totalAmount}`);
    console.log(`   Total Verified Paid: ₱${totalPaid}`);
    console.log(`   Remaining Balance: ₱${remainingBalance}`);

    if (totalPaid !== 100000 || remainingBalance !== 0) {
      throw new Error(`Balance calculation mismatch: totalPaid=${totalPaid}, remainingBalance=${remainingBalance}`);
    }

    console.log('\n🎉 REMAINING BALANCE RECORDING & LEDGER SETTLEMENT TEST PASSED!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (bookingId) await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    if (quotationId) await pool.query('DELETE FROM quotations WHERE id = $1', [quotationId]);
    if (inquiryId) await pool.query('DELETE FROM inquiries WHERE id = $1', [inquiryId]);
    if (customerUser && adminUser) {
      await pool.query('DELETE FROM payment_transactions WHERE client_email = $1', [customerUser.email]);
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [customerUser.id, adminUser.id]);
    }
    await pool.end();
  }
}

testRecordRemainingBalance();
