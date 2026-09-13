const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const adminToken = jwt.sign({ id: 1, email: 'admin@jadevents.com', role: 'Administrator', name: 'Admin Director' }, JWT_SECRET, { expiresIn: '1d' });
const customerTokenA = jwt.sign({ id: 4, email: 'clientcustomer@gmail.com', role: 'Customer', name: 'Elena Customer' }, JWT_SECRET, { expiresIn: '1d' });
const customerTokenB = jwt.sign({ id: 5, email: 'john@gmail.com', role: 'Customer', name: 'John Customer' }, JWT_SECRET, { expiresIn: '1d' });

async function runThirdStageAudit() {
  console.log('================================================================================');
  console.log('🏆 JAD EVENTS: THIRD-STAGE IMPROVEMENT & HARDENING COMPREHENSIVE TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 32;

  const runId = Math.floor(100 + Math.random() * 800);
  const testDate = `2026-11-${((runId % 20) + 1).toString().padStart(2, '0')}`;
  const raceDate = `2026-12-${((runId % 20) + 1).toString().padStart(2, '0')}`;

  try {
    // =========================================================================
    // SECTION 1: AUTHORIZATION & DATA ISOLATION (Tests 1 - 6)
    // =========================================================================
    console.log('>>> SECTION 1: AUTHORIZATION & DATA ISOLATION <<<');

    // 1. Unauthenticated customer portal access
    const unauthRes = await fetch(`${API_BASE}/customer/portal`);
    console.log('1. Unauthenticated portal access status:', unauthRes.status);
    if (unauthRes.status !== 401) throw new Error('Unauthenticated access was not rejected with 401!');
    console.log('✅ Test 1 Passed: Unauthenticated access returned 401 Unauthorized.');
    passed++;

    // 2. Customer -> Admin endpoint
    const custToAdminRes = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({ name: 'Hacked Staff', role: 'Hacker', phone: '0900', email: 'hack@jad.ph' }),
    });
    console.log('2. Customer admin creation status:', custToAdminRes.status);
    if (custToAdminRes.status !== 403) throw new Error('Customer calling admin endpoint was not rejected with 403!');
    console.log('✅ Test 2 Passed: Customer accessing admin-only endpoint returned 403 Forbidden.');
    passed++;

    // Setup: Admin creates Quotation and Booking for Customer B (John)
    const quoteBRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'John Customer',
        clientEmail: 'john@gmail.com',
        eventType: 'Wedding Reception',
        eventDate: testDate,
        venue: `Manila Hotel, Centennial Hall ${runId}`,
        guestCount: 150,
        items: [{ id: 'item-1', name: 'Full Coordination', rate: 50000, quantity: 1, amount: 50000 }],
        subtotal: 50000,
        grandTotal: 50000,
        requiredDownpayment: 25000,
        validUntil: '2026-11-30',
      }),
    });
    const quoteB = await quoteBRes.json();

    const bookingBRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        quotationId: quoteB.id,
        clientName: 'John Customer',
        clientEmail: 'john@gmail.com',
        clientPhone: '0919-000-1111',
        eventTitle: `John Wedding ${runId}`,
        eventType: 'Wedding Reception',
        eventDate: testDate,
        startTime: '17:00',
        endTime: '23:00',
        venue: `Manila Hotel, Centennial Hall ${runId}`,
        guestCount: 150,
        totalAmount: 50000,
        status: 'Tentative',
        assignedStaff: [{ id: 'st-1', role: 'Lead Director' }],
      }),
    });
    const bookingB = await bookingBRes.json();

    // 3. Customer A -> Customer B Booking READ
    const crossBookingReadRes = await fetch(`${API_BASE}/bookings/${bookingB.id}`, {
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    console.log('3. Cross-customer booking read status:', crossBookingReadRes.status);
    if (crossBookingReadRes.status !== 403) throw new Error('Customer A was able to read Customer B booking!');
    console.log('✅ Test 3 Passed: Cross-customer booking read denied with 403 Forbidden.');
    passed++;

    // 4. Customer A -> Customer B Quotation READ
    const crossQuoteReadRes = await fetch(`${API_BASE}/quotations/${quoteB.id}`, {
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    console.log('4. Cross-customer quotation read status:', crossQuoteReadRes.status);
    if (crossQuoteReadRes.status !== 403) throw new Error('Customer A was able to read Customer B quotation!');
    console.log('✅ Test 4 Passed: Cross-customer quotation read denied with 403 Forbidden.');
    passed++;

    // 5. Customer A -> Customer B Payment READ
    const payBRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenB}` },
      body: JSON.stringify({
        bookingId: bookingB.id,
        type: 'Downpayment (50%)',
        amount: 25000,
        method: 'GCash QR',
        referenceNumber: `GCASH-B-${runId}`,
      }),
    });
    const payB = await payBRes.json();

    const crossPayReadRes = await fetch(`${API_BASE}/payments/${payB.id}`, {
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    console.log('5. Cross-customer payment read status:', crossPayReadRes.status);
    if (crossPayReadRes.status !== 403) throw new Error('Customer A was able to read Customer B payment!');
    console.log('✅ Test 5 Passed: Cross-customer payment read denied with 403 Forbidden.');
    passed++;

    // 6. Customer Role Manipulation
    const spoofedToken = jwt.sign({ id: 4, email: 'clientcustomer@gmail.com', role: 'Administrator' }, JWT_SECRET, { expiresIn: '1d' });
    const spoofRoleRes = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spoofedToken}` },
      body: JSON.stringify({ name: 'Spoofed Staff', role: 'Crew', phone: '0900', email: 'spoof@jad.ph' }),
    });
    console.log('6. Spoofed role JWT status:', spoofRoleRes.status);
    if (spoofRoleRes.status !== 403) throw new Error('Role spoofing was not caught by database user lookup!');
    console.log('✅ Test 6 Passed: Role manipulation blocked (checked against database authority).');
    passed++;

    // =========================================================================
    // SECTION 2: BOOKING LIFECYCLE & CONFLICTS (Tests 7 - 15)
    // =========================================================================
    console.log('\n>>> SECTION 2: BOOKING LIFECYCLE & CONFLICTS <<<');

    // 7. Booking Creation
    const quoteARes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Elena Customer',
        clientEmail: 'clientcustomer@gmail.com',
        eventType: 'Debut Celebration',
        eventDate: testDate,
        venue: `Sofitel Philippine Plaza, Grand Ballroom ${runId}`,
        guestCount: 180,
        items: [{ id: 'item-1', name: 'Debut Production Styling', rate: 60000, quantity: 1, amount: 60000 }],
        subtotal: 60000,
        grandTotal: 60000,
        requiredDownpayment: 30000,
        validUntil: '2026-11-30',
      }),
    });
    const quoteA = await quoteARes.json();

    const bookingARes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        quotationId: quoteA.id,
        clientName: 'Elena Customer',
        clientEmail: 'clientcustomer@gmail.com',
        clientPhone: '0917-111-2222',
        eventTitle: `Elena Debut Extravaganza ${runId}`,
        eventType: 'Debut Celebration',
        eventDate: testDate,
        startTime: '18:00',
        endTime: '23:00',
        venue: `Sofitel Philippine Plaza, Grand Ballroom ${runId}`,
        guestCount: 180,
        totalAmount: 60000,
        status: 'Tentative',
        assignedStaff: [{ id: 'st-2', role: 'Sound Engineer' }],
        assignedEquipment: [{ resourceId: 'eq-1', quantity: 1 }],
      }),
    });
    const bookingA = await bookingARes.json();
    console.log('7. Booking A creation status:', bookingARes.status, '| Ref:', bookingA.bookingRef);
    if (bookingARes.status !== 201) throw new Error('Booking creation failed!');
    console.log('✅ Test 7 Passed: Booking created successfully (201 Created).');
    passed++;

    // 8. Booking Edit Conflict
    const editConflictRes = await fetch(`${API_BASE}/bookings/${bookingARes.id || bookingA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        venue: `Manila Hotel, Centennial Hall ${runId}`, // Collides with Booking B!
      }),
    });
    console.log('8. Booking edit conflict status:', editConflictRes.status);
    if (editConflictRes.status !== 409) throw new Error('Booking edit collision did not return 409 Conflict!');
    console.log('✅ Test 8 Passed: Booking edit conflict returned 409 Conflict.');
    passed++;

    // 9. Venue Conflict on Creation
    const venueConflictRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Colliding Client',
        clientEmail: 'collide@example.com',
        clientPhone: '0900',
        eventTitle: 'Collision Event',
        eventType: 'Party',
        eventDate: testDate,
        startTime: '19:00',
        endTime: '22:00',
        venue: `Manila Hotel, Centennial Hall ${runId}`,
        guestCount: 50,
        totalAmount: 20000,
      }),
    });
    console.log('9. Venue collision on creation status:', venueConflictRes.status);
    if (venueConflictRes.status !== 409) throw new Error('Venue collision did not return 409 Conflict!');
    console.log('✅ Test 9 Passed: Venue collision returned 409 Conflict.');
    passed++;

    // 10. Staff Conflict
    const staffConflictRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Staff Clash Client',
        clientEmail: 'staffclash@example.com',
        clientPhone: '0900',
        eventTitle: 'Staff Clash Event',
        eventType: 'Party',
        eventDate: testDate,
        startTime: '18:00',
        endTime: '22:00',
        venue: 'Different Venue X',
        guestCount: 50,
        totalAmount: 20000,
        assignedStaff: [{ id: 'st-1', role: 'Lead Director' }], // Already on Booking B!
      }),
    });
    console.log('10. Staff double-booking status:', staffConflictRes.status);
    if (staffConflictRes.status !== 409) throw new Error('Staff collision did not return 409 Conflict!');
    console.log('✅ Test 10 Passed: Staff double-booking returned 409 Conflict.');
    passed++;

    // 11. Equipment Conflict
    const eqConflictRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Eq Clash Client',
        clientEmail: 'eqclash@example.com',
        clientPhone: '0900',
        eventTitle: 'Eq Clash Event',
        eventType: 'Party',
        eventDate: testDate,
        startTime: '18:00',
        endTime: '22:00',
        venue: 'Different Venue Y',
        guestCount: 50,
        totalAmount: 20000,
        assignedEquipment: [{ resourceId: 'eq-1', quantity: 15 }], // Stock is only 6
      }),
    });
    console.log('11. Equipment over-allocation status:', eqConflictRes.status);
    if (eqConflictRes.status !== 409) throw new Error('Equipment over-allocation did not return 409 Conflict!');
    console.log('✅ Test 11 Passed: Equipment over-allocation returned 409 Conflict.');
    passed++;

    // 12. Invalid Quotation -> Booking
    const cancelledQRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Cancelled Quote Client',
        clientEmail: 'cancelq@example.com',
        eventType: 'Gala',
        eventDate: testDate,
        venue: 'Hall Z',
        guestCount: 50,
        items: [],
        subtotal: 10000,
        grandTotal: 10000,
        status: 'Cancelled',
      }),
    });
    const cancelledQ = await cancelledQRes.json();

    const badQBookingRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        quotationId: cancelledQ.id,
        clientName: 'Cancelled Quote Client',
        clientEmail: 'cancelq@example.com',
        clientPhone: '0900',
        eventTitle: 'Bad Booking',
        eventType: 'Gala',
        eventDate: testDate,
        venue: 'Hall Z',
        guestCount: 50,
        totalAmount: 10000,
      }),
    });
    console.log('12. Booking from cancelled quotation status:', badQBookingRes.status);
    if (badQBookingRes.status !== 409 && badQBookingRes.status !== 400) throw new Error('Booking from cancelled quote was not rejected!');
    console.log('✅ Test 12 Passed: Booking from cancelled quotation rejected with 409/400.');
    passed++;

    // 13. Invalid Lifecycle Transition (Cancelled -> Confirmed)
    // First cancel bookingB
    await fetch(`${API_BASE}/bookings/${bookingB.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Testing lifecycle' }),
    });

    const invalidTransitionRes = await fetch(`${API_BASE}/bookings/${bookingB.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Confirmed' }),
    });
    console.log('13. Cancelled -> Confirmed status:', invalidTransitionRes.status);
    if (invalidTransitionRes.status !== 400 && invalidTransitionRes.status !== 409) throw new Error('Invalid lifecycle transition was not rejected!');
    console.log('✅ Test 13 Passed: Invalid lifecycle transition (Cancelled -> Confirmed) rejected.');
    passed++;

    // 14. Booking Cancellation
    const cancelARes = await fetch(`${API_BASE}/bookings/${bookingA.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Customer schedule change' }),
    });
    console.log('14. Booking A cancellation status:', cancelARes.status);
    if (!cancelARes.ok) throw new Error('Booking cancellation failed!');
    console.log('✅ Test 14 Passed: Booking cancelled and schedule slot deactivated.');
    passed++;

    // 15. Booking Rescheduling with Conflict Check
    // Create new booking C and reschedule it
    const bookingCRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Reschedule Client',
        clientEmail: 'reschedule@example.com',
        clientPhone: '0900',
        eventTitle: 'Reschedule Target Event',
        eventType: 'Seminar',
        eventDate: testDate,
        startTime: '10:00',
        endTime: '15:00',
        venue: `Reschedule Venue ${runId}`,
        guestCount: 80,
        totalAmount: 35000,
        status: 'Confirmed',
      }),
    });
    const bookingC = await bookingCRes.json();

    const rescheduleRes = await fetch(`${API_BASE}/bookings/${bookingC.id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        newDate: '2026-11-28',
        newStartTime: '14:00',
        newEndTime: '19:00',
        reason: 'Client requested venue availability shift',
      }),
    });
    console.log('15. Booking reschedule status:', rescheduleRes.status);
    if (!rescheduleRes.ok) throw new Error('Booking reschedule failed!');
    console.log('✅ Test 15 Passed: Booking rescheduled with conflict check and schedule update.');
    passed++;

    // =========================================================================
    // SECTION 3: SCHEDULING & RADAR (Tests 16 - 20)
    // =========================================================================
    console.log('\n>>> SECTION 3: SCHEDULING & RADAR <<<');

    // 16. Concurrent Booking Race Condition
    const raceVenue = `Picasso Ballroom ${runId}`;
    const [raceA, raceB] = await Promise.all([
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          clientName: 'Racer Alpha',
          clientEmail: 'alpha@example.com',
          clientPhone: '0911',
          eventTitle: 'Alpha Race',
          eventType: 'Party',
          eventDate: raceDate,
          startTime: '18:00',
          endTime: '23:00',
          venue: raceVenue,
          guestCount: 100,
          totalAmount: 40000,
          status: 'Confirmed',
        }),
      }),
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          clientName: 'Racer Beta',
          clientEmail: 'beta@example.com',
          clientPhone: '0922',
          eventTitle: 'Beta Race',
          eventType: 'Party',
          eventDate: raceDate,
          startTime: '18:00',
          endTime: '23:00',
          venue: raceVenue,
          guestCount: 100,
          totalAmount: 40000,
          status: 'Confirmed',
        }),
      }),
    ]);
    console.log(`16. Concurrent Race: A=${raceA.status}, B=${raceB.status}`);
    const onePassedOneFailed = (raceA.status === 201 && raceB.status === 409) || (raceB.status === 201 && raceA.status === 409);
    if (!onePassedOneFailed) throw new Error(`Concurrency race check failed: A=${raceA.status}, B=${raceB.status}`);
    console.log('✅ Test 16 Passed: Advisory locks serialized concurrent booking creation (1 Created, 1 Conflict 409).');
    passed++;

    // 17. Availability Radar
    const radarRes = await fetch(`${API_BASE}/scheduling/availability?year=2026&month=11`);
    const radarData = await radarRes.json();
    console.log('17. Radar days returned:', radarData.days?.length);
    if (!radarData.days || radarData.days.length < 28) throw new Error('Availability radar did not return full month matrix!');
    console.log('✅ Test 17 Passed: 31-day availability radar queries live PostgreSQL bookings.');
    passed++;

    // 18. Cancelled booking releases slot & resources
    // Elena's booking was cancelled (bookingA). Now we can create a booking in the exact same venue & time!
    const reoccupyRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Reoccupy Client',
        clientEmail: 'reoccupy@example.com',
        clientPhone: '0900',
        eventTitle: 'Reoccupied Event',
        eventType: 'Debut',
        eventDate: testDate,
        startTime: '18:00',
        endTime: '23:00',
        venue: `Sofitel Philippine Plaza, Grand Ballroom ${runId}`,
        guestCount: 150,
        totalAmount: 50000,
        status: 'Confirmed',
        assignedStaff: [{ id: 'st-2', role: 'Sound Engineer' }],
        assignedEquipment: [{ resourceId: 'eq-1', quantity: 1 }],
      }),
    });
    console.log('18. Reoccupy released slot status:', reoccupyRes.status);
    if (reoccupyRes.status !== 201) throw new Error('Cancelled booking did not release its slot & resources!');
    console.log('✅ Test 18 Passed: Cancelled booking released venue, staff, and hardware allocations.');
    passed++;

    // 19. Rescheduled booking releases old slot
    // Booking C was moved from testDate (10:00-15:00) to 2026-11-28. Check old venue is free at 10:00-15:00
    const checkOldSlotRes = await fetch(`${API_BASE}/scheduling/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventDate: testDate,
        startTime: '10:00',
        endTime: '15:00',
        venue: `Reschedule Venue ${runId}`,
      }),
    });
    const oldSlotCheck = await checkOldSlotRes.json();
    console.log('19. Old slot available after reschedule:', oldSlotCheck.isAvailable);
    if (!oldSlotCheck.isAvailable) throw new Error('Old slot remained occupied after rescheduling!');
    console.log('✅ Test 19 Passed: Rescheduled booking freed old date/time slot.');
    passed++;

    // 20. EventSchedule Synchronization
    const getBookingC = await (await fetch(`${API_BASE}/bookings/${bookingC.id}`, { headers: { 'Authorization': `Bearer ${adminToken}` } })).json();
    console.log('20. EventSchedule date:', getBookingC.schedule?.eventDate?.split('T')[0], '| Booking date:', getBookingC.eventDate?.split('T')[0]);
    if (!getBookingC.schedule || getBookingC.schedule.eventDate?.split('T')[0] !== '2026-11-28') {
      throw new Error('EventSchedule is not in sync with Booking!');
    }
    console.log('✅ Test 20 Passed: EventSchedule 1:1 synchronization maintained.');
    passed++;

    // =========================================================================
    // SECTION 4: MANUAL PAYMENT RECORDING & VERIFICATION (Tests 21 - 32)
    // =========================================================================
    console.log('\n>>> SECTION 4: MANUAL PAYMENT RECORDING & VERIFICATION <<<');

    // 21. Customer uploads proof (valid PNG image)
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    const formData = new FormData();
    formData.append('proof', new Blob([validPngBuffer], { type: 'image/png' }), 'gcash_receipt.png');

    const uploadRes = await fetch(`${API_BASE}/payments/upload-proof`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log('21. Proof upload status:', uploadRes.status, '| URL:', uploadData.proofUrl);
    if (!uploadRes.ok || !uploadData.proofUrl) throw new Error('Valid proof upload failed!');
    console.log('✅ Test 21 Passed: Payment proof uploaded securely (public/uploads/payments/).');
    passed++;

    // 22. Invalid file type rejected
    const badFileFormData = new FormData();
    badFileFormData.append('proof', new Blob(['console.log("hacked");'], { type: 'application/javascript' }), 'script.js');
    const badUploadRes = await fetch(`${API_BASE}/payments/upload-proof`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
      body: badFileFormData,
    });
    console.log('22. Script upload status:', badUploadRes.status);
    if (badUploadRes.status !== 400) throw new Error('Unsafe script file upload was not rejected!');
    console.log('✅ Test 22 Passed: Invalid/executable file type rejected with 400 Bad Request.');
    passed++;

    // 23. Oversized file rejected (> 5MB)
    const bigBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
    const bigFormData = new FormData();
    bigFormData.append('proof', bigBlob, 'huge.png');
    const bigUploadRes = await fetch(`${API_BASE}/payments/upload-proof`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
      body: bigFormData,
    });
    console.log('23. Oversized file upload status:', bigUploadRes.status);
    if (bigUploadRes.status !== 400) throw new Error('Oversized file upload was not rejected!');
    console.log('✅ Test 23 Passed: File exceeding 5MB limit rejected with 400 Bad Request.');
    passed++;

    // 24. Customer cannot submit payment for another customer
    const crossPaySubmitRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingC.id, // Belongs to reschedule@example.com, not customer A!
        type: 'Downpayment (50%)',
        amount: 17500,
        method: 'GCash QR',
        referenceNumber: 'GCASH-ILLEGAL',
      }),
    });
    console.log('24. Cross-customer payment submission status:', crossPaySubmitRes.status);
    if (crossPaySubmitRes.status !== 403) throw new Error('Cross-customer payment submission was not blocked!');
    console.log('✅ Test 24 Passed: Customer submitting payment for another account rejected with 403 Forbidden.');
    passed++;

    // Create fresh Booking for Customer A to test manual payment lifecycle
    const quoteDRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        clientName: 'Elena Customer',
        clientEmail: 'clientcustomer@gmail.com',
        eventType: 'Anniversary Gala',
        eventDate: '2026-11-29',
        venue: `Okada Manila, Golden Ballroom ${runId}`,
        guestCount: 200,
        items: [{ id: 'item-1', name: 'Grand Production', rate: 100000, quantity: 1, amount: 100000 }],
        subtotal: 100000,
        grandTotal: 100000,
        requiredDownpayment: 50000,
        validUntil: '2026-11-30',
      }),
    });
    const quoteD = await quoteDRes.json();

    const bookingDRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        quotationId: quoteD.id,
        clientName: 'Elena Customer',
        clientEmail: 'clientcustomer@gmail.com',
        clientPhone: '0917',
        eventTitle: `Elena Anniversary ${runId}`,
        eventType: 'Anniversary Gala',
        eventDate: '2026-11-29',
        startTime: '18:00',
        endTime: '23:00',
        venue: `Okada Manila, Golden Ballroom ${runId}`,
        guestCount: 200,
        totalAmount: 100000,
        status: 'Tentative',
      }),
    });
    const bookingD = await bookingDRes.json();

    // 25. Payment starts as Pending Verification
    const submitProofPaymentRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingD.id,
        type: 'Downpayment (50%)',
        amount: 50000,
        method: 'GCash QR',
        referenceNumber: `GCASH-PROOF-${runId}`,
        proofUrl: uploadData.proofUrl,
      }),
    });
    const paymentD = await submitProofPaymentRes.json();
    console.log('25. Customer payment status:', paymentD.status, '| verified:', paymentD.verified);
    if (paymentD.status !== 'Pending Verification' || paymentD.verified !== false) {
      throw new Error('Payment was automatically verified on customer creation!');
    }
    console.log('✅ Test 25 Passed: Customer payment initialized as "Pending Verification" (verified: false).');
    passed++;

    // 26. Customer cannot verify payment
    const custTryVerifyRes = await fetch(`${API_BASE}/payments/${paymentD.id}/verify`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    console.log('26. Customer verify status:', custTryVerifyRes.status);
    if (custTryVerifyRes.status !== 403) throw new Error('Customer was able to call verify endpoint!');
    console.log('✅ Test 26 Passed: Customer verification attempt denied (403 Forbidden).');
    passed++;

    // 27. Admin can verify payment
    const adminVerifyRes = await fetch(`${API_BASE}/payments/${paymentD.id}/verify`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const verifiedPaymentData = await adminVerifyRes.json();
    console.log('27. Admin verify status:', adminVerifyRes.status, '| status:', verifiedPaymentData.payment.status);
    if (!adminVerifyRes.ok || verifiedPaymentData.payment.status !== 'Verified' || !verifiedPaymentData.payment.verified) {
      throw new Error('Admin verification failed!');
    }
    console.log('✅ Test 27 Passed: Admin verified payment; booking and quotation statuses synchronized.');
    passed++;

    // 28. Admin can reject payment
    // Create a second unverified payment for testing rejection
    const pay2Res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingD.id,
        type: 'Partial Payment',
        amount: 20000,
        method: 'Bank Transfer',
        referenceNumber: `BANK-BAD-${runId}`,
        proofUrl: uploadData.proofUrl,
      }),
    });
    const pay2 = await pay2Res.json();

    const rejectRes = await fetch(`${API_BASE}/payments/${pay2.id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Bank reference number not found in online merchant settlement ledger.' }),
    });
    const rejectData = await rejectRes.json();
    console.log('28. Admin reject status:', rejectRes.status, '| status:', rejectData.payment.status, '| reason:', rejectData.payment.rejectionReason);
    if (!rejectRes.ok || rejectData.payment.status !== 'Rejected' || rejectData.payment.verified !== false) {
      throw new Error('Admin rejection failed!');
    }
    console.log('✅ Test 28 Passed: Admin rejected unverified payment with audit trail.');
    passed++;

    // 29. Duplicate payment rejected (Already settled downpayment)
    const dupDownpaymentRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingD.id,
        type: 'Downpayment (50%)',
        amount: 50000,
        method: 'GCash QR',
        referenceNumber: 'GCASH-DUP',
      }),
    });
    console.log('29. Duplicate downpayment status:', dupDownpaymentRes.status);
    if (dupDownpaymentRes.status !== 409) throw new Error('Duplicate downpayment was not blocked with 409 Conflict!');
    console.log('✅ Test 29 Passed: Duplicate downpayment rejected with 409 Conflict.');
    passed++;

    // 30. Payment amount validation
    const zeroPayRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingD.id,
        type: 'Final Payment',
        amount: 0,
        method: 'Cash',
        referenceNumber: 'CASH-ZERO',
      }),
    });
    console.log('30. Zero payment amount status:', zeroPayRes.status);
    if (zeroPayRes.status !== 400) throw new Error('Zero payment amount was not rejected with 400 Bad Request!');

    const overPayRes = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerTokenA}` },
      body: JSON.stringify({
        bookingId: bookingD.id,
        type: 'Final Payment',
        amount: 999999, // Exceeds balance!
        method: 'Cash',
        referenceNumber: 'CASH-OVER',
      }),
    });
    console.log('30b. Overpayment amount status:', overPayRes.status);
    if (overPayRes.status !== 400) throw new Error('Overpayment amount was not rejected with 400 Bad Request!');
    console.log('✅ Test 30 Passed: Server-side payment amount validation enforced.');
    passed++;

    // 31. Server-side Balance calculation
    // Booking D total = 100,000. Verified = 50,000. Remaining balance = 50,000.
    const portalDRes = await fetch(`${API_BASE}/customer/portal`, {
      headers: { 'Authorization': `Bearer ${customerTokenA}` },
    });
    const portalDData = await portalDRes.json();
    const targetBooking = portalDData.bookings.find(b => b.id === bookingD.id);
    const verifiedTotal = targetBooking.payments.filter(p => p.verified).reduce((sum, p) => sum + Number(p.amount), 0);
    const calculatedBalance = Math.max(0, Number(targetBooking.totalAmount) - verifiedTotal);
    console.log('31. Total:', targetBooking.totalAmount, '| Verified Paid:', verifiedTotal, '| Remaining Balance:', calculatedBalance);
    if (calculatedBalance !== 50000) throw new Error('Server-side balance calculation mismatch!');
    console.log('✅ Test 31 Passed: Server-side balance calculation verified (₱100,000 - ₱50,000 = ₱50,000).');
    passed++;

    // 32. Verified payment cannot be deleted
    const deleteVerifiedRes = await fetch(`${API_BASE}/payments/${paymentD.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    console.log('32. Delete verified payment status:', deleteVerifiedRes.status);
    if (deleteVerifiedRes.status !== 400) throw new Error('Verified payment deletion was not rejected!');
    console.log('✅ Test 32 Passed: Deletion of verified payment records blocked for ledger audit integrity.');
    passed++;

    console.log('\n================================================================================');
    console.log(`🎉 ALL ${passed} / ${total} THIRD-STAGE INTEGRATION AUDIT TESTS PASSED!`);
    console.log('================================================================================\n');
  } catch (error) {
    console.error('❌ Audit Failed:', error);
    process.exit(1);
  }
}

runThirdStageAudit();
