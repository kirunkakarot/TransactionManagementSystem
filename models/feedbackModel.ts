import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface CreateFeedbackInput {
  bookingId: number;
  userId: number;
  overallRating: number;
  serviceRating: number;
  staffRating: number;
  executionRating: number;
  comments?: string | null;
  suggestions?: string | null;
}

export const createFeedback = async (data: CreateFeedbackInput) => {
  // 1. Check if booking exists
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // 2. Validate booking is Completed
  if (booking.status !== 'Completed') {
    throw new Error('Feedback can only be submitted for completed events');
  }

  // 3. Check for existing feedback for this booking (one evaluation per completed booking)
  const existing = await prisma.feedback.findUnique({
    where: { bookingId: data.bookingId },
  });

  if (existing) {
    throw new Error('Evaluation has already been submitted for this booking');
  }

  // 4. Create feedback record
  return await prisma.feedback.create({
    data: {
      bookingId: data.bookingId,
      userId: data.userId,
      overallRating: data.overallRating,
      serviceRating: data.serviceRating,
      staffRating: data.staffRating,
      executionRating: data.executionRating,
      comments: data.comments?.trim() || null,
      suggestions: data.suggestions?.trim() || null,
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingRef: true,
          eventTitle: true,
          eventType: true,
          eventDate: true,
          venue: true,
          clientName: true,
          clientEmail: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getFeedbackByBookingId = async (bookingId: number) => {
  return await prisma.feedback.findUnique({
    where: { bookingId },
    include: {
      booking: {
        select: {
          id: true,
          bookingRef: true,
          eventTitle: true,
          eventType: true,
          eventDate: true,
          venue: true,
          clientName: true,
          clientEmail: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getFeedbackById = async (id: number) => {
  return await prisma.feedback.findUnique({
    where: { id },
    include: {
      booking: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getFeedbacks = async (limit = 100, offset = 0, search = '') => {
  const where: Prisma.FeedbackWhereInput = {};

  if (search) {
    where.OR = [
      { booking: { bookingRef: { contains: search, mode: 'insensitive' } } },
      { booking: { eventTitle: { contains: search, mode: 'insensitive' } } },
      { booking: { clientName: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { comments: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            bookingRef: true,
            eventTitle: true,
            eventType: true,
            eventDate: true,
            venue: true,
            clientName: true,
            clientEmail: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return { feedbacks, total };
};

export const getFeedbackSummaryStats = async () => {
  const [totalFeedbacks, aggregations] = await Promise.all([
    prisma.feedback.count(),
    prisma.feedback.aggregate({
      _avg: {
        overallRating: true,
        serviceRating: true,
        staffRating: true,
        executionRating: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const completedBookingsCount = await prisma.booking.count({
    where: { status: 'Completed' },
  });

  return {
    totalFeedbacks,
    completedBookingsCount,
    submissionRate: completedBookingsCount > 0 
      ? Math.round((totalFeedbacks / completedBookingsCount) * 100) 
      : 0,
    averageRatings: {
      overall: aggregations._avg.overallRating ? Number(aggregations._avg.overallRating.toFixed(1)) : 0,
      service: aggregations._avg.serviceRating ? Number(aggregations._avg.serviceRating.toFixed(1)) : 0,
      staff: aggregations._avg.staffRating ? Number(aggregations._avg.staffRating.toFixed(1)) : 0,
      execution: aggregations._avg.executionRating ? Number(aggregations._avg.executionRating.toFixed(1)) : 0,
    },
  };
};
