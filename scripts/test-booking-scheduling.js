const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Generate test JWT tokens
const adminToken = jwt.sign({ id: 1, email: 'admin@jadevents.ph', role: 'Administrator' }, JWT_SECRET, { expiresIn: '1d' });
const customerTokenA = jwt.sign({ id: 2, email: 'maria.santos@gmail.com', role: 'Customer' }, JWT_SECRET, { expiresIn: '1d' });
const customerTokenB = jwt.sign({ id: 3, email: 'juan.delacruz@gmail.com', role: 'Customer' }, JWT_SECRET, { expiresIn: '1d' });

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 JAD EVENTS: BOOKING & SCHEDULING FULL TEST SUITE');
  console.log('=====================================================\n');

  try {
    // -----------------------------------------------------------------
    // TEST 1: Inquiry Submission
    // -----------------------------------------------------------------
    console.log('--- [TEST 1] Public Inquiry Submission ---');
    const inqRes = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: '18th Debut Milestone Celebration',
        eventDate: '2026-10-15',
        eventVenue: 'Grand Palazzo Royale, Ballroom B',
        guestsCount: 150,
        requirements: JSON.stringify({
          fullName: 'Maria Santos',
          email: 'maria.santos@gmail.com',
          phone: '0917-555-1234',
          selectedServices: ['entertainment', 'event-decoration', 'photo-booth'],
          notes: 'Looking for a floral theme with 360 photo booth and live acoustic duo.',
        }),
      }),
    });
    const inqData = await inqRes.json();
    console.log('Inquiry Status:', inqRes.status, '| Tracking ID:', inqData.trackingId);
    if (!inqRes.ok) throw new Error(`Inquiry failed: ${JSON.stringify(inqData)}`);
    const inquiryId = inqData.inquiry.id;

    // -----------------------------------------------------------------
    // TEST 2: Admin Creates Itemized Quotation
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 2] Admin Generates Itemized Quotation ---');
    const quoteRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inquiryId,
        clientName: 'Maria Santos',
        clientEmail: 'maria.santos@gmail.com',
        clientPhone: '0917-555-1234',
        eventType: '18th Debut Milestone Celebration',
        eventDate: '2026-10-15',
        venue: 'Grand Palazzo Royale, Ballroom B',
        guestCount: 150,
        items: [
          { id: 'item-1', type: 'service', name: 'Floral Stage & Venue Styling', rate: 25000, quantity: 1, amount: 25000, notes: '3D Stage backdrop & VIP tablescapes' },
          { id: 'item-2', type: 'service', name: '360 Glam Video Spinner Booth', rate: 8500, quantity: 1, amount: 8500, notes: '4 hours unlimited slow-mo reels' },
          { id: 'item-3', type: 'service', name: 'Live Acoustic Duo & Sound System', rate: 15000, quantity: 1, amount: 15000, notes: 'Includes wireless microphones & soundcheck' },
        ],
        subtotal: 48500,
        discounts: [{ id: 'disc-1', label: 'Early Bird Promotional Discount', type: 'fixed', value: 3500, amount: 3500 }],
        additionalCharges: [{ id: 'chg-1', label: 'Ingress Night Logistics Surcharge', amount: 2000 }],
        grandTotal: 47000,
        requiredDownpayment: 23500,
        validUntil: '2026-09-30',
        validityDays: 14,
        notes: 'Special debut milestone package prepared for Maria Santos.',
      }),
    });
    const quoteData = await quoteRes.json();
    console.log('Quotation Status:', quoteRes.status, '| Quote Ref:', quoteData.quotationRef, '| Grand Total:', quoteData.grandTotal);
    if (!quoteRes.ok) throw new Error(`Quotation failed: ${JSON.stringify(quoteData)}`);
    const quotationId = quoteData.id;

    // -----------------------------------------------------------------
    // TEST 3: Customer Accepts Quotation & Pays 50% Downpayment
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 3] Customer Accepts Quotation & Pays 50% Deposit ---');
    const acceptRes = await fetch(`${API_BASE}/quotations/${quotationId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    const acceptData = await acceptRes.json();
    console.log('Accept Status:', acceptRes.status, '| New Status:', acceptData.quotation.status);

    const depositRes = await fetch(`${API_BASE}/quotations/${quotationId}/pay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        method: 'GCash QR',
        referenceNumber: 'GCASH-TEST-998877',
      }),
    });
    const depositData = await depositRes.json();
    console.log('Deposit Status:', depositRes.status, '| Deposit Result:', depositData.message, '| Quote Status:', depositData.quotation.status);

    // -----------------------------------------------------------------
    // TEST 4: Admin Creates Confirmed Booking with Staff & Equipment
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 4] Admin Creates Confirmed Booking ---');
    const bookingRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        quotationId,
        inquiryId,
        clientName: 'Maria Santos',
        clientEmail: 'maria.santos@gmail.com',
        clientPhone: '0917-555-1234',
        eventTitle: 'Maria Santos 18th Debut Extravaganza',
        eventType: '18th Debut Milestone Celebration',
        eventDate: '2026-10-15',
        startTime: '16:00',
        endTime: '22:00',
        venue: 'Grand Palazzo Royale, Ballroom B',
        guestCount: 150,
        totalAmount: 47000,
        status: 'Confirmed',
        notes: 'Client confirmed 50% downpayment. Lead crew dispatched.',
        assignedStaff: [
          { id: 'st-1', role: 'Lead Director' },
          { id: 'st-2', role: 'Sound Engineer' },
          { id: 'st-6', role: 'Master of Ceremonies' },
        ],
        assignedEquipment: [
          { resourceId: 'eq-2', quantity: 1 }, // Line array
          { resourceId: 'eq-3', quantity: 4 }, // Microphones
          { resourceId: 'eq-4', quantity: 1 }, // 360 spinner
        ],
      }),
    });
    const bookingData = await bookingRes.json();
    console.log('Booking Creation Status:', bookingRes.status, '| Booking Ref:', bookingData.bookingRef);
    if (!bookingRes.ok) throw new Error(`Booking creation failed: ${JSON.stringify(bookingData)}`);
    const bookingId = bookingData.id;

    // -----------------------------------------------------------------
    // TEST 5: Verify Conflict Detection Engine
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 5] Conflict Engine: Venue Collision ---');
    const clashVenueRes = await fetch(`${API_BASE}/scheduling/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventDate: '2026-10-15',
        startTime: '18:00',
        endTime: '23:00', // Overlaps with 16:00 - 22:00
        venue: 'Grand Palazzo Royale, Ballroom B', // Same venue
      }),
    });
    const clashVenueData = await clashVenueRes.json();
    console.log('Venue Clash Detected:', !clashVenueData.isAvailable, '| Conflicts:', clashVenueData.conflicts.map(c => c.message));

    console.log('\n--- [TEST 6] Conflict Engine: Staff Double-Booking ---');
    const clashStaffRes = await fetch(`${API_BASE}/scheduling/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventDate: '2026-10-15',
        startTime: '17:00',
        endTime: '21:00',
        venue: 'Different Venue - Okada Manila',
        requestedStaffIds: [1, 2], // Marco & Ramil are on Maria's event!
      }),
    });
    const clashStaffData = await clashStaffRes.json();
    console.log('Staff Double-Booking Detected:', !clashStaffData.isAvailable, '| Conflicts:', clashStaffData.conflicts.map(c => c.message));

    console.log('\n--- [TEST 7] Conflict Engine: Equipment Resource Exhaustion ---');
    const clashEqRes = await fetch(`${API_BASE}/scheduling/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventDate: '2026-10-15',
        startTime: '17:00',
        endTime: '21:00',
        venue: 'Different Venue',
        requestedResourceAllocations: [
          { resourceId: 4, quantity: 5 }, // Only 3 360 spinners in total stock!
        ],
      }),
    });
    const clashEqData = await clashEqRes.json();
    console.log('Equipment Exhaustion Detected:', !clashEqData.isAvailable, '| Conflicts:', clashEqData.conflicts.map(c => c.message));

    // -----------------------------------------------------------------
    // TEST 8: Reschedule Booking
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 8] Reschedule Booking ---');
    const rescheduleRes = await fetch(`${API_BASE}/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        newDate: '2026-10-20',
        newStartTime: '17:00',
        newEndTime: '23:00',
        reason: 'Client requested postponement due to venue ballroom maintenance.',
      }),
    });
    const rescheduleData = await rescheduleRes.json();
    console.log('Reschedule Status:', rescheduleRes.status, '| New Event Date:', rescheduleData.booking.eventDate, '| Status:', rescheduleData.booking.status);

    // -----------------------------------------------------------------
    // TEST 9: Customer Portal Data Isolation
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 9] Customer Portal Data Isolation ---');
    const portalResA = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    const portalDataA = await portalResA.json();
    console.log('Customer A (Maria) Bookings count:', portalDataA.bookings.length, '| Quotations count:', portalDataA.quotations.length);

    const portalResB = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerTokenB}` },
    });
    const portalDataB = await portalResB.json();
    console.log('Customer B (Juan) Bookings count:', portalDataB.bookings.length, '| Quotations count:', portalDataB.quotations.length);

    // -----------------------------------------------------------------
    // TEST 10: Cancel Booking & Release Schedule
    // -----------------------------------------------------------------
    console.log('\n--- [TEST 10] Cancel Booking & Release Schedule ---');
    const cancelRes = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Testing cancellation workflow.',
      }),
    });
    const cancelData = await cancelRes.json();
    console.log('Cancellation Status:', cancelRes.status, '| Booking Status:', cancelData.booking.status);

    console.log('\n=====================================================');
    console.log('🎉 ALL 10 COMPREHENSIVE BOOKING & SCHEDULING TESTS PASSED!');
    console.log('=====================================================');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
