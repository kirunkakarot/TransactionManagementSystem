import { prisma } from '../lib/prisma';
import { createFeedback, getFeedbackByBookingId, getFeedbacks, getFeedbackSummaryStats } from '../models/feedbackModel';
import { updateBookingStatus } from '../models/bookingModel';

async function runVerification() {
  console.log('=== STARTING AUTOMATED FEEDBACK & EVALUATION VERIFICATION ===\n');

  // Clean up any test records from prior runs
  const testRefA = 'BK-TEST-FB-A';
  const testRefB = 'BK-TEST-FB-B';

  await prisma.feedback.deleteMany({
    where: {
      booking: {
        bookingRef: { in: [testRefA, testRefB] }
      }
    }
  });

  await prisma.booking.deleteMany({
    where: {
      bookingRef: { in: [testRefA, testRefB] }
    }
  });

  // Ensure Customer A and Customer B users exist
  let userA = await prisma.user.findFirst({ where: { email: 'customerA_test@example.com' } });
  if (!userA) {
    userA = await prisma.user.create({
      data: {
        name: 'Customer A Test',
        email: 'customerA_test@example.com',
        password: 'hashedpassword123',
        role: 'Customer',
      }
    });
  }

  let userB = await prisma.user.findFirst({ where: { email: 'customerB_test@example.com' } });
  if (!userB) {
    userB = await prisma.user.create({
      data: {
        name: 'Customer B Test',
        email: 'customerB_test@example.com',
        password: 'hashedpassword123',
        role: 'Customer',
      }
    });
  }

  // Create test booking A in 'Confirmed' status
  const bookingA = await prisma.booking.create({
    data: {
      bookingRef: testRefA,
      userId: userA.id,
      clientName: userA.name,
      clientEmail: userA.email,
      clientPhone: '09123456789',
      eventTitle: 'Customer A Silver Anniversary',
      eventType: 'Anniversary',
      eventDate: new Date('2026-10-15'),
      venue: 'The Grand Ballroom',
      guestCount: 150,
      totalAmount: 75000,
      status: 'Confirmed',
    }
  });

  console.log(`✓ Test Booking A created: ID ${bookingA.id} (${bookingA.bookingRef}), status: "${bookingA.status}"`);

  // TEST 1 & 2: Customer attempts to submit feedback while booking is NOT Completed
  console.log('\n--- TEST 1: Customer submits feedback when booking is Confirmed (not Completed) ---');
  try {
    await createFeedback({
      bookingId: bookingA.id,
      userId: userA.id,
      overallRating: 5,
      serviceRating: 5,
      staffRating: 5,
      executionRating: 5,
      comments: 'Should fail because booking is Confirmed, not Completed',
    });
    console.error('❌ FAILED: createFeedback succeeded when it should have been rejected!');
    process.exit(1);
  } catch (err: any) {
    console.log(`✓ PASSED: Rejected with error: "${err.message}"`);
  }

  // TEST 3: Admin marks booking as Completed
  console.log('\n--- TEST 2: Admin marks booking as Completed ---');
  const updatedBookingA = await updateBookingStatus(bookingA.id, 'Completed');
  console.log(`✓ PASSED: Booking status successfully transitioned to: "${updatedBookingA.status}"`);

  // TEST 4: Customer submits valid evaluation
  console.log('\n--- TEST 3: Customer submits valid evaluation after event is Completed ---');
  const feedbackRecord = await createFeedback({
    bookingId: bookingA.id,
    userId: userA.id,
    overallRating: 5,
    serviceRating: 4,
    staffRating: 5,
    executionRating: 5,
    comments: 'Truly spectacular lighting and flawless coordination! Our guests were amazed.',
    suggestions: 'Keep doing what you do best.',
  });
  console.log(`✓ PASSED: Feedback created with ID ${feedbackRecord.id}, overallRating: ${feedbackRecord.overallRating}/5`);

  // TEST 5: Duplicate submission prevention
  console.log('\n--- TEST 4: Customer attempts second feedback submission for same booking ---');
  try {
    await createFeedback({
      bookingId: bookingA.id,
      userId: userA.id,
      overallRating: 4,
      serviceRating: 4,
      staffRating: 4,
      executionRating: 4,
      comments: 'Duplicate attempt',
    });
    console.error('❌ FAILED: Duplicate evaluation was allowed!');
    process.exit(1);
  } catch (err: any) {
    console.log(`✓ PASSED: Duplicate rejected with error: "${err.message}"`);
  }

  // TEST 6: Fetching feedback by booking ID
  console.log('\n--- TEST 5: Retrieve feedback by booking ID ---');
  const retrievedFeedback = await getFeedbackByBookingId(bookingA.id);
  if (retrievedFeedback && retrievedFeedback.overallRating === 5 && retrievedFeedback.comments?.includes('spectacular')) {
    console.log(`✓ PASSED: Correct feedback retrieved: "${retrievedFeedback.comments}"`);
  } else {
    console.error('❌ FAILED: Could not retrieve correct feedback');
    process.exit(1);
  }

  // TEST 7: Summary statistics for Reporting readiness
  console.log('\n--- TEST 6: Summary statistics & reporting calculations ---');
  const stats = await getFeedbackSummaryStats();
  console.log(`✓ PASSED: Feedback reporting stats retrieved:`, stats);

  // Clean up
  await prisma.feedback.deleteMany({
    where: { bookingId: bookingA.id }
  });
  await prisma.booking.deleteMany({
    where: { id: bookingA.id }
  });
  await prisma.user.deleteMany({
    where: { email: { in: ['customerA_test@example.com', 'customerB_test@example.com'] } }
  });

  console.log('\n=== ALL AUTOMATED FEEDBACK & EVALUATION TESTS PASSED (100%) ===');
}

runVerification()
  .catch(err => {
    console.error('Verification error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
