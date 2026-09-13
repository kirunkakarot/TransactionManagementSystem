const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jad-events-secret-key-2026';
const BASE_URL = 'http://localhost:3000';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jadevents',
});

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS ${passed + 1}] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 JAD EVENTS RESERVATION SYSTEM: OPTION B MANUAL PAYMENT VERIFICATION SUITE');
  console.log('   Testing 30 Mandatory Business Logic, Security & Workflow Requirements');
  console.log('========================================================================\n');

  try {
    const timestamp = Date.now();
    const testDate = `2027-04-${String(10 + Math.floor(Math.random() * 18)).padStart(2, '0')}`;
    const testVenue = `Grand Ballroom Option B Test Venue ${timestamp}`;

    // 1. Create Test Customer, Second Customer (Adversary), and Admin Director
    const customerEmail = `customer.optionb.${timestamp}@example.com`;
    const otherCustomerEmail = `other.customer.${timestamp}@example.com`;
    const adminEmail = `admin.director.${timestamp}@jadevents.ph`;

    const custRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [customerEmail, 'Maria OptionB Santos', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    const customerUser = custRes.rows[0];

    const otherCustRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [otherCustomerEmail, 'Attacker User', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    const otherCustomerUser = otherCustRes.rows[0];

    const adminUserRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [adminEmail, 'Operations Director', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Administrator']
    );
    const adminUser = adminUserRes.rows[0];

    const customerToken = jwt.sign({ id: customerUser.id, email: customerUser.email, role: 'Customer', name: customerUser.name }, JWT_SECRET, { expiresIn: '1h' });
    const otherCustomerToken = jwt.sign({ id: otherCustomerUser.id, email: otherCustomerUser.email, role: 'Customer', name: otherCustomerUser.name }, JWT_SECRET, { expiresIn: '1h' });
    const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: 'Administrator', name: adminUser.name }, JWT_SECRET, { expiresIn: '1h' });

    console.log('--- Phase 1: Inquiry Submission & Processing ---');
    
    // Req 1: Customer submits event inquiry
    const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        fullName: customerUser.name,
        email: customerUser.email,
        phone: '0917-555-0199',
        eventType: 'Grand Debut & Concert Production',
        eventDate: testDate,
        venue: testVenue,
        guestCount: 200,
        selectedServices: ['srv-1', 'srv-2'],
        packageId: 'pkg-1',
        notes: 'Option B Manual Payment & Verification Test Event',
      }),
    });
    const inqData = await inqRes.json();
    assert(inqRes.ok && inqData.inquiry?.id, 'Requirement 1: Customer successfully submits event inquiry');
    const inquiry = inqData.inquiry;

    // Req 2: Inquiry status initialized to "Pending Review"
    assert(inquiry.status === 'Pending Review', 'Requirement 2: Inquiry status initialized to "Pending Review"');

    // Req 3: Customer receives tracking ID
    assert(Boolean(inquiry.trackingId), `Requirement 3: Customer receives unique tracking ID (${inquiry.trackingId})`);

    // Req 4: Admin queries inquiries and retrieves new submission
    const adminInqListRes = await fetch(`${BASE_URL}/api/inquiries?search=${encodeURIComponent(customerUser.email)}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const adminInqListData = await adminInqListRes.json();
    const foundInq = (adminInqListData.inquiries || []).find(i => i.id === inquiry.id);
    assert(Boolean(foundInq), 'Requirement 4: Administrator retrieves submitted inquiry in admin portal');

    console.log('\n--- Phase 2: Quotation Generation & Delivery ---');

    // Req 5: Admin generates itemized quotation for inquiry
    const quoteRes = await fetch(`${BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        userId: customerUser.id,
        clientName: customerUser.name,
        clientEmail: customerUser.email,
        eventType: 'Grand Debut & Concert Production',
        eventDate: testDate,
        venue: testVenue,
        guestCount: 200,
        subtotal: 100000,
        grandTotal: 100000,
        requiredDownpayment: 50000,
        validUntil: '2027-04-01',
        items: [
          { id: 'item-1', type: 'service', name: 'Stage Rigging & Truss Lighting', rate: 60000, quantity: 1, amount: 60000 },
          { id: 'item-2', type: 'service', name: 'Concert Line Array Audio System', rate: 40000, quantity: 1, amount: 40000 },
        ],
      }),
    });
    const quoteData = await quoteRes.json();
    const quotation = quoteData.quotation || quoteData;
    assert(quoteRes.ok && quotation?.id, 'Requirement 5: Administrator generates official itemized quotation');

    // Req 6: Quotation initialized with status "Quotation Sent"
    assert(quotation.status === 'Quotation Sent', 'Requirement 6: Quotation created with status "Quotation Sent"');

    // Req 7: Quotation calculates 50% reservation downpayment required
    assert(Number(quotation.requiredDownpayment) === 50000, 'Requirement 7: Quotation enforces 50% reservation downpayment amount (₱50,000)');

    // Req 8: Customer receives quotation in customer portal
    const customerPortalRes = await fetch(`${BASE_URL}/api/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    const customerPortalData = await customerPortalRes.json();
    const receivedQuote = (customerPortalData.quotations || []).find(q => q.id === quotation.id);
    assert(Boolean(receivedQuote), 'Requirement 8: Customer successfully receives official quotation in portal');

    console.log('\n--- Phase 3: Acceptance Gate & Payment Submission (Option B) ---');

    // Req 9: Customer CANNOT submit downpayment while quotation is unaccepted (HTTP 400 gate)
    const prematurePayRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: 'GCASH-PREMATURE-01',
        amount: 50000,
      }),
    });
    assert(prematurePayRes.status === 400, 'Requirement 9: Server blocks downpayment before quotation acceptance (HTTP 400)');

    // Req 10: Customer accepts quotation
    const acceptRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.ok && acceptData.quotation?.status === 'Accepted', 'Requirement 10: Customer accepts quotation (status becomes "Accepted")');

    // Req 11: Inquiry status synchronized to "Accepted"
    const inqCheck = await pool.query("SELECT status FROM inquiries WHERE id = $1", [inquiry.id]);
    assert(inqCheck.rows[0].status === 'Accepted', 'Requirement 11: Inquiry status synchronized to "Accepted"');

    // Req 12: Customer submits manual payment proof (Option B)
    const payProofRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        method: 'GCash Express Send',
        referenceNumber: 'GCASH-REF-INITIAL-123456',
        amount: 50000,
        proofUrl: '/uploads/payments/proof-initial.png',
        notes: 'Paid via GCash mobile app transfer proof',
      }),
    });
    const payProofData = await payProofRes.json();
    assert(payProofRes.ok && Boolean(payProofData.payment?.id), 'Requirement 12: Customer submits manual payment record and proof');
    const paymentRecord = payProofData.payment;

    // Req 13: Payment transaction created with status "Pending Verification"
    assert(paymentRecord.status === 'Pending Verification', 'Requirement 13: Payment recorded with status "Pending Verification"');

    // Req 14: Payment verified flag is explicitly false
    assert(paymentRecord.verified === false, 'Requirement 14: System does NOT auto-verify payment (verified: false)');

    // Req 15: Pending payment is NOT credited as verified paid amount in portal
    const pendingPortalRes = await fetch(`${BASE_URL}/api/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    const pendingPortalData = await pendingPortalRes.json();
    const verifiedPaymentsBefore = (pendingPortalData.payments || []).filter(p => p.verified && p.quotationId === quotation.id);
    assert(verifiedPaymentsBefore.length === 0, 'Requirement 15: Pending payment does NOT count toward verified paid total (Verified Paid = ₱0)');

    // Req 16: Remaining balance remains 100% of grand total while pending
    const remainingBalanceWhilePending = 100000 - (verifiedPaymentsBefore.reduce((s, p) => s + Number(p.amount), 0));
    assert(remainingBalanceWhilePending === 100000, 'Requirement 16: Remaining balance remains full amount (₱100,000) while pending');

    console.log('\n--- Phase 4: Security Authorization & Premature Conversion Gate ---');

    // Req 17: Customer cannot self-verify payment proof (HTTP 403 Forbidden)
    const selfVerifyRes = await fetch(`${BASE_URL}/api/payments/${paymentRecord.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    assert(selfVerifyRes.status === 403, 'Requirement 17: Customer role cannot self-verify payment (HTTP 403 Forbidden)');

    // Req 18: Other customer cannot access/accept payment (HTTP 403 Forbidden)
    const crossAccessRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${otherCustomerToken}` },
    });
    assert(crossAccessRes.status === 403, 'Requirement 18: Cross-customer isolation enforced (HTTP 403 Forbidden)');

    // Req 19: Admin cannot convert inquiry to booking while payment is pending verification (HTTP 400 gate)
    const prematureBookingRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        quotationId: quotation.id,
        clientName: customerUser.name,
        clientEmail: customerUser.email,
        eventTitle: 'Premature Booking Test',
        eventType: 'Grand Debut & Concert Production',
        eventDate: testDate,
        venue: testVenue,
        guestCount: 200,
        totalAmount: 100000,
      }),
    });
    const prematureBookingData = await prematureBookingRes.json();
    assert(prematureBookingRes.status === 400 && prematureBookingData.message.includes('pending administrator verification'), 'Requirement 19: Server-side gate blocks booking conversion while payment is pending verification');

    console.log('\n--- Phase 5: Administrator Rejection & Customer Resubmission ---');

    // Req 20: Admin reviews payment proof and rejects with audit reason
    const rejectRes = await fetch(`${BASE_URL}/api/payments/${paymentRecord.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Transaction reference number not found in GCash merchant statement' }),
    });
    const rejectData = await rejectRes.json();
    assert(rejectRes.ok && rejectData.payment?.status === 'Rejected', 'Requirement 20: Administrator can reject unverified payment proof');

    // Req 21: Rejected payment status becomes "Rejected" with rejection reason and audit metadata
    assert(rejectData.payment?.rejectionReason === 'Transaction reference number not found in GCash merchant statement', 'Requirement 21: Audit trail captures rejection reason');

    // Req 22: Customer portal shows rejected status with administrator note
    const portalAfterRejectRes = await fetch(`${BASE_URL}/api/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    const portalAfterRejectData = await portalAfterRejectRes.json();
    const rejectedInPortal = (portalAfterRejectData.payments || []).find(p => p.id === paymentRecord.id);
    assert(rejectedInPortal && rejectedInPortal.status === 'Rejected' && rejectedInPortal.rejectionReason, 'Requirement 22: Customer portal displays rejection notice and administrator note');

    // Req 23: Customer resubmits corrected payment proof
    const resubmitRes = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pay-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        method: 'BDO Unibank Wire Transfer',
        referenceNumber: 'BDO-REF-CORRECTED-998877',
        amount: 50000,
        proofUrl: '/uploads/payments/proof-bdo-wire-confirmed.png',
        notes: 'Resubmitting official BDO wire transfer receipt voucher',
      }),
    });
    const resubmitData = await resubmitRes.json();
    assert(resubmitRes.ok && Boolean(resubmitData.payment?.id), 'Requirement 23: Customer successfully resubmits corrected payment proof');
    const correctedPaymentId = resubmitData.payment.id;

    // Req 24: Resubmitted payment receives status "Pending Verification"
    assert(resubmitData.payment?.status === 'Pending Verification', 'Requirement 24: Resubmitted payment starts fresh as "Pending Verification"');

    console.log('\n--- Phase 6: Payment Verification & Balance Settlement ---');

    // Req 25: Admin verifies valid payment proof (POST /api/payments/[id]/verify)
    const verifyRes = await fetch(`${BASE_URL}/api/payments/${correctedPaymentId}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.ok && verifyData.payment?.status === 'Verified', 'Requirement 25: Administrator verifies valid payment proof');

    // Req 26: Verified payment status becomes "Verified" (verified=true, verifiedBy, verifiedAt)
    assert(verifyData.payment?.verified === true && Boolean(verifyData.payment?.verifiedBy), 'Requirement 26: Verified metadata and verifiedBy recorded in audit ledger');

    // Req 27: Quotation status automatically advances to "Deposit Paid"
    const portalAfterVerifyRes = await fetch(`${BASE_URL}/api/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    const portalAfterVerifyData = await portalAfterVerifyRes.json();
    const quoteAfterVerify = (portalAfterVerifyData.quotations || []).find(q => q.id === quotation.id);
    assert(quoteAfterVerify && quoteAfterVerify.status === 'Deposit Paid', 'Requirement 27: Quotation status advances to "Deposit Paid"');

    // Req 28: Customer portal reflects Verified Paid = 50% downpayment, Remaining Balance = 50%
    const verifiedPortalPayments = (portalAfterVerifyData.payments || []).filter(p => p.verified && p.quotationId === quotation.id);
    const totalVerifiedPaid = verifiedPortalPayments.reduce((s, p) => s + Number(p.amount), 0);
    const newRemainingBalance = Number(quoteAfterVerify.grandTotal) - totalVerifiedPaid;
    assert(totalVerifiedPaid === 50000 && newRemainingBalance === 50000, `Requirement 28: Portal ledger accurately calculates Verified Paid (₱${totalVerifiedPaid.toLocaleString()}) and Remaining Balance (₱${newRemainingBalance.toLocaleString()})`);

    console.log('\n--- Phase 7: Booking Conversion & Schedule Finalization ---');

    // Req 29: Admin converts inquiry to confirmed booking (status="Confirmed", event_schedules active)
    const bookingRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        quotationId: quotation.id,
        clientName: customerUser.name,
        clientEmail: customerUser.email,
        eventTitle: `${customerUser.name}'s Grand Debut & Concert Production`,
        eventType: 'Grand Debut & Concert Production',
        eventDate: testDate,
        venue: testVenue,
        guestCount: 200,
        totalAmount: 100000,
      }),
    });
    const bookingData = await bookingRes.json();
    if (!bookingRes.ok) console.error('Booking creation error:', bookingRes.status, bookingData);
    const createdBooking = bookingData.booking || bookingData;
    assert(bookingRes.ok && Boolean(createdBooking?.id), 'Requirement 29: Admin converts verified inquiry into confirmed booking');

    // Req 30: Verified payment transaction automatically linked to newly confirmed booking ID
    const updatedPaymentDbRes = await pool.query("SELECT booking_id, status, verified FROM payment_transactions WHERE id = $1", [correctedPaymentId]);
    assert(updatedPaymentDbRes.rows[0].booking_id === createdBooking.id, `Requirement 30: Verified payment transaction automatically linked to confirmed booking ID #${createdBooking.id}`);

    console.log('\n========================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} / 30 REQUIREMENTS PASSED (${failed} FAILED)`);
    console.log('========================================================================\n');

    await pool.end();
    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Test execution error:', error);
    await pool.end();
    process.exit(1);
  }
}

runTests();
