const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

async function runQuotationWorkflowTests() {
  console.log('================================================================================');
  console.log('🧪 JAD EVENTS — QUOTATION STATUS & CUSTOMER INQUIRY DETAILS VERIFICATION');
  console.log('================================================================================\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. Setup Test Users
  const userAQuery = await pool.query(`
    INSERT INTO users (name, email, password, role, phone)
    VALUES ('Clarissa Vance', 'clarissa_quotation@example.com', 'dummy_hash', 'Customer', '0917-888-9999')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
    RETURNING id, name, email, role, phone;
  `);
  const customerA = userAQuery.rows[0];

  const userBQuery = await pool.query(`
    INSERT INTO users (name, email, password, role, phone)
    VALUES ('Derek Stone', 'derek_quotation@example.com', 'dummy_hash', 'Customer', '0918-777-6666')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
    RETURNING id, name, email, role, phone;
  `);
  const customerB = userBQuery.rows[0];

  const adminQuery = await pool.query(`
    INSERT INTO users (name, email, password, role)
    VALUES ('Operations Admin', 'admin@jadevents.com', 'dummy_hash', 'Administrator')
    ON CONFLICT (email) DO UPDATE SET role = 'Administrator'
    RETURNING id, name, email, role;
  `);
  const admin = adminQuery.rows[0];

  const tokenA = jwt.sign({ id: customerA.id, email: customerA.email, role: customerA.role, name: customerA.name }, JWT_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign({ id: customerB.id, email: customerB.email, role: customerB.role, name: customerB.name }, JWT_SECRET, { expiresIn: '1d' });
  const tokenAdmin = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, name: admin.name }, JWT_SECRET, { expiresIn: '1d' });

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
  const targetDate = '2026-11-28';

  let inquiryAId = null;
  let quotationAId = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Customer A Submits Event Inquiry
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Customer A Submits Event Inquiry ---');
    const inqRes = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        fullName: 'Clarissa Vance',
        email: 'clarissa_quotation@example.com',
        phone: '0917-888-9999',
        eventType: 'Luxury Wedding Reception',
        eventDate: targetDate,
        venue: 'Grand Hyatt Manila Grand Ballroom',
        guestCount: 250,
        selectedServices: ['event-styling', 'lights-sound', 'photo-booth'],
        packageId: 'pkg-luxury-wedding',
        notes: 'Requested customized mirrored ceiling floral canopy and wireless DMX uplighting.',
        budgetRange: '₱250,000',
      }),
    });

    const inqData = await inqRes.json();
    assert(inqRes.status === 201, `Customer A inquiry submission returned HTTP 201`);
    assert(inqData.inquiry && inqData.inquiry.id > 0, `Inquiry saved in PostgreSQL with ID #${inqData.inquiry.id}`);
    inquiryAId = inqData.inquiry.id;
    const trackingIdA = inqData.trackingId;

    // -------------------------------------------------------------------------
    // STEP 2: Customer A Portal Reflects Inquiry
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Customer A Dashboard Fetches Portal Data ---');
    const portalResA1 = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const portalDataA1 = await portalResA1.json();
    assert(portalResA1.status === 200, `Customer A portal returned HTTP 200`);
    const foundInqInPortal = portalDataA1.inquiries?.find(i => i.id === inquiryAId);
    assert(Boolean(foundInqInPortal), `Customer A sees submitted Inquiry in Dashboard (ID: ${inquiryAId})`);
    assert(foundInqInPortal.status === 'Pending Review', `Inquiry status is "Pending Review"`);

    // -------------------------------------------------------------------------
    // STEP 3: Customer A Views Inquiry Details
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Customer A Views Inquiry Details ---');
    const inqDetailRes = await fetch(`${API_BASE}/inquiries/${inquiryAId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const inqDetail = await inqDetailRes.json();
    assert(inqDetailRes.status === 200, `Customer A can fetch inquiry details (HTTP 200)`);
    assert(inqDetail.clientName === 'Clarissa Vance', `Inquiry details has customer name: ${inqDetail.clientName}`);
    assert(inqDetail.clientEmail === 'clarissa_quotation@example.com', `Inquiry details has customer email: ${inqDetail.clientEmail}`);
    assert(inqDetail.clientPhone === '0917-888-9999', `Inquiry details has customer phone: ${inqDetail.clientPhone}`);
    assert(inqDetail.eventType === 'Luxury Wedding Reception', `Inquiry details has event type: ${inqDetail.eventType}`);
    assert(inqDetail.eventVenue === 'Grand Hyatt Manila Grand Ballroom', `Inquiry details has event venue: ${inqDetail.eventVenue}`);
    assert(inqDetail.guestsCount === 250, `Inquiry details has guest count: 250`);
    assert(inqDetail.packageId === 'pkg-luxury-wedding', `Inquiry details has packageId: ${inqDetail.packageId}`);
    assert(inqDetail.notes.includes('mirrored ceiling floral canopy'), `Inquiry details has customer custom notes`);

    // -------------------------------------------------------------------------
    // STEP 4: Admin Reviews Customer A's Inquiry
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Admin Reviews Customer A\'s Inquiry ---');
    const adminInqRes = await fetch(`${API_BASE}/inquiries/${inquiryAId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` },
    });
    assert(adminInqRes.status === 200, `Admin successfully opens inquiry #${inquiryAId}`);

    // -------------------------------------------------------------------------
    // STEP 5: Admin Creates & Sends Official Quotation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Admin Creates & Sends Official Quotation ---');
    const quoteRef = `QT-2026-${runId}`;
    const createQuoteRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        quotationRef: quoteRef,
        inquiryId: inquiryAId,
        clientName: 'Clarissa Vance',
        clientEmail: 'clarissa_quotation@example.com',
        clientPhone: '0917-888-9999',
        eventType: 'Luxury Wedding Reception',
        eventDate: targetDate,
        venue: 'Grand Hyatt Manila Grand Ballroom',
        guestCount: 250,
        items: [
          { id: 'item-1', type: 'package', name: 'Grand Luxury Wedding Production', rate: 200000, quantity: 1, amount: 200000 },
          { id: 'item-2', type: 'service', name: 'Wireless DMX Architectural Mood Lighting', rate: 30000, quantity: 1, amount: 30000 },
        ],
        subtotal: 230000,
        discounts: [
          { id: 'disc-1', label: 'Early Booking Promo', type: 'fixed', value: 10000, amount: 10000 }
        ],
        additionalCharges: [
          { id: 'chg-1', label: 'Grand Ballroom Rigging Surcharge', amount: 5000 }
        ],
        grandTotal: 225000,
        requiredDownpayment: 112500,
        validUntil: '2026-11-14',
        validityDays: 14,
        status: 'Quotation Sent',
        notes: 'Includes full technical rehearsal on event morning.',
      }),
    });

    const quoteData = await createQuoteRes.json();
    assert(createQuoteRes.status === 201, `Quotation created and dispatched with HTTP 201`);
    assert(quoteData.id > 0, `Quotation persisted with ID #${quoteData.id}`);
    assert(quoteData.quotationRef === quoteRef, `Quotation reference saved as ${quoteData.quotationRef}`);
    assert(quoteData.inquiryId === inquiryAId, `Quotation properly linked to Inquiry ID #${inquiryAId}`);
    assert(quoteData.userId === customerA.id, `Quotation automatically associated with Customer A (User ID #${customerA.id})`);
    assert(quoteData.status === 'Quotation Sent', `Quotation status is "Quotation Sent"`);
    assert(Number(quoteData.grandTotal) === 225000, `Grand total correctly calculated (₱225,000)`);
    assert(Number(quoteData.requiredDownpayment) === 112500, `50% downpayment correctly calculated (₱112,500)`);

    quotationAId = quoteData.id;

    // Verify linked inquiry status in DB was updated to 'Quotation Sent'
    const updatedInqQuery = await pool.query('SELECT status FROM inquiries WHERE id = $1', [inquiryAId]);
    assert(updatedInqQuery.rows[0].status === 'Quotation Sent', `PostgreSQL inquiry status synchronized to "Quotation Sent"`);

    // -------------------------------------------------------------------------
    // STEP 6: Customer A Portal Refreshes & Shows Quotation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Customer A Portal Shows Newly Created Quotation ---');
    const portalResA2 = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const portalDataA2 = await portalResA2.json();
    assert(portalResA2.status === 200, `Customer A portal re-fetched successfully`);
    const foundQuoteInPortal = portalDataA2.quotations?.find(q => q.id === quotationAId || q.quotationRef === quoteRef);
    assert(Boolean(foundQuoteInPortal), `Customer A Portal immediately displays newly created Quotation #${quoteRef}`);
    assert(foundQuoteInPortal.status === 'Quotation Sent', `Quotation status in portal is "Quotation Sent"`);
    assert(Number(foundQuoteInPortal.grandTotal) === 225000, `Portal shows grand total: ₱225,000`);
    assert(Number(foundQuoteInPortal.requiredDownpayment) === 112500, `Portal shows 50% required downpayment: ₱112,500`);

    // -------------------------------------------------------------------------
    // STEP 7: Customer A Accepts Quotation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Customer A Accepts Quotation ---');
    const acceptRes = await fetch(`${API_BASE}/quotations/${quotationAId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.status === 200, `Customer A accepts quotation (HTTP 200)`);
    assert(acceptData.quotation.status === 'Accepted', `Quotation status in response updated to "Accepted"`);

    // Verify in PostgreSQL
    const checkDbQuote = await pool.query('SELECT status FROM quotations WHERE id = $1', [quotationAId]);
    assert(checkDbQuote.rows[0].status === 'Accepted', `Quotation status in PostgreSQL is "Accepted"`);

    const checkDbInquiry = await pool.query('SELECT status FROM inquiries WHERE id = $1', [inquiryAId]);
    assert(checkDbInquiry.rows[0].status === 'Accepted', `Inquiry status in PostgreSQL is synchronized to "Accepted"`);

    // -------------------------------------------------------------------------
    // STEP 8: Authorization & Data Isolation Checks
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Strict Authorization & Cross-Customer Isolation ---');
    
    // Customer B attempts to view Customer A's inquiry
    const crossInqRes = await fetch(`${API_BASE}/inquiries/${inquiryAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossInqRes.status === 403, `Customer B viewing Customer A's inquiry denied with HTTP 403 Forbidden`);

    // Customer B attempts to accept Customer A's quotation
    const crossAcceptRes = await fetch(`${API_BASE}/quotations/${quotationAId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossAcceptRes.status === 403, `Customer B accepting Customer A's quotation denied with HTTP 403 Forbidden`);

    // Customer B's portal does NOT contain Customer A's inquiry or quotation
    const portalResB = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    const portalDataB = await portalResB.json();
    const leakedInq = portalDataB.inquiries?.find(i => i.id === inquiryAId);
    const leakedQuote = portalDataB.quotations?.find(q => q.id === quotationAId);
    assert(!leakedInq, `Customer B portal does NOT leak Customer A's inquiry`);
    assert(!leakedQuote, `Customer B portal does NOT leak Customer A's quotation`);

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning up test records ---');
    await pool.query('DELETE FROM quotations WHERE id = $1', [quotationAId]);
    await pool.query('DELETE FROM inquiries WHERE id = $1', [inquiryAId]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', ['clarissa_quotation@example.com', 'derek_quotation@example.com']);
    console.log('Cleanup completed.\n');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('================================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================================');
}

runQuotationWorkflowTests().catch(console.error);
