import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import {
  checkScheduleAvailability,
  INTERACTIVE_TX_OPTIONS,
  normalizeEventDateStr,
  toEventDateDbValue,
} from '../lib/schedulingEngine';
import {
  extractSafeProofFilename,
  normalizeProofUrlReference,
} from '../lib/paymentProofStorage';
import { enrichQuotation } from './quotationModel';

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

  let resolvedQuotationId: number | null = null;
  if (data.quotationId) {
    const parsedQId = Number(data.quotationId);
    if (!isNaN(parsedQId)) {
      resolvedQuotationId = parsedQId;
    } else {
      const qFound = await prisma.quotation.findUnique({ where: { quotationRef: String(data.quotationId) } });
      if (qFound) resolvedQuotationId = qFound.id;
    }
  }
  if (!resolvedQuotationId && resolvedBookingId) {
    const b = await prisma.booking.findUnique({ where: { id: resolvedBookingId } });
    if (b && b.quotationId) resolvedQuotationId = b.quotationId;
  }

  const paymentDate = data.date ? new Date(data.date) : new Date();
  const isVerified = data.verified === true;
  const initialStatus = data.status || (isVerified ? 'Verified' : 'Pending Verification');
  const isFull = data.type.includes('Full') || data.type.includes('Settlement');
  const isDown = data.type.includes('Downpayment');

  // Pre-fetch booking and quotation outside the transaction to minimize interactive transaction duration
  let preFetchedBooking = resolvedBookingId
    ? await prisma.booking.findUnique({ where: { id: resolvedBookingId } })
    : null;
  if (!preFetchedBooking && resolvedQuotationId) {
    preFetchedBooking = await prisma.booking.findFirst({
      where: { quotationId: resolvedQuotationId },
    });
    if (preFetchedBooking) {
      resolvedBookingId = preFetchedBooking.id;
    }
  }
  const rawPreFetchedQuotation = resolvedQuotationId
    ? await prisma.quotation.findUnique({
        where: { id: resolvedQuotationId },
        include: { inquiry: true, bookings: true },
      })
    : null;
  const preFetchedQuotation = enrichQuotation(rawPreFetchedQuotation);
  const resolvedCreateStartTime =
    preFetchedBooking?.startTime || (preFetchedQuotation as any)?.startTime || '17:00';
  const resolvedCreateEndTime =
    preFetchedBooking?.endTime || (preFetchedQuotation as any)?.endTime || '23:00';

  return await prisma.$transaction(async (tx) => {
    const normalizedProofUrl = normalizeProofUrlReference(data.proofUrl);
    const safeFilename = normalizedProofUrl
      ? extractSafeProofFilename(normalizedProofUrl)
      : null;

    // 1. Atomic proof-consumption lock & check: prevent concurrent reuse of the same proof image
    if (safeFilename) {
      const proofLockKey = `jad_proof_${safeFilename}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${proofLockKey}))`;

      const existingWithProof = await tx.paymentTransaction.findFirst({
        where: {
          proofUrl: {
            contains: safeFilename,
          },
        },
        select: { id: true },
      });

      if (existingWithProof) {
        throw new Error(
          'Conflict: This payment proof image has already been used for a payment submission. Please upload a new payment receipt.'
        );
      }
    }

    // 2. Atomic duplicate Pending Verification check for customer submissions
    if (!isVerified && (resolvedQuotationId || resolvedBookingId)) {
      const targetLockKey = `jad_pay_target_q${resolvedQuotationId || 0}_b${resolvedBookingId || 0}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${targetLockKey}))`;

      const targetConditions: Prisma.PaymentTransactionWhereInput[] = [];
      if (resolvedQuotationId) targetConditions.push({ quotationId: resolvedQuotationId });
      if (resolvedBookingId) targetConditions.push({ bookingId: resolvedBookingId });

      const existingPending = await tx.paymentTransaction.findFirst({
        where: {
          OR: targetConditions,
          verified: false,
          status: 'Pending Verification',
        },
        select: { id: true },
      });

      if (existingPending) {
        throw new Error('Conflict: A payment proof is already pending verification.');
      }
    }

    let activeBookingId = resolvedBookingId;

    if (isVerified && (isDown || isFull)) {
      const targetEventDate = preFetchedBooking?.eventDate || preFetchedQuotation?.eventDate;
      if (targetEventDate) {
        const dateStr = normalizeEventDateStr(targetEventDate);
        const lockKey = `jad_date_lock_${dateStr}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        const availabilityCheck = await checkScheduleAvailability({
          eventDate: toEventDateDbValue(dateStr),
          startTime: resolvedCreateStartTime,
          endTime: resolvedCreateEndTime,
          venue: preFetchedBooking?.venue || preFetchedQuotation?.venue || '',
          excludeBookingId: activeBookingId || null,
          client: tx,
        });

        if (!availabilityCheck.isAvailable || availabilityCheck.hasHighConflicts) {
          const errorMsg = availabilityCheck.conflicts.map(c => c.message).join(' | ');
          throw new Error(`Scheduling conflict detected: ${errorMsg}`);
        }
      }

      let resolvedQuotationRecord = preFetchedQuotation;
      if (resolvedQuotationId) {
        const updatedQuote = await tx.quotation.update({
          where: { id: resolvedQuotationId },
          data: {
            status: isFull ? 'Confirmed' : 'Deposit Paid',
            depositPaidAt: new Date(),
            confirmedAt: isFull ? new Date() : undefined,
          },
        });
        resolvedQuotationRecord = preFetchedQuotation
          ? { ...preFetchedQuotation, ...updatedQuote }
          : (updatedQuote as any);
        if (updatedQuote.inquiryId) {
          await tx.inquiry.update({
            where: { id: updatedQuote.inquiryId },
            data: { status: isFull ? 'Confirmed' : 'Deposit Paid' },
          }).catch(() => {});
        }
      }

      if (!activeBookingId && resolvedQuotationRecord) {
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const bookingRef = `BK-${year}-${random}`;
        const eventDateParsed = toEventDateDbValue(resolvedQuotationRecord.eventDate);

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
            startTime: resolvedCreateStartTime,
            endTime: resolvedCreateEndTime,
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
            startTime: resolvedCreateStartTime,
            endTime: resolvedCreateEndTime,
            venue: resolvedQuotationRecord.venue,
            status: 'Active',
          },
        });

        activeBookingId = createdBooking.id;
      } else if (activeBookingId && preFetchedBooking && preFetchedBooking.status !== 'Completed') {
        await tx.booking.update({
          where: { id: activeBookingId },
          data: {
            status: 'Confirmed',
            confirmedAt: preFetchedBooking.confirmedAt || new Date(),
          },
        });
        await tx.eventSchedule.updateMany({
          where: { bookingId: activeBookingId },
          data: { status: 'Active' },
        });
      }
    }

    const payment = await tx.paymentTransaction.create({
      data: {
        paymentRef,
        receiptNumber,
        bookingId: activeBookingId,
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

    return payment;
  }, INTERACTIVE_TX_OPTIONS);
};

export const verifyPaymentTransaction = async (id: number | string, verifiedBy: string) => {
  const pId = typeof id === 'string' ? parseInt(id, 10) : id;
  const lookupByRef = isNaN(pId) ? String(id) : undefined;

  // Pre-fetch payment, linked booking, and linked quotation before opening the interactive transaction
  const existing = lookupByRef
    ? await prisma.paymentTransaction.findUnique({
        where: { paymentRef: lookupByRef },
        include: { booking: true, quotation: { include: { bookings: true, inquiry: true } } },
      })
    : await prisma.paymentTransaction.findUnique({
        where: { id: pId },
        include: { booking: true, quotation: { include: { bookings: true, inquiry: true } } },
      });

  if (!existing) return null;
  const targetId = existing.id;
  const isFull = existing.type.includes('Full') || existing.type.includes('Settlement');
  const isDown = existing.type.includes('Downpayment');

  const existingBookingRecord =
    existing.booking ||
    (existing.quotation?.bookings && existing.quotation.bookings.length > 0
      ? existing.quotation.bookings[0]
      : null);
  const quoteForDate = enrichQuotation(existing.quotation || null);
  const resolvedVerifyStartTime =
    existingBookingRecord?.startTime || (quoteForDate as any)?.startTime || '17:00';
  const resolvedVerifyEndTime =
    existingBookingRecord?.endTime || (quoteForDate as any)?.endTime || '23:00';

  return await prisma.$transaction(async (tx) => {
    let activeBookingId = existing.bookingId || existingBookingRecord?.id || null;

    if (isDown || isFull) {
      const targetEventDate = existingBookingRecord?.eventDate || quoteForDate?.eventDate;
      if (targetEventDate) {
        const dateStr = normalizeEventDateStr(targetEventDate);
        const lockKey = `jad_date_lock_${dateStr}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        const availabilityCheck = await checkScheduleAvailability({
          eventDate: toEventDateDbValue(dateStr),
          startTime: resolvedVerifyStartTime,
          endTime: resolvedVerifyEndTime,
          venue: existingBookingRecord?.venue || quoteForDate?.venue || '',
          excludeBookingId: activeBookingId || null,
          client: tx,
        });

        if (!availabilityCheck.isAvailable || availabilityCheck.hasHighConflicts) {
          const errorMsg = availabilityCheck.conflicts.map(c => c.message).join(' | ');
          throw new Error(`Scheduling conflict detected: ${errorMsg}`);
        }
      }

      let resolvedQuotationRecord = quoteForDate;
      if (existing.quotationId) {
        resolvedQuotationRecord = await tx.quotation.update({
          where: { id: existing.quotationId },
          data: {
            status: isFull ? 'Confirmed' : 'Deposit Paid',
            depositPaidAt: new Date(),
            confirmedAt: isFull ? new Date() : undefined,
          },
        }) as any;
        if (resolvedQuotationRecord?.inquiryId) {
          await tx.inquiry.update({
            where: { id: resolvedQuotationRecord.inquiryId },
            data: { status: isFull ? 'Confirmed' : 'Deposit Paid' },
          }).catch(() => {});
        }
      }

      if (!activeBookingId && resolvedQuotationRecord) {
        // Auto-generate confirmed booking from quotation upon verified deposit
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const bookingRef = `BK-${year}-${random}`;
        const eventDateParsed = toEventDateDbValue(resolvedQuotationRecord.eventDate);

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
            startTime: resolvedVerifyStartTime,
            endTime: resolvedVerifyEndTime,
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
            startTime: resolvedVerifyStartTime,
            endTime: resolvedVerifyEndTime,
            venue: resolvedQuotationRecord.venue,
            status: 'Active',
          },
        });

        activeBookingId = createdBooking.id;
      } else if (activeBookingId && existingBookingRecord && existingBookingRecord.status !== 'Completed') {
        await tx.booking.update({
          where: { id: activeBookingId },
          data: {
            status: 'Confirmed',
            confirmedAt: existingBookingRecord.confirmedAt || new Date(),
          },
        });
        await tx.eventSchedule.updateMany({
          where: { bookingId: activeBookingId },
          data: { status: 'Active' },
        });
      }
    }

    const payment = await tx.paymentTransaction.update({
      where: { id: targetId },
      data: {
        bookingId: activeBookingId,
        status: 'Verified',
        verified: true,
        verifiedBy,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    return payment;
  }, INTERACTIVE_TX_OPTIONS);
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
  }, INTERACTIVE_TX_OPTIONS);
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
