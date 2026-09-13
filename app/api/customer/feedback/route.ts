import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkAuth } from '../../../../lib/auth';
import { createFeedback, getFeedbackByBookingId } from '../../../../models/feedbackModel';

// POST /api/customer/feedback - Submit evaluation for completed booking
export async function POST(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { 
      bookingId, 
      overallRating, 
      serviceRating, 
      staffRating, 
      executionRating, 
      comments, 
      suggestions 
    } = body;

    // 1. Validate required fields
    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required' }, { status: 400 });
    }

    const numericBookingId = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
    if (isNaN(numericBookingId)) {
      return NextResponse.json({ message: 'Invalid booking ID format' }, { status: 400 });
    }

    // 2. Validate ratings range (1 - 5)
    const ratings = [
      { name: 'Overall Experience', val: overallRating },
      { name: 'Service Quality', val: serviceRating },
      { name: 'Staff Performance', val: staffRating },
      { name: 'Event Execution', val: executionRating },
    ];

    for (const r of ratings) {
      if (typeof r.val !== 'number' || r.val < 1 || r.val > 5) {
        return NextResponse.json({ 
          message: `${r.name} rating must be a valid number between 1 and 5` 
        }, { status: 400 });
      }
    }

    // 3. Validate text length limits
    if (comments && comments.length > 2000) {
      return NextResponse.json({ message: 'Comments cannot exceed 2000 characters' }, { status: 400 });
    }

    if (suggestions && suggestions.length > 2000) {
      return NextResponse.json({ message: 'Suggestions cannot exceed 2000 characters' }, { status: 400 });
    }

    // 4. Fetch the booking to verify existence, ownership, and completion status
    const booking = await prisma.booking.findUnique({
      where: { id: numericBookingId },
      include: {
        inquiry: true,
        quotation: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    // 5. Tenant isolation & Customer Ownership Check
    const authUser = auth.user;
    const isOwner = (
      booking.userId === authUser.id ||
      (Boolean(booking.clientEmail) && booking.clientEmail.toLowerCase() === authUser.email.toLowerCase()) ||
      booking.inquiry?.userId === authUser.id ||
      (Boolean(booking.inquiry?.clientEmail) && booking.inquiry?.clientEmail?.toLowerCase() === authUser.email.toLowerCase()) ||
      booking.quotation?.userId === authUser.id ||
      (Boolean(booking.quotation?.clientEmail) && booking.quotation?.clientEmail?.toLowerCase() === authUser.email.toLowerCase())
    );

    if (!isOwner) {
      return NextResponse.json({ 
        message: 'You are not authorized to submit feedback for this booking' 
      }, { status: 403 });
    }

    // 6. Enforce event completion: Booking MUST be 'Completed'
    if (booking.status !== 'Completed') {
      return NextResponse.json({ 
        message: 'Feedback can only be submitted after the event is marked as Completed by JAD Events administration' 
      }, { status: 400 });
    }

    // 7. Check if feedback already submitted (one evaluation per completed booking)
    const existingFeedback = await prisma.feedback.findUnique({
      where: { bookingId: numericBookingId },
    });

    if (existingFeedback) {
      return NextResponse.json({ 
        message: 'You have already submitted an evaluation for this booking' 
      }, { status: 409 });
    }

    // 8. Create feedback record
    const created = await createFeedback({
      bookingId: numericBookingId,
      userId: authUser.id,
      overallRating,
      serviceRating,
      staffRating,
      executionRating,
      comments: comments || null,
      suggestions: suggestions || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback has been submitted successfully.',
      feedback: created,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Customer feedback submission error:', error);
    return NextResponse.json({ 
      message: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET /api/customer/feedback?bookingId=123 - Fetch feedback for a booking
export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const bookingIdParam = url.searchParams.get('bookingId');

  if (!bookingIdParam) {
    return NextResponse.json({ message: 'bookingId query parameter is required' }, { status: 400 });
  }

  const numericBookingId = parseInt(bookingIdParam, 10);
  if (isNaN(numericBookingId)) {
    return NextResponse.json({ message: 'Invalid booking ID format' }, { status: 400 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: numericBookingId },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    const authUser = auth.user;
    const isOwner = (
      booking.userId === authUser.id ||
      (Boolean(booking.clientEmail) && booking.clientEmail.toLowerCase() === authUser.email.toLowerCase())
    );

    if (!isOwner && authUser.role !== 'Administrator') {
      return NextResponse.json({ 
        message: 'You are not authorized to view feedback for this booking' 
      }, { status: 403 });
    }

    const feedback = await getFeedbackByBookingId(numericBookingId);
    return NextResponse.json({ feedback });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
