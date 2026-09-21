import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface PaymentInput {
  paymentRef?: string;
  receiptNumber?: string;
  bookingId?: number | null;
  quotationId?: number | null;
  clientName: string;
  clientEmail: string;
  type: string;
  amount: number;
  method: string;
  referenceNumber: string;
  date?: string | Date;
  status?: string;
  verified?: boolean;
  verifiedBy?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
}

export const generatePaymentRef = async (): Promise<string> => {
  let ref = '';
  let isUnique = false;
  const year = new Date().getFullYear();

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    ref = `PAY-${year}-${random}`;
    const existing = await prisma.paymentTransaction.findUnique({
      where: { paymentRef: ref },
    });
    if (!existing) isUnique = true;
  }
  return ref;
};

export const generateReceiptNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OR-${year}-${random}`;
};

export const getPayments = async (limit = 100, offset = 0, search = '') => {
  const where = search
    ? {
        OR: [
          { paymentRef: { contains: search, mode: 'insensitive' as const } },
          { receiptNumber: { contains: search, mode: 'insensitive' as const } },
          { clientName: { contains: search, mode: 'insensitive' as const } },
          { clientEmail: { contains: search, mode: 'insensitive' as const } },
          { referenceNumber: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [payments, total] = await Promise.all([
    prisma.paymentTransaction.findMany({
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
            totalAmount: true,
            status: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quotationRef: true,
            grandTotal: true,
            requiredDownpayment: true,
          },
        },
      },
    }),
    prisma.paymentTransaction.count({ where }),
  ]);

  return { payments, total };
};

export const getPaymentById = async (id: number | string) => {
  const pId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(pId)) {
    return await prisma.paymentTransaction.findUnique({
      where: { paymentRef: String(id) },
      include: {
        booking: true,
        quotation: true,
      },
    });
  }
  return await prisma.paymentTransaction.findUnique({
    where: { id: pId },
    include: {
      booking: true,
      quotation: true,
    },
  });
};

export const getPaymentsByBookingId = async (bookingId: number | string) => {
  const bId = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
  if (isNaN(bId)) return [];
  return await prisma.paymentTransaction.findMany({
    where: { bookingId: bId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getBookingPaymentSummary = async (bookingId: number | string) => {
  const bId = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
  if (isNaN(bId)) return null;

  const booking = await prisma.booking.findUnique({
    where: { id: bId },
    include: {
      payments: true,
    },
  });

  if (!booking) return null;

  const totalPaid = booking.payments
    .filter((p) => p.verified)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalAmount = Number(booking.totalAmount);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = remainingBalance <= 0;

  return {
    bookingId: booking.id,
    bookingRef: booking.bookingRef,
    totalAmount,
    totalPaid,
    remainingBalance,
    isFullyPaid,
    paymentCount: booking.payments.length,
    payments: booking.payments,
  };
};

export const createPaymentTransaction = async (data: PaymentInput) => {
  const paymentRef = data.paymentRef || (await generatePaymentRef());
  const receiptNumber = data.receiptNumber || (await generateReceiptNumber());

  let resolvedBookingId: number | null = null;
  if (data.bookingId) {
    const parsedBId = Number(data.bookingId);
    if (!isNaN(parsedBId)) {
      resolvedBookingId = parsedBId;
    } else {
      const bFound = await prisma.booking.findUnique({ where: { bookingRef: String(data.bookingId) } });
      if (bFound) resolvedBookingId = bFound.id;
    }
  }

  let resolvedQuotationId: number | null = data.quotationId ? Number(data.quotationId) : null;
  if (!resolvedQuotationId && resolvedBookingId) {
    const b = await prisma.booking.findUnique({ where: { id: resolvedBookingId } });
    if (b && b.quotationId) resolvedQuotationId = b.quotationId;
  }

  const paymentDate = data.date ? new Date(data.date) : new Date();
  const isVerified = data.verified === true;
  const initialStatus = data.status || (isVerified ? 'Verified' : 'Pending Verification');

  return await prisma.$transaction(async (tx) => {
    let normalizedProofUrl = data.proofUrl || null;
    if (normalizedProofUrl && normalizedProofUrl.startsWith('/uploads/payments/')) {
      const fn = normalizedProofUrl.replace('/uploads/payments/', '');
      normalizedProofUrl = `/api/payments/proof/${fn}`;
    }

    const payment = await tx.paymentTransaction.create({
      data: {
        paymentRef,
        receiptNumber,
        bookingId: resolvedBookingId,
        quotationId: resolvedQuotationId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        type: data.type,
        amount: new Prisma.Decimal(data.amount),
        method: data.method,
        referenceNumber: data.referenceNumber,
        date: paymentDate,
        status: initialStatus,
        verified: isVerified,
        verifiedBy: data.verifiedBy || (isVerified ? 'Admin Staff' : null),
        verifiedAt: isVerified ? new Date() : null,
        proofUrl: normalizedProofUrl,
        notes: data.notes || null,
      },
    });

    if (isVerified) {
      const isFull = data.type.includes('Full') || data.type.includes('Settlement');
      const isDown = data.type.includes('Downpayment');

      let resolvedQuotationRecord = null;
      if (resolvedQuotationId && (isDown || isFull)) {
        const q = await tx.quotation.update({
          where: { id: resolvedQuotationId },
          data: {
            status: isFull ? 'Confirmed' : 'Deposit Paid',
            depositPaidAt: new Date(),
            confirmedAt: isFull ? new Date() : undefined,
          },
        });
        resolvedQuotationRecord = q;
        if (q.inquiryId) {
          await tx.inquiry.update({
            where: { id: q.inquiryId },
            data: { status: isFull ? 'Confirmed' : 'Deposit Paid' },
          }).catch(() => {});
        }
      }

      let activeBookingId = resolvedBookingId;

      if (!activeBookingId && resolvedQuotationId && (isDown || isFull)) {
        const existingForQuote = await tx.booking.findFirst({
          where: { quotationId: resolvedQuotationId },
        });
        if (existingForQuote) {
          activeBookingId = existingForQuote.id;
          await tx.paymentTransaction.update({
            where: { id: payment.id },
            data: { bookingId: existingForQuote.id },
          });
        } else if (resolvedQuotationRecord) {
          const year = new Date().getFullYear();
          const random = Math.floor(1000 + Math.random() * 9000);
          const bookingRef = `BK-${year}-${random}`;
          const eventDateParsed = resolvedQuotationRecord.eventDate;

          const createdBooking = await tx.booking.create({
            data: {
              bookingRef,
              userId: resolvedQuotationRecord.userId,
              inquiryId: resolvedQuotationRecord.inquiryId,
              quotationId: resolvedQuotationRecord.id,
              clientName: resolvedQuotationRecord.clientName,
              clientEmail: resolvedQuotationRecord.clientEmail,
              clientPhone: resolvedQuotationRecord.clientPhone || '0900-000-0000',
              eventTitle: `${resolvedQuotationRecord.clientName}'s ${resolvedQuotationRecord.eventType}`,
              eventType: resolvedQuotationRecord.eventType,
              eventDate: eventDateParsed,
              startTime: '17:00',
              endTime: '23:00',
              venue: resolvedQuotationRecord.venue,
              guestCount: resolvedQuotationRecord.guestCount || 100,
              totalAmount: resolvedQuotationRecord.grandTotal,
              status: 'Confirmed',
              notes: resolvedQuotationRecord.notes,
              confirmedAt: new Date(),
            },
          });

          await tx.eventSchedule.create({
            data: {
              bookingId: createdBooking.id,
              eventDate: eventDateParsed,
              startTime: '17:00',
              endTime: '23:00',
              venue: resolvedQuotationRecord.venue,
              status: 'Active',
            },
          });

          await tx.paymentTransaction.update({
            where: { id: payment.id },
            data: { bookingId: createdBooking.id },
          });

          activeBookingId = createdBooking.id;
        }
      }

      if (activeBookingId && (isDown || isFull)) {
        const currentB = await tx.booking.findUnique({ where: { id: activeBookingId } });
        if (currentB && currentB.status !== 'Completed') {
          await tx.booking.update({
            where: { id: activeBookingId },
            data: {
              status: 'Confirmed',
              confirmedAt: currentB.confirmedAt || new Date(),
            },
          });
        }
      }
    }

    return payment;
  });
};

export const verifyPaymentTransaction = async (id: number | string, verifiedBy: string) => {
  const pId = typeof id === 'string' ? parseInt(id, 10) : id;
  const lookupByRef = isNaN(pId) ? String(id) : undefined;

  return await prisma.$transaction(async (tx) => {
    const existing = lookupByRef
      ? await tx.paymentTransaction.findUnique({ where: { paymentRef: lookupByRef } })
      : await tx.paymentTransaction.findUnique({ where: { id: pId } });

    if (!existing) return null;
    const targetId = existing.id;

    const payment = await tx.paymentTransaction.update({
      where: { id: targetId },
      data: {
        status: 'Verified',
        verified: true,
        verifiedBy,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    const isFull = payment.type.includes('Full') || payment.type.includes('Settlement');
    const isDown = payment.type.includes('Downpayment');

    if (isDown || isFull) {
      let resolvedQuotationRecord = null;
      if (payment.quotationId) {
        const q = await tx.quotation.update({
          where: { id: payment.quotationId },
          data: {
            status: isFull ? 'Confirmed' : 'Deposit Paid',
            depositPaidAt: new Date(),
            confirmedAt: isFull ? new Date() : undefined,
          },
        });
        resolvedQuotationRecord = q;
        if (q.inquiryId) {
          await tx.inquiry.update({
            where: { id: q.inquiryId },
            data: { status: isFull ? 'Confirmed' : 'Deposit Paid' },
          }).catch(() => {});
        }
      }

      let activeBookingId = payment.bookingId;

      // If no booking exists yet for this quotation, check if one exists in database
      if (!activeBookingId && payment.quotationId) {
        const existingForQuote = await tx.booking.findFirst({
          where: { quotationId: payment.quotationId },
        });
        if (existingForQuote) {
          activeBookingId = existingForQuote.id;
          await tx.paymentTransaction.update({
            where: { id: payment.id },
            data: { bookingId: existingForQuote.id },
          });
        } else if (resolvedQuotationRecord) {
          // Auto-generate confirmed booking from quotation upon verified deposit
          const year = new Date().getFullYear();
          const random = Math.floor(1000 + Math.random() * 9000);
          const bookingRef = `BK-${year}-${random}`;
          const eventDateParsed = resolvedQuotationRecord.eventDate;

          const createdBooking = await tx.booking.create({
            data: {
              bookingRef,
              userId: resolvedQuotationRecord.userId,
              inquiryId: resolvedQuotationRecord.inquiryId,
              quotationId: resolvedQuotationRecord.id,
              clientName: resolvedQuotationRecord.clientName,
              clientEmail: resolvedQuotationRecord.clientEmail,
              clientPhone: resolvedQuotationRecord.clientPhone || '0900-000-0000',
              eventTitle: `${resolvedQuotationRecord.clientName}'s ${resolvedQuotationRecord.eventType}`,
              eventType: resolvedQuotationRecord.eventType,
              eventDate: eventDateParsed,
              startTime: '17:00',
              endTime: '23:00',
              venue: resolvedQuotationRecord.venue,
              guestCount: resolvedQuotationRecord.guestCount || 100,
              totalAmount: resolvedQuotationRecord.grandTotal,
              status: 'Confirmed',
              notes: resolvedQuotationRecord.notes,
              confirmedAt: new Date(),
            },
          });

          await tx.eventSchedule.create({
            data: {
              bookingId: createdBooking.id,
              eventDate: eventDateParsed,
              startTime: '17:00',
              endTime: '23:00',
              venue: resolvedQuotationRecord.venue,
              status: 'Active',
            },
          });

          // Link payment transaction to new booking
          await tx.paymentTransaction.update({
            where: { id: payment.id },
            data: { bookingId: createdBooking.id },
          });

          activeBookingId = createdBooking.id;
        }
      }

      if (activeBookingId) {
        const currentB = await tx.booking.findUnique({ where: { id: activeBookingId } });
        if (currentB && currentB.status !== 'Completed') {
          await tx.booking.update({
            where: { id: activeBookingId },
            data: {
              status: 'Confirmed',
              confirmedAt: currentB.confirmedAt || new Date(),
            },
          });
        }
      }
    }

    return payment;
  });
};

export const rejectPaymentTransaction = async (
  id: number | string,
  rejectedBy: string,
  rejectionReason: string
) => {
  const pId = typeof id === 'string' ? parseInt(id, 10) : id;
  const lookupByRef = isNaN(pId) ? String(id) : undefined;

  return await prisma.$transaction(async (tx) => {
    const existing = lookupByRef
      ? await tx.paymentTransaction.findUnique({ where: { paymentRef: lookupByRef } })
      : await tx.paymentTransaction.findUnique({ where: { id: pId } });

    if (!existing) return null;
    const targetId = existing.id;

    const payment = await tx.paymentTransaction.update({
      where: { id: targetId },
      data: {
        status: 'Rejected',
        verified: false,
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });

    if (payment.quotationId) {
      const q = await tx.quotation.findUnique({ where: { id: payment.quotationId } });
      if (q && q.status !== 'Confirmed') {
        await tx.quotation.update({
          where: { id: payment.quotationId },
          data: { status: 'Accepted' },
        });
        if (q.inquiryId) {
          await tx.inquiry.update({
            where: { id: q.inquiryId },
            data: { status: 'Accepted' },
          }).catch(() => {});
        }
      }
    }

    return payment;
  });
};

export const deletePaymentTransaction = async (id: number | string) => {
  const pId = typeof id === 'string' ? parseInt(id, 10) : id;
  const lookupByRef = isNaN(pId) ? String(id) : undefined;

  const payment = lookupByRef
    ? await prisma.paymentTransaction.findUnique({ where: { paymentRef: lookupByRef } })
    : await prisma.paymentTransaction.findUnique({ where: { id: pId } });

  if (!payment) return null;

  return await prisma.paymentTransaction.delete({
    where: { id: payment.id },
  });
};
