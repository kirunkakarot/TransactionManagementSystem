const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/jad_events_db',
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-jad-events-production-2026';
const BASE_URL = 'http://localhost:3000';

async function testQuotationEditResend() {
  console.log('🧪 Testing Quotation Edit & Resend Synchronization to Customer Portal...\n');

  try {
    const timestamp = Date.now();
    const customerEmail = `customer.editquote.${timestamp}@example.com`;
    const adminEmail = `admin.editquote.${timestamp}@jadevents.ph`;

    const custRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [customerEmail, 'Editing Test Customer', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Customer']
    );
    const customerUser = custRes.rows[0];

    const adminUserRes = await pool.query(
      "INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [adminEmail, 'Director Admin', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Administrator']
    );
    const adminUser = adminUserRes.rows[0];

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

    // 1. Customer submits inquiry
    console.log('1. Customer submitting inquiry...');
    const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Editing Test Customer',
        email: customerEmail,
        phone: '09171234567',
        eventType: 'Corporate Gala',
        eventDate: '2026-11-20',
        venue: 'Grand Ballroom Manila',
        guestCount: 200,
        notes: 'Initial inquiry specifications',
      }),
    });
    const inqJson = await inqRes.json();
    const inqData = inqJson.inquiry || inqJson;
    console.log(`   ✅ Inquiry created: ID #${inqData.id} (${inqData.trackingId})`);

    // 2. Admin creates quotation v1 (₱100,000)
    console.log('\n2. Admin creating initial quotation (₱100,000)...');
    const quoteV1Res = await fetch(`${BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId: inqData.id,
        clientName: 'Editing Test Customer',
        clientEmail: customerEmail,
        eventType: 'Corporate Gala',
        eventDate: '2026-11-20',
        venue: 'Grand Ballroom Manila',
        guestCount: 200,
        items: [
          { id: '1', type: 'service', name: 'Basic Sound & Lights', rate: 100000, quantity: 1, amount: 100000 }
        ],
        subtotal: 100000,
        grandTotal: 100000,
        requiredDownpayment: 50000,
        status: 'Quotation Sent',
      }),
    });
    const quoteV1 = await quoteV1Res.json();
    console.log(`   ✅ Quotation v1 created: Ref #${quoteV1.quotationRef || quoteV1.id}, Grand Total = ₱${quoteV1.grandTotal}`);

    // 3. Customer checks portal and sees v1
    console.log('\n3. Customer checking portal for Quotation v1...');
    const custPortalV1Res = await fetch(`${BASE_URL}/api/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const custPortalV1 = await custPortalV1Res.json();
    const custQuoteV1 = custPortalV1.quotations[0];
    if (!custQuoteV1 || Number(custQuoteV1.grandTotal) !== 100000) {
      throw new Error(`Customer failed to see v1 quotation: ${JSON.stringify(custQuoteV1)}`);
    }
    console.log(`   ✅ Customer sees v1 Grand Total = ₱${custQuoteV1.grandTotal}, Downpayment = ₱${custQuoteV1.requiredDownpayment}`);

    // 4. Admin edits quotation to v2 (₱145,000 with LED Wall addition)
    console.log('\n4. Admin editing and resending revised quotation v2 (₱145,000)...');
    const quoteV2Res = await fetch(`${BASE_URL}/api/quotations/${quoteV1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        quotationRef: quoteV1.quotationRef,
        inquiryId: inqData.id,
        clientName: 'Editing Test Customer',
        clientEmail: customerEmail,
        eventType: 'Corporate Gala',
        eventDate: '2026-11-20',
        venue: 'Grand Ballroom Manila',
        guestCount: 200,
        items: [
          { id: '1', type: 'service', name: 'Basic Sound & Lights', rate: 100000, quantity: 1, amount: 100000 },
          { id: '2', type: 'service', name: 'Curved LED Video Wall 6x3m', rate: 45000, quantity: 1, amount: 45000 }
        ],
        subtotal: 145000,
        grandTotal: 145000,
        requiredDownpayment: 72500,
        status: 'Quotation Sent',
        notes: 'Revised with Curved LED Video Wall addition',
      }),
    });
    const quoteV2 = await quoteV2Res.json();
    console.log(`   ✅ Quotation v2 updated: Ref #${quoteV2.quotationRef || quoteV2.id}, Grand Total = ₱${quoteV2.grandTotal}, Items count = ${quoteV2.items.length}`);

    // 5. Customer refreshes portal and verifies updated v2 quotation
    console.log('\n5. Customer checking portal for UPDATED Quotation v2...');
    const custPortalV2Res = await fetch(`${BASE_URL}/api/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const custPortalV2 = await custPortalV2Res.json();
    const custQuoteV2 = custPortalV2.quotations[0];
    
    if (!custQuoteV2) {
      throw new Error('Customer has no quotation in portal after edit!');
    }
    if (Number(custQuoteV2.grandTotal) !== 145000) {
      throw new Error(`Expected grandTotal ₱145000, but customer received ₱${custQuoteV2.grandTotal}`);
    }
    if (Number(custQuoteV2.requiredDownpayment) !== 72500) {
      throw new Error(`Expected requiredDownpayment ₱72500, but customer received ₱${custQuoteV2.requiredDownpayment}`);
    }
    if (custQuoteV2.items.length !== 2) {
      throw new Error(`Expected 2 items in customer quote, but found ${custQuoteV2.items.length}`);
    }
    console.log(`   ✅ Customer successfully received updated quotation!`);
    console.log(`      - Revised Grand Total: ₱${custQuoteV2.grandTotal}`);
    console.log(`      - Revised 50% Required Downpayment: ₱${custQuoteV2.requiredDownpayment}`);
    console.log(`      - Line Items Count: ${custQuoteV2.items.length} items (${custQuoteV2.items.map(i => i.name).join(', ')})`);

    // 6. Customer accepts the newly updated quotation
    console.log('\n6. Customer accepting the revised quotation...');
    const acceptRes = await fetch(`${BASE_URL}/api/quotations/${custQuoteV2.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    const acceptData = await acceptRes.json();
    console.log(`   ✅ Quotation accepted with status: "${acceptData.quotation?.status}"`);

    console.log('\n🎉 ALL EDIT & RESEND SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!');

    // Cleanup
    await pool.query('DELETE FROM quotations WHERE id = $1', [quoteV1.id]);
    await pool.query('DELETE FROM inquiries WHERE id = $1', [inqData.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [customerUser.id, adminUser.id]);
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testQuotationEditResend();
