import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface InquiryInput {
  trackingId?: string;
  userId?: number | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  eventType: string;
  eventDate: string | Date;
  eventVenue: string;
  guestsCount: number;
  requirements?: string | null;
  selectedServices?: any;
  packageId?: string | null;
  notes?: string | null;
  estimatedBudget?: string | null;
  status?: string;
}

export const generateTrackingId = async (): Promise<string> => {
  let trackingId = '';
  let isUnique = false;

  while (!isUnique) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    trackingId = `INQ-${randomDigits}`;
    const existing = await prisma.inquiry.findUnique({
      where: { trackingId },
    });
    if (!existing) isUnique = true;
  }
  return trackingId;
};

export const createInquiry = async (data: InquiryInput) => {
  const trackingId = data.trackingId || (await generateTrackingId());
  const eventDateParsed = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;

  // Resolve user ID if email is provided and userId is missing
  let resolvedUserId = data.userId || null;
  if (!resolvedUserId && data.clientEmail) {
    const matchedUser = await prisma.user.findUnique({
      where: { email: data.clientEmail },
    });
    if (matchedUser) resolvedUserId = matchedUser.id;
  }

  return await prisma.inquiry.create({
    data: {
      trackingId,
      userId: resolvedUserId,
      clientName: data.clientName || null,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone || null,
      eventType: data.eventType,
      eventDate: eventDateParsed,
      eventVenue: data.eventVenue,
      guestsCount: Number(data.guestsCount) || 100,
      requirements: data.requirements || data.notes || '',
      selectedServices: data.selectedServices || [],
      packageId: data.packageId || null,
      notes: data.notes || data.requirements || null,
      estimatedBudget: data.estimatedBudget !== undefined && data.estimatedBudget !== null ? String(data.estimatedBudget) : null,
      status: data.status || 'Pending Review',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });
};

export const getInquiries = async (limit = 100, offset = 0, search = '') => {
  const where: Prisma.InquiryWhereInput = search
    ? {
        OR: [
          { trackingId: { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } },
          { clientEmail: { contains: search, mode: 'insensitive' } },
          { eventVenue: { contains: search, mode: 'insensitive' } },
          { eventType: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        quotations: true,
        bookings: true,
      },
    }),
    prisma.inquiry.count({ where }),
  ]);

  return {
    inquiries,
    total,
  };
};

export const getInquiryByTrackingId = async (trackingId: string) => {
  return await prisma.inquiry.findUnique({
    where: { trackingId },
    include: {
      user: true,
      quotations: true,
      bookings: true,
    },
  });
};

export const getInquiryById = async (id: number | string) => {
  const inquiryId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(inquiryId)) {
    // If it's a tracking ID like INQ-XXXXX
    return await getInquiryByTrackingId(String(id));
  }
  return await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      user: true,
      quotations: true,
      bookings: true,
    },
  });
};

export const getInquiriesByCustomerEmail = async (email: string) => {
  return await prisma.inquiry.findMany({
    where: { clientEmail: email },
    orderBy: { createdAt: 'desc' },
    include: {
      quotations: true,
      bookings: true,
    },
  });
};

export const updateInquiryStatus = async (id: number | string, status: string) => {
  const inquiryId = typeof id === 'string' ? parseInt(id, 10) : id;
  let existing;

  if (isNaN(inquiryId)) {
    existing = await getInquiryByTrackingId(String(id));
  } else {
    existing = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  }

  if (!existing) {
    throw new Error('Inquiry not found');
  }

  if (existing.status === 'CANCELLED') {
    throw new Error('Inquiry is already cancelled');
  }

  return await prisma.inquiry.update({
    where: { id: existing.id },
    data: { status },
  });
};

export const cancelInquiry = async (id: number | string, reason: string | null = null, actor: string = 'Customer') => {
  const inquiryId = typeof id === 'string' ? parseInt(id, 10) : id;
  let targetId = inquiryId;
  let existing;
  if (isNaN(inquiryId)) {
    existing = await getInquiryByTrackingId(String(id));
  } else {
    existing = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  }

  if (!existing) throw new Error('Inquiry not found');
  if (existing.status !== 'Pending Review') {
    throw new Error('Only inquiries in "Pending Review" status can be cancelled.');
  }

  return await prisma.inquiry.update({
    where: { id: existing.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: actor,
      cancellationReason: reason,
    },
  });
};

export const deleteInquiry = async (id: number | string) => {
  const inqId = typeof id === 'string' ? parseInt(id, 10) : id;
  let targetId = inqId;

  if (isNaN(inqId)) {
    const existing = await getInquiryByTrackingId(String(id));
    if (!existing) return null;
    targetId = existing.id;
  }

  // Set any linked quotations inquiryId to null before deletion if needed
  await prisma.quotation.updateMany({
    where: { inquiryId: targetId },
    data: { inquiryId: null },
  }).catch(() => {});

  // Set any linked bookings inquiryId to null before deletion if needed
  await prisma.booking.updateMany({
    where: { inquiryId: targetId },
    data: { inquiryId: null },
  }).catch(() => {});

  return await prisma.inquiry.delete({
    where: { id: targetId },
  });
};
