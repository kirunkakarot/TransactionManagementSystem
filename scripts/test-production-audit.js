const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const adminToken = jwt.sign({ id: 1, email: 'admin@jadevents.com', role: 'Administrator', name: 'Admin Director' }, JWT_SECRET, { expiresIn: '1d' });
const customerTokenA = jwt.sign({ id: 4, email: 'clientcustomer@gmail.com', role: 'Customer', name: 'Client Customer' }, JWT_SECRET, { expiresIn: '1d' });
const customerTokenB = jwt.sign({ id: 5, email: 'john@gmail.com', role: 'Customer', name: 'John Doe' }, JWT_SECRET, { expiresIn: '1d' });

async function runProductionAudit() {
  console.log('======================================================================');
  console.log('🛡️  JAD EVENTS: SECOND-STAGE PRODUCTION AUDIT (10 ADVANCED CHECKS)');
  console.log('======================================================================\n');

  let testsPassed = 0;
  let testsTotal = 10;

  const runId = Math.floor(1000 + Math.random() * 9000);
  const testDate = `2027-05-${(runId % 25 + 1).toString().padStart(2, '0')}`;
  const raceDate = `2027-06-${(runId % 25 + 1).toString().padStart(2, '0')}`;

  try {
    // -----------------------------------------------------------------------
    // AUDIT 1: Customer Unauthorized Admin API Access
    // -----------------------------------------------------------------------
    console.log('--- [AUDIT 1] Testing Customer Admin API Access Controls ---');
    const unauthorizedCalls = await Promise.all([
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
        body: JSON.stringify({ clientName: 'Hacker', clientEmail: 'clientcustomer@gmail.com', eventTitle: 'Hacked', eventType: 'Hack', eventDate: testDate, venue: 'Secret Venue', guestCount: 10 }),
      }),
      fetch(`${API_BASE}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
        body: JSON.stringify({ clientName: 'Hacker', clientEmail: 'clientcustomer@gmail.com', eventType: 'Hack', eventDate: testDate, venue: 'Secret Venue', guestCount: 10, items: [], subtotal: 100, grandTotal: 100 }),
      }),
      fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
        body: JSON.stringify({ name: 'Fake Staff', role: 'Crew', phone: '0900-000-0000', email: 'fake@jadevents.ph' }),
      }),
      fetch(`${API_BASE}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
        body: JSON.stringify({ name: 'Fake Light', category: 'Lighting', quantity: 10 }),
      }),
    ]);

    const allBlocked = unauthorizedCalls.every(r => r.status === 403);
    if (!allBlocked) {
      throw new Error(`Customer bypassed admin checks! Statuses: ${unauthorizedCalls.map(r => r.status).join(', ')}`);
    }
    console.log('✅ PASS: All 4 admin mutation endpoints strictly returned 403 Forbidden to Customer token.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 2: Payment Verification Authorization
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 2] Testing Payment Verification Authorization ---');
    // First create a quotation and booking
    const qRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Client Customer',
        clientEmail: 'clientcustomer@gmail.com',
        eventType: 'Corporate Year-End Gala',
        eventDate: testDate,
        venue: `BGC Arts Center Gala Hall ${runId}`,
        guestCount: 200,
        items: [{ id: 'item-1', name: 'Event Directing & Production', rate: 40000, quantity: 1, amount: 40000 }],
        subtotal: 40000,
        grandTotal: 40000,
        requiredDownpayment: 20000,
        validUntil: '2026-11-30',
      }),
    });
    const quoteData = await qRes.json();

    const bRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        quotationId: quoteData.id,
        clientName: 'Client Customer',
        clientEmail: 'clientcustomer@gmail.com',
        clientPhone: '0918-123-4567',
        eventTitle: `Corporate Year-End Gala ${runId}`,
        eventType: 'Corporate Gala',
        eventDate: testDate,
        startTime: '18:00',
        endTime: '23:00',
        venue: `BGC Arts Center Gala Hall ${runId}`,
        guestCount: 200,
        totalAmount: 40000,
        status: 'Tentative',
        assignedStaff: [{ id: 'st-1', role: 'Lead Director' }],
        assignedEquipment: [{ resourceId: 'eq-1', quantity: 1 }],
      }),
    });
    const bookingData = await bRes.json();
    if (!bRes.ok) throw new Error(`Booking creation failed: ${JSON.stringify(bookingData)}`);

    // Customer creates unverified payment
    const payRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingData.id,
        type: 'Downpayment (50%)',
        amount: 20000,
        method: 'GCash QR',
        referenceNumber: `GCASH-AUDIT-${runId}`,
      }),
    });
    const paymentData = await payRes.json();
    console.log('Customer created payment verified state:', paymentData.verified); // Should be false!

    // Customer attempts to self-verify payment
    const custVerifyRes = await fetch(`${API_BASE}/payments/${paymentData.id}/verify`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    console.log('Customer self-verify status:', custVerifyRes.status);
    if (custVerifyRes.status !== 403) throw new Error('Customer was able to verify payment!');

    // Admin verifies payment
    const adminVerifyRes = await fetch(`${API_BASE}/payments/${paymentData.id}/verify`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    console.log('Admin verify status:', adminVerifyRes.status);
    if (!adminVerifyRes.ok) throw new Error('Admin could not verify payment!');
    console.log('✅ PASS: Customer verification blocked (403), Admin verification successful (200).');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 3: Booking Editing Re-Runs Conflict Detection (Venue Collision)
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 3] Testing Booking Edit Conflict Detection (Venue Collision) ---');
    // Create another booking at Makati Shangri-La
    const b2Res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'John Doe',
        clientEmail: 'john@gmail.com',
        clientPhone: '0919-888-7777',
        eventTitle: `John Executive Banquet ${runId}`,
        eventType: 'Corporate Dinner',
        eventDate: testDate,
        startTime: '17:00',
        endTime: '22:00',
        venue: `Makati Shangri-La Ballroom ${runId}`,
        guestCount: 100,
        totalAmount: 30000,
        status: 'Confirmed',
      }),
    });
    const booking2 = await b2Res.json();
    if (!b2Res.ok) throw new Error(`Booking 2 creation failed: ${JSON.stringify(booking2)}`);

    // Now try to EDIT Client Customer's booking to move venue to Makati Shangri-La on the same date/time
    const editVenueRes = await fetch(`${API_BASE}/bookings/${bookingData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        venue: `Makati Shangri-La Ballroom ${runId}`, // Collision with John!
      }),
    });
    const editVenueData = await editVenueRes.json();
    console.log('Edit Venue collision status:', editVenueRes.status, '| Message:', editVenueData.message);
    if ((editVenueRes.status !== 400 && editVenueRes.status !== 409) || !editVenueData.message.includes('Venue collision')) {
      throw new Error('Booking edit did not detect venue collision!');
    }
    console.log('✅ PASS: Booking edit successfully blocked due to venue collision.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 4: Staff Reassignment Conflict on Booking Edit
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 4] Testing Staff Reassignment Conflict on Edit ---');
    // Assign staff st-2 (Ramil) to John
    await fetch(`${API_BASE}/bookings/${booking2.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        assignedStaff: [{ id: 'st-2', role: 'Sound Engineer' }],
      }),
    });

    // Now try to assign st-2 to Client Customer's booking on the same date/time
    const editStaffRes = await fetch(`${API_BASE}/bookings/${bookingData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        assignedStaff: [
          { id: 'st-1', role: 'Lead Director' },
          { id: 'st-2', role: 'Sound Engineer' }, // Conflict!
        ],
      }),
    });
    const editStaffData = await editStaffRes.json();
    console.log('Edit Staff conflict status:', editStaffRes.status, '| Message:', editStaffData.message);
    if ((editStaffRes.status !== 400 && editStaffRes.status !== 409) || !editStaffData.message.includes('Staff member')) {
      throw new Error('Booking edit did not detect staff double-booking!');
    }
    console.log('✅ PASS: Booking edit successfully blocked due to staff double-booking.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 5: Equipment Quantity Modification Check on Edit
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 5] Testing Equipment Quantity Modification on Edit ---');
    // Try to update Client Customer's booking to request 10 LED walls (only 2 in stock!)
    const editEqRes = await fetch(`${API_BASE}/bookings/${bookingData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        assignedEquipment: [
          { resourceId: 'eq-1', quantity: 10 }, // Stock is only 2
        ],
      }),
    });
    const editEqData = await editEqRes.json();
    console.log('Edit Equipment depletion status:', editEqRes.status, '| Message:', editEqData.message);
    if ((editEqRes.status !== 400 && editEqRes.status !== 409) || !editEqData.message.includes('Insufficient inventory')) {
      throw new Error('Booking edit did not detect equipment depletion!');
    }
    console.log('✅ PASS: Equipment quantity increase beyond stock rejected.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 6: Historical Price Snapshot Preservation
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 6] Testing Historical Price Snapshot Preservation ---');
    // Fetch a service, note its price, update its catalog price to ₱99,999
    const sRes = await fetch(`${API_BASE}/services?limit=1`);
    const sData = await sRes.json();
    const targetService = sData.services[0];
    const originalPrice = targetService.price;

    await fetch(`${API_BASE}/services/${targetService.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        price: 99999,
      }),
    });

    // Check Client Customer's quotation & booking: grandTotal & totalAmount MUST remain unchanged!
    const qCheck = await (await fetch(`${API_BASE}/quotations/${quoteData.id}`, { headers: { 'Authorization': `Bearer ${adminToken}` } })).json();
    const bCheck = await (await fetch(`${API_BASE}/bookings/${bookingData.id}`, { headers: { 'Authorization': `Bearer ${adminToken}` } })).json();

    console.log('Quotation grandTotal:', qCheck.grandTotal, '| Booking totalAmount:', bCheck.totalAmount);
    if (Number(qCheck.grandTotal) !== 40000 || Number(bCheck.totalAmount) !== 40000) {
      throw new Error('Historical price changed when service catalog price was altered!');
    }

    // Restore service price
    await fetch(`${API_BASE}/services/${targetService.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ price: originalPrice }),
    });
    console.log('✅ PASS: Quotations and Bookings preserved their historical snapshot amounts.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 7: Cancel Booking Then Reuse Resource & Staff
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 7] Testing Resource & Staff Release on Cancellation ---');
    // Cancel Client Customer's booking
    const cancelRes = await fetch(`${API_BASE}/bookings/${bookingData.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Audit Cancellation test' }),
    });
    console.log('Client Customer booking cancel status:', cancelRes.status);

    // Now John requests st-1 (Marco) and eq-1 (P3 LED wall) on testDate
    const carlosUpdateRes = await fetch(`${API_BASE}/bookings/${booking2.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        assignedStaff: [{ id: 'st-1', role: 'Lead Director' }],
        assignedEquipment: [{ resourceId: 'eq-1', quantity: 1 }],
      }),
    });
    console.log('John reallocated st-1 & eq-1 status:', carlosUpdateRes.status);
    if (!carlosUpdateRes.ok) {
      const err = await carlosUpdateRes.json();
      throw new Error(`Cancelled booking did not release staff/equipment: ${err.message}`);
    }
    console.log('✅ PASS: Cancelled booking released staff and equipment, allowing successful reallocation.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 8: Duplicate Deposit Payment Prevention
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 8] Testing Duplicate Payment Settlement Prevention ---');
    // Try to settle deposit again on quoteData (which already had verified deposit settled)
    const dupDepositRes = await fetch(`${API_BASE}/quotations/${quoteData.id}/pay-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({ method: 'GCash QR' }),
    });
    const dupDepositData = await dupDepositRes.json();
    console.log('Duplicate deposit attempt status:', dupDepositRes.status, '| Message:', dupDepositData.message);
    if ((dupDepositRes.status !== 400 && dupDepositRes.status !== 409) || !dupDepositData.message.includes('already been settled')) {
      throw new Error('Duplicate deposit payment was not blocked!');
    }
    console.log('✅ PASS: Duplicate reservation deposit payment was properly rejected.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 9: Invalid/Cancelled Quotation to Booking Attempt
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 9] Testing Invalid Quotation -> Booking Attempt ---');
    // Create a quotation and cancel it
    const q3Res = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Invalid Client',
        clientEmail: 'invalid@example.com',
        eventType: 'Wedding',
        eventDate: testDate,
        venue: `Palazzo ${runId}`,
        guestCount: 50,
        items: [],
        subtotal: 10000,
        grandTotal: 10000,
        status: 'Cancelled', // Cancelled quote
      }),
    });
    const q3Data = await q3Res.json();

    const badBookingRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        quotationId: q3Data.id,
        clientName: 'Invalid Client',
        clientEmail: 'invalid@example.com',
        clientPhone: '0900-000-0000',
        eventTitle: 'Invalid Event',
        eventType: 'Wedding',
        eventDate: testDate,
        venue: `Palazzo ${runId}`,
        guestCount: 50,
        totalAmount: 10000,
      }),
    });
    const badBookingData = await badBookingRes.json();
    console.log('Booking with cancelled quotation status:', badBookingRes.status, '| Message:', badBookingData.message);
    if (badBookingRes.status !== 500 && badBookingRes.status !== 400 && badBookingRes.status !== 409) {
      throw new Error('Booking creation from cancelled quotation was not rejected!');
    }
    console.log('✅ PASS: Booking creation referencing a cancelled quotation was successfully blocked.');
    testsPassed++;

    // -----------------------------------------------------------------------
    // AUDIT 10: Concurrent Booking Requests (Check-Then-Insert Race Condition)
    // -----------------------------------------------------------------------
    console.log('\n--- [AUDIT 10] Testing Concurrent Booking Race Condition ---');
    const targetVenue = `Solaire Resort, Grand Ballroom ${runId}`;

    // Dispatch two simultaneous booking creation requests for the exact same venue & date
    const [resA, resB] = await Promise.all([
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          clientName: 'Client Alpha',
          clientEmail: 'alpha@example.com',
          clientPhone: '0911-111-1111',
          eventTitle: 'Alpha Christmas Gala',
          eventType: 'Holiday Party',
          eventDate: raceDate,
          startTime: '18:00',
          endTime: '23:00',
          venue: targetVenue,
          guestCount: 250,
          totalAmount: 60000,
          status: 'Confirmed',
        }),
      }),
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          clientName: 'Client Beta',
          clientEmail: 'beta@example.com',
          clientPhone: '0922-222-2222',
          eventTitle: 'Beta Holiday Extravaganza',
          eventType: 'Holiday Party',
          eventDate: raceDate,
          startTime: '18:00',
          endTime: '23:00',
          venue: targetVenue,
          guestCount: 300,
          totalAmount: 75000,
          status: 'Confirmed',
        }),
      }),
    ]);

    const statusA = resA.status;
    const statusB = resB.status;
    console.log(`Concurrent Request A Status: ${statusA} | Request B Status: ${statusB}`);

    const oneSucceededOneFailed = (statusA === 201 && (statusB === 409 || statusB === 400 || statusB === 500)) || (statusB === 201 && (statusA === 409 || statusA === 400 || statusA === 500));
    if (!oneSucceededOneFailed) {
      throw new Error(`Race condition failed! Both requests finished with statuses: A=${statusA}, B=${statusB}`);
    }
    console.log('✅ PASS: Exactly one booking succeeded and the colliding request was blocked by server conflict engine.');
    testsPassed++;

    console.log('\n======================================================================');
    console.log(`🎉 AUDIT COMPLETE: ${testsPassed} / ${testsTotal} ADVANCED AUDIT CHECKS PASSED!`);
    console.log('======================================================================');
  } catch (error) {
    console.error('❌ Audit Failed:', error);
    process.exit(1);
  }
}

runProductionAudit();
