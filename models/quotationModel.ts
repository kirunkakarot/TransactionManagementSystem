import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import {
  checkScheduleAvailability,
  toEventDateDbValue,
  validateEventTimeRange,
  resolveEventTimes,
  updateRequirementsWithSchedule,
} from '../lib/schedulingEngine';

const QUOTATION_SCHEDULE_PREFIX = '__JAD_EVENT_SCHEDULE__:';

const DEFAULT_QUOTATION_TERMS = [
  '50% Non-refundable Reservation Downpayment required to lock event calendar & production crew.',
  'Remaining 50% balance must be settled 3 days prior to the target ingress date.',
  'Inclement weather postponement requires minimum 7 days advance notice with zero penalty.',
  'Food & Beverage guest count buffer of +10% included in operational provisions.',
];

export function extractQuotationScheduleFromTerms(rawTerms: any): {
  cleanTerms: string[];
  schedule: {
    requestedStartTime?: string;
    requestedEndTime?: string;
    approvedStartTime?: string;
    approvedEndTime?: string;
  };
} {
  const arr = Array.isArray(rawTerms) ? rawTerms : DEFAULT_QUOTATION_TERMS;
  const cleanTerms: string[] = [];
  let schedule: {
    requestedStartTime?: string;
    requestedEndTime?: string;
    approvedStartTime?: string;
    approvedEndTime?: string;
  } = {};

  for (const item of arr) {
    if (typeof item === 'string' && item.startsWith(QUOTATION_SCHEDULE_PREFIX)) {
      try {
        const jsonPart = item.slice(QUOTATION_SCHEDULE_PREFIX.length);
        const parsed = JSON.parse(jsonPart);
        if (parsed && typeof parsed === 'object') {
          schedule = {
            requestedStartTime: parsed.requestedStartTime || undefined,
            requestedEndTime: parsed.requestedEndTime || undefined,
            approvedStartTime: parsed.approvedStartTime || undefined,
            approvedEndTime: parsed.approvedEndTime || undefined,
          };
        }
      } catch {
        // ignore malformed marker
      }
    } else if (typeof item === 'string') {
      cleanTerms.push(item);
    }
  }

  return { cleanTerms, schedule };
}

export function serializeQuotationTermsWithSchedule(
  rawTerms: string[] | undefined,
  schedule: {
    requestedStartTime?: string;
    requestedEndTime?: string;
    approvedStartTime?: string;
    approvedEndTime?: string;
  }
): string[] {
  const { cleanTerms } = extractQuotationScheduleFromTerms(rawTerms ?? DEFAULT_QUOTATION_TERMS);
  const hasSchedule = Boolean(
    schedule.requestedStartTime ||
      schedule.requestedEndTime ||
      schedule.approvedStartTime ||
      schedule.approvedEndTime
  );
  if (!hasSchedule) return cleanTerms;
  return [
    ...cleanTerms,
    `${QUOTATION_SCHEDULE_PREFIX}${JSON.stringify({
      ...(schedule.requestedStartTime ? { requestedStartTime: schedule.requestedStartTime } : {}),
      ...(schedule.requestedEndTime ? { requestedEndTime: schedule.requestedEndTime } : {}),
      ...(schedule.approvedStartTime ? { approvedStartTime: schedule.approvedStartTime } : {}),
      ...(schedule.approvedEndTime ? { approvedEndTime: schedule.approvedEndTime } : {}),
    })}`,
  ];
}

export function enrichQuotation<T extends Record<string, any> | null>(q: T): T {
  if (!q) return q;
  const { cleanTerms, schedule } = extractQuotationScheduleFromTerms(q.terms);
  const activeBooking = Array.isArray(q.bookings)
    ? q.bookings.find((b: any) => b.status !== 'Cancelled' && b.status !== 'Rejected')
    : null;

  const resolved = resolveEventTimes({
    requirementsRaw: q.inquiry?.requirements || null,
    requestedStartTime: q.requestedStartTime || schedule.requestedStartTime,
    requestedEndTime: q.requestedEndTime || schedule.requestedEndTime,
    approvedStartTime:
      q.approvedStartTime || schedule.approvedStartTime || q.startTime || activeBooking?.startTime,
    approvedEndTime:
      q.approvedEndTime || schedule.approvedEndTime || q.endTime || activeBooking?.endTime,
  });

  return {
    ...q,
    terms: cleanTerms,
    requestedStartTime: resolved.requestedStartTime || undefined,
    requestedEndTime: resolved.requestedEndTime || undefined,
    approvedStartTime: resolved.approvedStartTime || undefined,
    approvedEndTime: resolved.approvedEndTime || undefined,
    startTime: resolved.effectiveStartTime || undefined,
    endTime: resolved.effectiveEndTime || undefined,
  };
}

export interface QuotationInput {
  quotationRef?: string;
  inquiryId?: number | string | null;
  userId?: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  eventType: string;
  eventDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  requestedStartTime?: string | null;
  requestedEndTime?: string | null;
  approvedStartTime?: string | null;
  approvedEndTime?: string | null;
  venue: string;
  guestCount: number;
  items: Array<{
    id: string;
    type: 'service' | 'package' | 'custom';
    name: string;
    rate: number;
    quantity: number;
    amount: number;
    notes?: string;
  }>;
  subtotal: number;
  discounts?: Array<{
    id: string;
    label: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
  }>;
  additionalCharges?: Array<{
    id: string;
    label: string;
    amount: number;
  }>;
  grandTotal: number;
  requiredDownpayment: number;
  validUntil: string | Date;
  validityDays?: number;
  status?: string;
  adminComment?: string | null;
  notes?: string | null;
  terms?: string[];
}

export const generateQuotationRef = async (): Promise<string> => {
  let ref = '';
  let isUnique = false;
  const year = new Date().getFullYear();

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    ref = `QT-${year}-${random}`;
    const existing = await prisma.quotation.findUnique({
      where: { quotationRef: ref },
    });
    if (!existing) isUnique = true;
  }
  return ref;
};

export const getQuotations = async (
  limit = 100,
  offset = 0,
  search = '',
  customerFilter?: { userId?: number | null; email?: string | null }
) => {
  const andConditions: Prisma.QuotationWhereInput[] = [];

  if (customerFilter) {
    const ownerConditions: Prisma.QuotationWhereInput[] = [];
    if (customerFilter.userId) {
      ownerConditions.push({ userId: customerFilter.userId });
    }
    const cleanEmail = (customerFilter.email || '').trim();
    if (cleanEmail) {
      ownerConditions.push({ clientEmail: { equals: cleanEmail, mode: 'insensitive' as const } });
    }
    andConditions.push(ownerConditions.length > 0 ? { OR: ownerConditions } : { id: -1 });
  }

  if (search) {
    andConditions.push({
      OR: [
        { quotationRef: { contains: search, mode: 'insensitive' as const } },
        { clientName: { contains: search, mode: 'insensitive' as const } },
        { clientEmail: { contains: search, mode: 'insensitive' as const } },
        { eventType: { contains: search, mode: 'insensitive' as const } },
        { venue: { contains: search, mode: 'insensitive' as const } },
      ],
    });
  }

  const where: Prisma.QuotationWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        inquiry: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        bookings: {
          select: { id: true, bookingRef: true, status: true, startTime: true, endTime: true },
        },
        payments: true,
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return { quotations: quotations.map((q) => enrichQuotation(q)), total };
};

export type QuotationWithRelations = Prisma.QuotationGetPayload<{
  include: {
    inquiry: true;
    user: {
      select: { id: true; name: true; email: true; phone: true };
    };
    bookings: true;
    payments: true;
  };
}>;

export const getQuotationById = async (id: number | string): Promise<QuotationWithRelations | null> => {
  const idStr = String(id).trim();
  const isPureNumber = /^\d+$/.test(idStr);

  if (!isPureNumber) {
    return await getQuotationByRef(idStr);
  }

  const qId = parseInt(idStr, 10);
  const found = await prisma.quotation.findUnique({
    where: { id: qId },
    include: {
      inquiry: true,
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      bookings: true,
      payments: true,
    },
  });

  if (!found) {
    return await getQuotationByRef(idStr);
  }

  return enrichQuotation(found);
};

export const getQuotationByRef = async (quotationRef: string): Promise<QuotationWithRelations | null> => {
  const ref = quotationRef.trim();
  const found = await prisma.quotation.findFirst({
    where: {
      OR: [
        { quotationRef: { equals: ref, mode: 'insensitive' as const } },
        ...(ref.startsWith('#') ? [{ quotationRef: { equals: ref.substring(1), mode: 'insensitive' as const } }] : []),
      ],
    },
    include: {
      inquiry: true,
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      bookings: true,
      payments: true,
    },
  });
  return enrichQuotation(found);
};

export const getQuotationsByUserEmail = async (email: string) => {
  const list = await prisma.quotation.findMany({
    where: { clientEmail: { equals: email, mode: 'insensitive' as const } },
    orderBy: { createdAt: 'desc' },
    include: {
      inquiry: true,
      bookings: true,
      payments: true,
    },
  });
  return list.map((q) => enrichQuotation(q));
};

export const createQuotation = async (data: QuotationInput) => {
  const quotationRef = data.quotationRef || (await generateQuotationRef());

  // Check if quotation with this quotationRef already exists -> update it instead
  const existingByRef = await prisma.quotation.findUnique({
    where: { quotationRef },
  });
  if (existingByRef) {
    return await updateQuotation(existingByRef.id, data);
  }

  // Resolve Inquiry ID if provided
  let resolvedInquiryId: number | null = null;
  let inqRecord = null;
  if (data.inquiryId) {
    const inqIdParsed = typeof data.inquiryId === 'number' ? data.inquiryId : parseInt(String(data.inquiryId), 10);
    if (!isNaN(inqIdParsed)) {
      inqRecord = await prisma.inquiry.findUnique({ where: { id: inqIdParsed } });
    }
    if (!inqRecord && typeof data.inquiryId === 'string') {
      inqRecord = await prisma.inquiry.findUnique({ where: { trackingId: data.inquiryId } });
    }
    if (inqRecord) {
      resolvedInquiryId = inqRecord.id;
      if (inqRecord.status === 'CANCELLED') {
        throw new Error('This inquiry has been cancelled by the customer and cannot proceed to quotation.');
      }
    }
  }

  // Associate user if clientEmail matches existing user, or from inquiry.userId
  let userId = data.userId || inqRecord?.userId || null;
  const clientEmail = data.clientEmail || inqRecord?.clientEmail || '';
  if (!userId && clientEmail) {
    const matchedUser = await prisma.user.findFirst({
      where: { email: { equals: clientEmail, mode: 'insensitive' } },
    });
    if (matchedUser) userId = matchedUser.id;
  }

  const validUntilDate = typeof data.validUntil === 'string' 
    ? new Date(data.validUntil) 
    : data.validUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const eventDateParsed = toEventDateDbValue(data.eventDate);

  const quotationStatus = data.status || 'Quotation Sent';

  // Validate and resolve event times
  const rawAdminStart = data.approvedStartTime ?? data.startTime;
  const rawAdminEnd = data.approvedEndTime ?? data.endTime;
  if (rawAdminStart !== undefined || rawAdminEnd !== undefined) {
    const timeVal = validateEventTimeRange(rawAdminStart, rawAdminEnd, { required: false });
    if (!timeVal.valid) {
      throw new Error(timeVal.message || 'Invalid event time range.');
    }
  }

  const inqTimes = resolveEventTimes({
    requirementsRaw: inqRecord?.requirements || null,
    requestedStartTime: data.requestedStartTime,
    requestedEndTime: data.requestedEndTime,
    approvedStartTime: rawAdminStart,
    approvedEndTime: rawAdminEnd,
  });

  if (quotationStatus !== 'Cancelled' && quotationStatus !== 'Declined' && quotationStatus !== 'Expired') {
    const availability = await checkScheduleAvailability({
      eventDate: eventDateParsed,
      startTime: inqTimes.effectiveStartTime || '17:00',
      endTime: inqTimes.effectiveEndTime || '23:00',
    });
    if (!availability.isAvailable || availability.hasHighConflicts) {
      const errorMsg = availability.conflicts.map(c => c.message).join(' | ');
      throw new Error(`Scheduling conflict detected: ${errorMsg}`);
    }
  }

  const serializedTerms = serializeQuotationTermsWithSchedule(data.terms, {
    requestedStartTime: inqTimes.requestedStartTime,
    requestedEndTime: inqTimes.requestedEndTime,
    approvedStartTime: inqTimes.approvedStartTime || inqTimes.effectiveStartTime,
    approvedEndTime: inqTimes.approvedEndTime || inqTimes.effectiveEndTime,
  });

  const quotation = await prisma.quotation.create({
    data: {
      quotationRef,
      inquiryId: resolvedInquiryId,
      userId,
      clientName: data.clientName || inqRecord?.clientName || 'Valued Client',
      clientEmail,
      clientPhone: data.clientPhone || inqRecord?.clientPhone || null,
      eventType: data.eventType || inqRecord?.eventType || 'Event',
      eventDate: eventDateParsed,
      venue: data.venue || inqRecord?.eventVenue || 'TBD',
      guestCount: Number(data.guestCount) || inqRecord?.guestsCount || 50,
      items: data.items || [],
      subtotal: new Prisma.Decimal(Number(data.subtotal) || 0),
      discounts: data.discounts || [],
      additionalCharges: data.additionalCharges || [],
      grandTotal: new Prisma.Decimal(Number(data.grandTotal) || 0),
      requiredDownpayment: new Prisma.Decimal(Number(data.requiredDownpayment) || Number(data.grandTotal) * 0.5),
      validUntil: validUntilDate,
      validityDays: Number(data.validityDays) || 14,
      status: quotationStatus,
      adminComment: data.adminComment !== undefined ? data.adminComment : null,
      notes: data.notes || inqRecord?.notes || null,
      terms: serializedTerms,
      sentAt: new Date(),
    },
    include: {
      inquiry: true,
      bookings: true,
    },
  });

  // Sync status and approved schedule to the linked inquiry in database (preserving customer's requested time)
  if (resolvedInquiryId && inqRecord) {
    const updatedReqs = updateRequirementsWithSchedule(
      inqRecord.requirements,
      {
        requestedStartTime: inqTimes.requestedStartTime,
        requestedEndTime: inqTimes.requestedEndTime,
        approvedStartTime: inqTimes.approvedStartTime || inqTimes.effectiveStartTime,
        approvedEndTime: inqTimes.approvedEndTime || inqTimes.effectiveEndTime,
      },
      inqRecord.selectedServices,
      inqRecord.packageId
    );
    await prisma.inquiry.update({
      where: { id: resolvedInquiryId },
      data: {
        status: quotationStatus,
        requirements: updatedReqs,
      },
    }).catch(() => {});
  }

  return enrichQuotation(quotation);
};

export const updateQuotation = async (id: number | string, data: Partial<QuotationInput>) => {
  const qId = typeof id === 'string' ? parseInt(id, 10) : id;
  let targetId = qId;

  if (isNaN(qId)) {
    const found = await getQuotationByRef(String(id));
    if (!found) return null;
    targetId = found.id;
  }
  
  const existingQuotation = await prisma.quotation.findUnique({
    where: { id: targetId },
    include: { inquiry: true, bookings: true }
  });
  
  if (existingQuotation?.inquiry?.status === 'CANCELLED') {
    throw new Error('This inquiry has been cancelled by the customer and its quotation cannot be updated or sent.');
  }

  const targetEventDate = data.eventDate !== undefined
    ? toEventDateDbValue(data.eventDate)
    : existingQuotation?.eventDate;
  const targetStatus = data.status !== undefined ? data.status : existingQuotation?.status;
  const ownBookingId = existingQuotation?.bookings?.[0]?.id || null;

  const rawAdminStart = data.approvedStartTime ?? data.startTime;
  const rawAdminEnd = data.approvedEndTime ?? data.endTime;
  if (rawAdminStart !== undefined || rawAdminEnd !== undefined) {
    const timeVal = validateEventTimeRange(rawAdminStart, rawAdminEnd, { required: false });
    if (!timeVal.valid) {
      throw new Error(timeVal.message || 'Invalid event time range.');
    }
  }

  const existingExtracted = extractQuotationScheduleFromTerms(existingQuotation?.terms);
  const resolvedTimes = resolveEventTimes({
    requirementsRaw: existingQuotation?.inquiry?.requirements || null,
    requestedStartTime: data.requestedStartTime || existingExtracted.schedule.requestedStartTime,
    requestedEndTime: data.requestedEndTime || existingExtracted.schedule.requestedEndTime,
    approvedStartTime: rawAdminStart || existingExtracted.schedule.approvedStartTime,
    approvedEndTime: rawAdminEnd || existingExtracted.schedule.approvedEndTime,
  });

  if (
    targetEventDate &&
    targetStatus !== 'Cancelled' &&
    targetStatus !== 'Declined' &&
    targetStatus !== 'Expired'
  ) {
    const availability = await checkScheduleAvailability({
      eventDate: targetEventDate,
      startTime: resolvedTimes.effectiveStartTime || '17:00',
      endTime: resolvedTimes.effectiveEndTime || '23:00',
      excludeBookingId: ownBookingId,
    });
    if (!availability.isAvailable || availability.hasHighConflicts) {
      const errorMsg = availability.conflicts.map(c => c.message).join(' | ');
      throw new Error(`Scheduling conflict detected: ${errorMsg}`);
    }
  }

  const updateData: any = {};
  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
  if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.eventDate !== undefined) updateData.eventDate = targetEventDate;
  if (data.venue !== undefined) updateData.venue = data.venue;
  if (data.guestCount !== undefined) updateData.guestCount = Number(data.guestCount);
  if (data.items !== undefined) updateData.items = data.items;
  if (data.subtotal !== undefined) updateData.subtotal = new Prisma.Decimal(Number(data.subtotal));
  if (data.discounts !== undefined) updateData.discounts = data.discounts;
  if (data.additionalCharges !== undefined) updateData.additionalCharges = data.additionalCharges;
  if (data.grandTotal !== undefined) updateData.grandTotal = new Prisma.Decimal(Number(data.grandTotal));
  if (data.requiredDownpayment !== undefined) updateData.requiredDownpayment = new Prisma.Decimal(Number(data.requiredDownpayment));
  if (data.validUntil !== undefined) updateData.validUntil = typeof data.validUntil === 'string' ? new Date(data.validUntil) : data.validUntil;
  if (data.validityDays !== undefined) updateData.validityDays = Number(data.validityDays);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.adminComment !== undefined) updateData.adminComment = data.adminComment;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (
    data.terms !== undefined ||
    rawAdminStart !== undefined ||
    rawAdminEnd !== undefined ||
    data.requestedStartTime !== undefined ||
    data.requestedEndTime !== undefined
  ) {
    const baseTerms = data.terms !== undefined ? data.terms : existingExtracted.cleanTerms;
    updateData.terms = serializeQuotationTermsWithSchedule(baseTerms, {
      requestedStartTime: resolvedTimes.requestedStartTime,
      requestedEndTime: resolvedTimes.requestedEndTime,
      approvedStartTime: resolvedTimes.approvedStartTime || resolvedTimes.effectiveStartTime,
      approvedEndTime: resolvedTimes.approvedEndTime || resolvedTimes.effectiveEndTime,
    });
  }
  updateData.sentAt = new Date();

  const updated = await prisma.quotation.update({
    where: { id: targetId },
    data: updateData,
    include: { inquiry: true, bookings: true },
  });

  if (updated.inquiryId) {
    const inqUpdateData: any = {};
    if (data.status) inqUpdateData.status = data.status;
    if (existingQuotation?.inquiry) {
      inqUpdateData.requirements = updateRequirementsWithSchedule(
        existingQuotation.inquiry.requirements,
        {
          requestedStartTime: resolvedTimes.requestedStartTime,
          requestedEndTime: resolvedTimes.requestedEndTime,
          approvedStartTime: resolvedTimes.approvedStartTime || resolvedTimes.effectiveStartTime,
          approvedEndTime: resolvedTimes.approvedEndTime || resolvedTimes.effectiveEndTime,
        },
        existingQuotation.inquiry.selectedServices,
        existingQuotation.inquiry.packageId
      );
    }
    if (Object.keys(inqUpdateData).length > 0) {
      await prisma.inquiry.update({
        where: { id: updated.inquiryId },
        data: inqUpdateData,
      }).catch(() => {});
    }
  }

  return enrichQuotation(updated);
};

export const acceptQuotation = async (id: number | string) => {
  const quotation = await getQuotationById(id);
  if (!quotation) return null;

  const ownBookingId = quotation.bookings?.[0]?.id || null;
  const availability = await checkScheduleAvailability({
    eventDate: quotation.eventDate,
    excludeBookingId: ownBookingId,
  });
  if (!availability.isAvailable || availability.hasHighConflicts) {
    const errorMsg = availability.conflicts.map(c => c.message).join(' | ');
    throw new Error(`Scheduling conflict detected: ${errorMsg}`);
  }

  const updated = await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: 'Accepted',
      acceptedAt: new Date(),
    },
  });

  if (updated.inquiryId) {
    await prisma.inquiry.update({
      where: { id: updated.inquiryId },
      data: { status: 'Accepted' },
    }).catch(() => {});
  }

  return enrichQuotation(updated);
};

export const payQuotationDeposit = async (id: number | string) => {
  const quotation = await getQuotationById(id);
  if (!quotation) return null;

  const updated = await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: 'Deposit Paid',
      depositPaidAt: new Date(),
    },
    include: { inquiry: true, bookings: true },
  });

  if (updated.inquiryId) {
    await prisma.inquiry.update({
      where: { id: updated.inquiryId },
      data: { status: 'Deposit Paid' },
    }).catch(() => {});
  }

  return enrichQuotation(updated);
};

export const deleteQuotation = async (id: number | string) => {
  const quotation = await getQuotationById(id);
  if (!quotation) return null;
  const targetId = quotation.id;

  // Unlink any payments quotationId before deletion
  await prisma.paymentTransaction.updateMany({
    where: { quotationId: targetId },
    data: { quotationId: null },
  }).catch(() => {});

  // Unlink any bookings quotationId before deletion
  await prisma.booking.updateMany({
    where: { quotationId: targetId },
    data: { quotationId: null },
  }).catch(() => {});

  return await prisma.quotation.delete({
    where: { id: targetId },
  });
};
