import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface QuotationInput {
  quotationRef?: string;
  inquiryId?: number | null;
  userId?: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  eventType: string;
  eventDate: string | Date;
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

export const getQuotations = async (limit = 100, offset = 0, search = '') => {
  const where = search
    ? {
        OR: [
          { quotationRef: { contains: search, mode: 'insensitive' as const } },
          { clientName: { contains: search, mode: 'insensitive' as const } },
          { clientEmail: { contains: search, mode: 'insensitive' as const } },
          { eventType: { contains: search, mode: 'insensitive' as const } },
          { venue: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

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
          select: { id: true, bookingRef: true, status: true },
        },
        payments: true,
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return { quotations, total };
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

  return found;
};

export const getQuotationByRef = async (quotationRef: string): Promise<QuotationWithRelations | null> => {
  const ref = quotationRef.trim();
  return await prisma.quotation.findFirst({
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
};

export const getQuotationsByUserEmail = async (email: string) => {
  return await prisma.quotation.findMany({
    where: { clientEmail: { equals: email, mode: 'insensitive' as const } },
    orderBy: { createdAt: 'desc' },
    include: {
      inquiry: true,
      bookings: true,
      payments: true,
    },
  });
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

  const eventDateParsed = typeof data.eventDate === 'string' 
    ? new Date(data.eventDate) 
    : data.eventDate;

  const quotationStatus = data.status || 'Quotation Sent';

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
      notes: data.notes || inqRecord?.notes || null,
      terms: data.terms || [
        '50% Non-refundable Reservation Downpayment required to lock event calendar & production crew.',
        'Remaining 50% balance must be settled 3 days prior to the target ingress date.',
        'Inclement weather postponement requires minimum 7 days advance notice with zero penalty.',
        'Food & Beverage guest count buffer of +10% included in operational provisions.'
      ],
      sentAt: new Date(),
    },
  });

  // Sync status to the linked inquiry in database
  if (resolvedInquiryId) {
    await prisma.inquiry.update({
      where: { id: resolvedInquiryId },
      data: { status: quotationStatus },
    }).catch(() => {});
  }

  return quotation;
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
    include: { inquiry: true }
  });
  
  if (existingQuotation?.inquiry?.status === 'CANCELLED') {
    throw new Error('This inquiry has been cancelled by the customer and its quotation cannot be updated or sent.');
  }

  const updateData: any = {};
  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
  if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.eventDate !== undefined) updateData.eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
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
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.terms !== undefined) updateData.terms = data.terms;
  updateData.sentAt = new Date();

  const updated = await prisma.quotation.update({
    where: { id: targetId },
    data: updateData,
  });

  if (updated.inquiryId && data.status) {
    await prisma.inquiry.update({
      where: { id: updated.inquiryId },
      data: { status: data.status },
    }).catch(() => {});
  }

  return updated;
};

export const acceptQuotation = async (id: number | string) => {
  const quotation = await getQuotationById(id);
  if (!quotation) return null;

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

  return updated;
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
  });

  if (updated.inquiryId) {
    await prisma.inquiry.update({
      where: { id: updated.inquiryId },
      data: { status: 'Deposit Paid' },
    }).catch(() => {});
  }

  return updated;
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
