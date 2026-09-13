import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { checkScheduleAvailability } from '../lib/schedulingEngine';

export interface BookingInput {
  bookingRef?: string;
  userId?: number | null;
  inquiryId?: number | null;
  quotationId?: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventTitle: string;
  eventType: string;
  eventDate: string | Date;
  startTime?: string;
  endTime?: string;
  venue: string;
  guestCount: number;
  totalAmount: number;
  status?: string;
  notes?: string | null;
  assignedStaff?: Array<{ id: number | string; role?: string }>;
  assignedServices?: Array<{ id?: number | string; serviceId?: number | null; serviceCode?: string; name: string; price: number }>;
  assignedPackages?: Array<{ id?: number | string; packageId?: number | null; packageCode?: string; name: string; price: number }>;
  assignedEquipment?: Array<{ resourceId: number | string; quantity: number }>;
}

export const generateBookingRef = async (): Promise<string> => {
  let ref = '';
  let isUnique = false;
  const year = new Date().getFullYear();

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    ref = `BK-${year}-${random}`;
    const existing = await prisma.booking.findUnique({
      where: { bookingRef: ref },
    });
    if (!existing) isUnique = true;
  }
  return ref;
};

export const getBookings = async (
  limit = 100,
  offset = 0,
  statusFilter = 'ALL',
  search = ''
) => {
  const where: Prisma.BookingWhereInput = {};

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { bookingRef: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { clientEmail: { contains: search, mode: 'insensitive' } },
      { eventTitle: { contains: search, mode: 'insensitive' } },
      { venue: { contains: search, mode: 'insensitive' } },
      { eventType: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { eventDate: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        quotation: true,
        schedule: true,
        bookingServices: {
          include: { service: true },
        },
        bookingPackages: {
          include: { package: true },
        },
        bookingStaff: {
          include: { staff: true },
        },
        bookingResources: {
          include: { resource: true },
        },
        payments: true,
        feedback: true,
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total };
};

export const getBookingById = async (id: number | string) => {
  const bId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(bId)) return null;

  return await prisma.booking.findUnique({
    where: { id: bId },
    include: {
      user: true,
      inquiry: true,
      quotation: true,
      schedule: true,
      bookingServices: {
        include: { service: true },
      },
      bookingPackages: {
        include: { package: true },
      },
      bookingStaff: {
        include: { staff: true },
      },
      bookingResources: {
        include: { resource: true },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      feedback: true,
    },
  });
};

export const getBookingByRef = async (bookingRef: string) => {
  return await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      user: true,
      inquiry: true,
      quotation: true,
      schedule: true,
      bookingServices: {
        include: { service: true },
      },
      bookingPackages: {
        include: { package: true },
      },
      bookingStaff: {
        include: { staff: true },
      },
      bookingResources: {
        include: { resource: true },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

export const getBookingsByUserEmail = async (email: string) => {
  return await prisma.booking.findMany({
    where: { clientEmail: email },
    orderBy: { eventDate: 'asc' },
    include: {
      schedule: true,
      bookingServices: true,
      bookingPackages: true,
      bookingStaff: {
        include: { staff: true },
      },
      bookingResources: {
        include: { resource: true },
      },
      payments: true,
    },
  });
};

export const createBooking = async (data: BookingInput) => {
  const bookingRef = data.bookingRef || (await generateBookingRef());
  const eventDateParsed = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
  const startTime = data.startTime || '17:00';
  const endTime = data.endTime || '23:00';
  const dateStr = eventDateParsed.toISOString().split('T')[0];

  return await prisma.$transaction(async (tx) => {
    // 1. Transaction Advisory Lock on target event date to serialize concurrent booking creations
    const lockKey = `jad_date_lock_${dateStr}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    // 2. Validate Quotation
    let qRecord: any = null;
    if (data.quotationId) {
      const qIdParsed = typeof data.quotationId === 'number' ? data.quotationId : parseInt(String(data.quotationId), 10);
      if (!isNaN(qIdParsed)) {
        qRecord = await tx.quotation.findUnique({ where: { id: qIdParsed } });
      }
      if (!qRecord && typeof data.quotationId === 'string') {
        qRecord = await tx.quotation.findUnique({ where: { quotationRef: data.quotationId } });
      }
      if (!qRecord) {
        throw new Error(`Quotation #${data.quotationId} does not exist`);
      }
      if (qRecord.status === 'Cancelled' || qRecord.status === 'Declined' || qRecord.status === 'Expired') {
        throw new Error(`Cannot create a booking from a ${qRecord.status.toLowerCase()} quotation`);
      }

      const existingBooking = await tx.booking.findFirst({
        where: { quotationId: qRecord.id },
      });
      if (existingBooking) {
        return existingBooking;
      }
    }

    // 2b. Validate and Resolve Inquiry
    let resolvedInquiryId: number | null = null;
    let inqRecord: any = null;

    if (data.inquiryId) {
      const inqIdParsed = typeof data.inquiryId === 'number' ? data.inquiryId : parseInt(String(data.inquiryId), 10);
      if (!isNaN(inqIdParsed)) {
        inqRecord = await tx.inquiry.findUnique({
          where: { id: inqIdParsed },
          include: { quotations: true },
        });
      }
      if (!inqRecord && typeof data.inquiryId === 'string') {
        inqRecord = await tx.inquiry.findUnique({
          where: { trackingId: data.inquiryId },
          include: { quotations: true },
        });
      }

      if (inqRecord) {
        resolvedInquiryId = inqRecord.id;
      } else if (qRecord?.inquiryId) {
        resolvedInquiryId = qRecord.inquiryId;
      } else {
        throw new Error(`Inquiry #${data.inquiryId} does not exist in database`);
      }

      // Check for inquiry and quotation mismatch
      if (qRecord?.inquiryId && resolvedInquiryId && qRecord.inquiryId !== resolvedInquiryId) {
        throw new Error(`Quotation #${qRecord.quotationRef || qRecord.id} is associated with Inquiry #${qRecord.inquiryId}, which does not match requested Inquiry #${resolvedInquiryId}`);
      }

      // If quotation wasn't explicitly provided, find linked quotation for this inquiry
      if (!qRecord && inqRecord?.quotations && inqRecord.quotations.length > 0) {
        qRecord = inqRecord.quotations.find((q: any) => q.status !== 'Cancelled' && q.status !== 'Declined' && q.status !== 'Expired') || inqRecord.quotations[0] || null;
      }

      // Check prerequisite 1: An official quotation must exist
      if (!qRecord) {
        throw new Error(`Cannot convert inquiry to booking: An official quotation must be created and sent to the customer first.`);
      }

      // Check prerequisite 2: Quotation must have been accepted by customer
      if (qRecord.status === 'Draft' || qRecord.status === 'Quotation Sent') {
        throw new Error(`Cannot convert inquiry to booking: Quotation #${qRecord.quotationRef || qRecord.id} has not been accepted by the customer yet.`);
      }

      // Check prerequisite 3: Customer must have submitted reservation downpayment AND it must be verified by an administrator
      const isDepositSettled = qRecord.status === 'Deposit Paid' || qRecord.status === 'Confirmed' || inqRecord?.status === 'Deposit Paid' || inqRecord?.status === 'Confirmed';
      const paymentsForQuote = await tx.paymentTransaction.findMany({
        where: { quotationId: qRecord.id },
      });

      if (!isDepositSettled && paymentsForQuote.length === 0) {
        throw new Error(`Cannot convert inquiry to booking: The 50% reservation downpayment must be submitted and verified before confirming the booking.`);
      }

      const verifiedPayments = paymentsForQuote.filter(p => p.verified);
      const pendingPayments = paymentsForQuote.filter(p => p.status === 'Pending Verification' && !p.verified);

      if (!isDepositSettled && verifiedPayments.length === 0 && pendingPayments.length > 0) {
        throw new Error(`Cannot convert inquiry to booking: The 50% reservation downpayment proof has been submitted but is pending administrator verification. Please review and verify the payment proof first.`);
      }

      // Auto-match services and package from inquiry if not explicitly passed
      if ((!data.assignedServices || data.assignedServices.length === 0) && inqRecord.selectedServices) {
        data.assignedServices = Array.isArray(inqRecord.selectedServices) ? inqRecord.selectedServices : [];
      }
      if ((!data.assignedPackages || data.assignedPackages.length === 0) && inqRecord.packageId) {
        data.assignedPackages = [inqRecord.packageId];
      }
    } else if (qRecord?.inquiryId) {
      resolvedInquiryId = qRecord.inquiryId;
    }

    // 3. User association
    let userId = data.userId || qRecord?.userId || null;
    if (!userId && data.clientEmail) {
      const matchedUser = await tx.user.findUnique({
        where: { email: data.clientEmail },
      });
      if (matchedUser) userId = matchedUser.id;
    }

    // 4. Parse Staff IDs
    const staffAssignments: Array<{ staffId: number; role?: string }> = [];
    if (data.assignedStaff && Array.isArray(data.assignedStaff)) {
      for (const s of data.assignedStaff) {
        const staffCode = typeof s.id === 'string' ? s.id : `st-${s.id}`;
        let foundStaff = await tx.staff.findUnique({ where: { staffCode } });
        if (!foundStaff) {
          const numId = typeof s.id === 'number' ? s.id : parseInt(String(s.id).replace(/\D/g, ''), 10);
          if (!isNaN(numId) && numId > 0) {
            foundStaff = await tx.staff.findUnique({ where: { id: numId } });
          }
        }
        if (!foundStaff && (s as any).name) {
          foundStaff = await tx.staff.findFirst({ where: { name: { equals: String((s as any).name), mode: 'insensitive' } } });
        }
        if (foundStaff) {
          staffAssignments.push({ staffId: foundStaff.id, role: s.role || foundStaff.role });
        }
      }
    }

    // 5. Parse Equipment Resources
    const equipmentAssignments: Array<{ resourceId: number; quantity: number }> = [];
    if (data.assignedEquipment && Array.isArray(data.assignedEquipment)) {
      for (const eq of data.assignedEquipment) {
        const resCode = typeof eq.resourceId === 'string' ? eq.resourceId : `eq-${eq.resourceId}`;
        let foundResource = await tx.equipmentResource.findUnique({ where: { resourceCode: resCode } });
        if (!foundResource) {
          const numId = typeof eq.resourceId === 'number' ? eq.resourceId : parseInt(String(eq.resourceId).replace(/\D/g, ''), 10);
          if (!isNaN(numId) && numId > 0) {
            foundResource = await tx.equipmentResource.findUnique({ where: { id: numId } });
          }
        }
        if (foundResource) {
          equipmentAssignments.push({ resourceId: foundResource.id, quantity: Number(eq.quantity) || 1 });
        }
      }
    }

    // 6. Verify availability and detect conflicts inside transaction
    if (data.status !== 'Cancelled') {
      const availabilityCheck = await checkScheduleAvailability({
        eventDate: eventDateParsed,
        startTime,
        endTime,
        venue: data.venue,
        requestedStaffIds: staffAssignments.map(s => s.staffId),
        requestedResourceAllocations: equipmentAssignments,
        client: tx,
      });

      if (availabilityCheck.hasHighConflicts) {
        const errorMsg = availabilityCheck.conflicts.map(c => c.message).join(' | ');
        throw new Error(`Scheduling conflict detected: ${errorMsg}`);
      }
    }

    // 7. Insert Booking
    const booking = await tx.booking.create({
      data: {
        bookingRef,
        userId,
        inquiryId: resolvedInquiryId,
        quotationId: qRecord ? qRecord.id : (data.quotationId ? Number(data.quotationId) : null),
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone || '0900-000-0000',
        eventTitle: data.eventTitle,
        eventType: data.eventType,
        eventDate: eventDateParsed,
        startTime,
        endTime,
        venue: data.venue,
        guestCount: Number(data.guestCount) || 100,
        totalAmount: new Prisma.Decimal(Number(data.totalAmount) || 0),
        status: data.status || 'Confirmed',
        notes: data.notes || null,
        confirmedAt: data.status === 'Confirmed' ? new Date() : null,
      },
    });

    await tx.eventSchedule.create({
      data: {
        bookingId: booking.id,
        eventDate: eventDateParsed,
        startTime,
        endTime,
        venue: data.venue,
        status: booking.status === 'Cancelled' ? 'Cancelled' : 'Active',
      },
    });

    if (staffAssignments.length > 0) {
      for (const s of staffAssignments) {
        await tx.bookingStaff.create({
          data: {
            bookingId: booking.id,
            staffId: s.staffId,
            role: s.role || null,
          },
        });
      }
    }

    if (equipmentAssignments.length > 0) {
      for (const eq of equipmentAssignments) {
        await tx.bookingResource.create({
          data: {
            bookingId: booking.id,
            resourceId: eq.resourceId,
            quantity: eq.quantity,
          },
        });
      }
    }

    if (data.assignedServices && Array.isArray(data.assignedServices)) {
      for (const s of data.assignedServices) {
        const sCodeStr = typeof s === 'string' ? s : (s.serviceCode || (s.id ? String(s.id) : ''));
        let sName = (typeof s === 'object' && s.name) ? s.name : '';
        let sPrice = (typeof s === 'object' && s.price) ? Number(s.price) : 0;
        let sDbId: number | null = (typeof s === 'object' && s.serviceId) ? Number(s.serviceId) : null;

        if (!sName && sCodeStr) {
          const numId = parseInt(sCodeStr.replace(/\D/g, ''), 10);
          const dbService = await tx.service.findFirst({
            where: {
              OR: [
                ...(!isNaN(numId) ? [{ id: numId }] : []),
                { name: { equals: sCodeStr, mode: 'insensitive' } },
              ],
            },
          });
          if (dbService) {
            sDbId = dbService.id;
            sName = dbService.name;
            if (!sPrice) sPrice = Number(dbService.price);
          } else {
            sName = sCodeStr.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
        }
        if (!sName) sName = 'Event Service';

        await tx.bookingService.create({
          data: {
            bookingId: booking.id,
            serviceId: sDbId,
            serviceCode: sCodeStr || null,
            name: sName,
            price: new Prisma.Decimal(sPrice || 0),
          },
        });
      }
    }

    if (data.assignedPackages && Array.isArray(data.assignedPackages)) {
      for (const p of data.assignedPackages) {
        const pCodeStr = typeof p === 'string' ? p : (p.packageCode || (p.id ? String(p.id) : ''));
        let pName = (typeof p === 'object' && p.name) ? p.name : '';
        let pPrice = (typeof p === 'object' && p.price) ? Number(p.price) : 0;
        let pDbId: number | null = (typeof p === 'object' && p.packageId) ? Number(p.packageId) : null;

        if (!pName && pCodeStr) {
          const numId = parseInt(pCodeStr.replace(/\D/g, ''), 10);
          const dbPkg = await tx.package.findFirst({
            where: {
              OR: [
                ...(!isNaN(numId) ? [{ id: numId }] : []),
                { name: { equals: pCodeStr, mode: 'insensitive' } },
              ],
            },
          });
          if (dbPkg) {
            pDbId = dbPkg.id;
            pName = dbPkg.name;
            if (!pPrice) pPrice = Number(dbPkg.price);
          } else {
            pName = pCodeStr.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
        }
        if (!pName) pName = 'Event Package';

        await tx.bookingPackage.create({
          data: {
            bookingId: booking.id,
            packageId: pDbId,
            packageCode: pCodeStr || null,
            name: pName,
            price: new Prisma.Decimal(pPrice || 0),
          },
        });
      }
    }

    // Link existing verified payment transactions from quotation to newly created booking
    if (qRecord?.id) {
      await tx.paymentTransaction.updateMany({
        where: {
          quotationId: qRecord.id,
          bookingId: null,
        },
        data: {
          bookingId: booking.id,
        },
      });
    }

    // If quotation had a deposit paid but no payment transactions existed yet, create verified record
    const hasDeposit = qRecord?.status === 'Deposit Paid' || qRecord?.status === 'Confirmed' || qRecord?.depositPaidAt || inqRecord?.status === 'Deposit Paid' || inqRecord?.status === 'Confirmed';
    const existingBookingPayments = await tx.paymentTransaction.count({
      where: { bookingId: booking.id },
    });

    if (hasDeposit && existingBookingPayments === 0) {
      const depositAmount = Number(qRecord?.requiredDownpayment) || Number(booking.totalAmount) * 0.5;
      const paymentRef = `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const receiptNumber = `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      
      await tx.paymentTransaction.create({
        data: {
          paymentRef,
          receiptNumber,
          bookingId: booking.id,
          quotationId: qRecord ? qRecord.id : null,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          type: 'Downpayment (50%)',
          amount: new Prisma.Decimal(depositAmount),
          method: 'GCash QR / Bank Transfer',
          referenceNumber: `DEP-${qRecord?.quotationRef || qRecord?.id || booking.id}`,
          date: qRecord?.depositPaidAt ? new Date(qRecord.depositPaidAt) : new Date(),
          status: 'Verified',
          verified: true,
          verifiedBy: 'Customer Portal Deposit',
          verifiedAt: qRecord?.depositPaidAt ? new Date(qRecord.depositPaidAt) : new Date(),
          notes: `50% reservation downpayment settled for quotation #${qRecord?.quotationRef || qRecord?.id || booking.bookingRef}`,
        },
      });
    }

    if (qRecord?.id) {
      await tx.quotation.update({
        where: { id: qRecord.id },
        data: { status: 'Confirmed', confirmedAt: new Date() },
      }).catch(() => {});
    }

    if (resolvedInquiryId) {
      await tx.inquiry.update({
        where: { id: resolvedInquiryId },
        data: { status: 'Confirmed' },
      }).catch(() => {});
    }

    return booking;
  });
};

export const updateBooking = async (id: number | string, data: Partial<BookingInput>) => {
  let bId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(bId)) {
    const found = await prisma.booking.findUnique({ where: { bookingRef: String(id) } });
    if (!found) return null;
    bId = found.id;
  }

  return await prisma.$transaction(async (tx) => {
    const currentBooking = await tx.booking.findUnique({
      where: { id: bId },
      include: {
        bookingStaff: true,
        bookingResources: true,
      },
    });

    if (!currentBooking) {
      throw new Error('Booking not found');
    }

    const targetDate = data.eventDate ? (typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate) : currentBooking.eventDate;
    const targetStartTime = data.startTime || currentBooking.startTime;
    const targetEndTime = data.endTime || currentBooking.endTime;
    const targetVenue = data.venue !== undefined ? data.venue : currentBooking.venue;
    const targetStatus = data.status || currentBooking.status;

    const dateStr = targetDate.toISOString().split('T')[0];
    const lockKey = `jad_date_lock_${dateStr}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    // Parse new or existing Staff IDs
    const staffAssignments: Array<{ staffId: number; role?: string }> = [];
    if (data.assignedStaff !== undefined && Array.isArray(data.assignedStaff)) {
      for (const s of data.assignedStaff) {
        const staffCode = typeof s.id === 'string' ? s.id : `st-${s.id}`;
        let foundStaff = await tx.staff.findUnique({ where: { staffCode } });
        if (!foundStaff) {
          const numId = typeof s.id === 'number' ? s.id : parseInt(String(s.id).replace(/\D/g, ''), 10);
          if (!isNaN(numId) && numId > 0) {
            foundStaff = await tx.staff.findUnique({ where: { id: numId } });
          }
        }
        if (!foundStaff && (s as any).name) {
          foundStaff = await tx.staff.findFirst({ where: { name: { equals: String((s as any).name), mode: 'insensitive' } } });
        }
        if (foundStaff) {
          staffAssignments.push({ staffId: foundStaff.id, role: s.role || foundStaff.role });
        }
      }
    } else {
      currentBooking.bookingStaff.forEach(s => staffAssignments.push({ staffId: s.staffId, role: s.role || undefined }));
    }

    // Parse new or existing Equipment Resources
    const equipmentAssignments: Array<{ resourceId: number; quantity: number }> = [];
    if (data.assignedEquipment !== undefined && Array.isArray(data.assignedEquipment)) {
      for (const eq of data.assignedEquipment) {
        let eqId = typeof eq.resourceId === 'string' ? parseInt(eq.resourceId.replace('eq-', ''), 10) : eq.resourceId;
        if (isNaN(eqId)) {
          const found = await tx.equipmentResource.findUnique({ where: { resourceCode: String(eq.resourceId) } });
          if (found) eqId = found.id;
        }
        if (!isNaN(eqId) && eqId > 0) {
          equipmentAssignments.push({ resourceId: eqId, quantity: Number(eq.quantity) || 1 });
        }
      }
    } else {
      currentBooking.bookingResources.forEach(r => equipmentAssignments.push({ resourceId: r.resourceId, quantity: r.quantity }));
    }

    // Run Conflict Detection inside transaction
    if (targetStatus !== 'Cancelled') {
      const availabilityCheck = await checkScheduleAvailability({
        eventDate: targetDate,
        startTime: targetStartTime,
        endTime: targetEndTime,
        venue: targetVenue,
        excludeBookingId: bId,
        requestedStaffIds: staffAssignments.map(s => s.staffId),
        requestedResourceAllocations: equipmentAssignments,
        client: tx,
      });

      if (availabilityCheck.hasHighConflicts) {
        const errorMsg = availabilityCheck.conflicts.map(c => c.message).join(' | ');
        throw new Error(`Scheduling conflict detected on update: ${errorMsg}`);
      }
    }

    const updateData: any = {};
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
    if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
    if (data.eventTitle !== undefined) updateData.eventTitle = data.eventTitle;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.eventDate !== undefined) updateData.eventDate = targetDate;
    if (data.startTime !== undefined) updateData.startTime = targetStartTime;
    if (data.endTime !== undefined) updateData.endTime = targetEndTime;
    if (data.venue !== undefined) updateData.venue = targetVenue;
    if (data.guestCount !== undefined) updateData.guestCount = Number(data.guestCount);
    if (data.totalAmount !== undefined) updateData.totalAmount = new Prisma.Decimal(Number(data.totalAmount));
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'Confirmed' && !currentBooking.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await tx.booking.update({
      where: { id: bId },
      data: updateData,
    });

    // Sync Schedule
    await tx.eventSchedule.upsert({
      where: { bookingId: bId },
      create: {
        bookingId: bId,
        eventDate: targetDate,
        startTime: targetStartTime,
        endTime: targetEndTime,
        venue: targetVenue,
        status: targetStatus === 'Cancelled' ? 'Cancelled' : 'Active',
      },
      update: {
        eventDate: targetDate,
        startTime: targetStartTime,
        endTime: targetEndTime,
        venue: targetVenue,
        status: targetStatus === 'Cancelled' ? 'Cancelled' : 'Active',
      },
    });

    // Sync Staff if provided
    if (data.assignedStaff !== undefined) {
      await tx.bookingStaff.deleteMany({ where: { bookingId: bId } });
      for (const s of staffAssignments) {
        await tx.bookingStaff.create({
          data: {
            bookingId: bId,
            staffId: s.staffId,
            role: s.role || null,
          },
        });
      }
    }

    // Sync Equipment if provided
    if (data.assignedEquipment !== undefined) {
      await tx.bookingResource.deleteMany({ where: { bookingId: bId } });
      for (const eq of equipmentAssignments) {
        await tx.bookingResource.create({
          data: {
            bookingId: bId,
            resourceId: eq.resourceId,
            quantity: eq.quantity,
          },
        });
      }
    }

    return updated;
  });
};

export const rescheduleBooking = async (
  id: number | string,
  newDate: string | Date,
  newStartTime: string,
  newEndTime: string,
  reason: string
) => {
  let bId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(bId)) {
    const found = await prisma.booking.findUnique({ where: { bookingRef: String(id) } });
    if (!found) return null;
    bId = found.id;
  }

  const parsedNewDate = typeof newDate === 'string' ? new Date(newDate) : newDate;
  const dateStr = parsedNewDate.toISOString().split('T')[0];

  return await prisma.$transaction(async (tx) => {
    const lockKey = `jad_date_lock_${dateStr}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const currentBooking = await tx.booking.findUnique({
      where: { id: bId },
      include: {
        bookingStaff: true,
        bookingResources: true,
      },
    });

    if (!currentBooking) {
      throw new Error('Booking not found');
    }

    // Check conflicts on new date inside transaction
    const conflictCheck = await checkScheduleAvailability({
      eventDate: parsedNewDate,
      startTime: newStartTime,
      endTime: newEndTime,
      venue: currentBooking.venue,
      excludeBookingId: bId,
      requestedStaffIds: currentBooking.bookingStaff.map(s => s.staffId),
      requestedResourceAllocations: currentBooking.bookingResources.map(r => ({ resourceId: r.resourceId, quantity: r.quantity })),
      client: tx,
    });

    if (conflictCheck.hasHighConflicts) {
      const errorMsg = conflictCheck.conflicts.map(c => c.message).join(' | ');
      throw new Error(`Rescheduling conflict: ${errorMsg}`);
    }

    const updated = await tx.booking.update({
      where: { id: bId },
      data: {
        rescheduledFrom: currentBooking.eventDate,
        eventDate: parsedNewDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'Rescheduled',
        notes: `${currentBooking.notes ? currentBooking.notes + ' | ' : ''}Rescheduled on ${new Date().toISOString().split('T')[0]}: ${reason}`,
      },
    });

    await tx.eventSchedule.upsert({
      where: { bookingId: bId },
      create: {
        bookingId: bId,
        eventDate: parsedNewDate,
        startTime: newStartTime,
        endTime: newEndTime,
        venue: currentBooking.venue,
        status: 'Active',
      },
      update: {
        eventDate: parsedNewDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'Active',
      },
    });

    return updated;
  });
};

export const cancelBooking = async (id: number | string, reason: string) => {
  let bId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(bId)) {
    const found = await prisma.booking.findUnique({ where: { bookingRef: String(id) } });
    if (!found) return null;
    bId = found.id;
  }

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bId },
      data: {
        status: 'Cancelled',
        cancellationReason: reason,
      },
    });

    await tx.eventSchedule.updateMany({
      where: { bookingId: bId },
      data: {
        status: 'Cancelled',
      },
    });

    return booking;
  });
};

export const normalizeBookingStatus = (status: string): string => {
  const s = (status || '').trim().toLowerCase();
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'tentative') return 'Tentative';
  if (s === 'in progress' || s === 'inprogress' || s === 'in_progress') return 'In Progress';
  if (s === 'completed') return 'Completed';
  if (s === 'rescheduled') return 'Rescheduled';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return status;
};

export const updateBookingStatus = async (id: number | string, status: string) => {
  const normStatus = normalizeBookingStatus(status);

  // Search booking by numeric ID or bookingRef
  let bookingRecord = null;
  const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
  if (!isNaN(numId)) {
    bookingRecord = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: numId },
          { bookingRef: String(id).trim() }
        ]
      }
    });
  } else {
    bookingRecord = await prisma.booking.findFirst({
      where: { bookingRef: String(id).trim() }
    });
  }

  if (!bookingRecord) {
    throw new Error(`Booking with reference or ID "${id}" was not found.`);
  }

  const bId = bookingRecord.id;

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({
      where: { id: bId },
    });

    if (!current) {
      throw new Error('Booking not found');
    }

    const booking = await tx.booking.update({
      where: { id: bId },
      data: {
        status: normStatus,
        confirmedAt: normStatus === 'Confirmed' && !current.confirmedAt ? new Date() : undefined,
      },
    });

    await tx.eventSchedule.updateMany({
      where: { bookingId: bId },
      data: {
        status: normStatus === 'Cancelled' ? 'Cancelled' : 'Active',
      },
    });

    return booking;
  });

  // Sync Quotation status safely outside transaction
  if (bookingRecord.quotationId) {
    try {
      const quoteStatus = normStatus === 'Completed' ? 'Completed' 
        : normStatus === 'Confirmed' ? 'Confirmed'
        : normStatus === 'Cancelled' ? 'Cancelled'
        : undefined;

      if (quoteStatus) {
        await prisma.quotation.update({
          where: { id: bookingRecord.quotationId },
          data: { status: quoteStatus },
        });
      }
    } catch (e) {
      console.warn('Could not sync linked quotation status:', e);
    }
  }

  // Sync Inquiry status safely outside transaction
  if (bookingRecord.inquiryId) {
    try {
      const inqStatus = normStatus === 'Completed' ? 'Completed' 
        : normStatus === 'Confirmed' ? 'Confirmed'
        : normStatus === 'Cancelled' ? 'Cancelled'
        : undefined;

      if (inqStatus) {
        await prisma.inquiry.update({
          where: { id: bookingRecord.inquiryId },
          data: { status: inqStatus },
        });
      }
    } catch (e) {
      console.warn('Could not sync linked inquiry status:', e);
    }
  }

  return updatedBooking;
};

export const deleteBooking = async (id: number | string) => {
  let bId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(bId)) {
    const found = await prisma.booking.findUnique({ where: { bookingRef: String(id) } });
    if (!found) return null;
    bId = found.id;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bId },
  });

  if (!booking) return null;

  return await prisma.booking.delete({
    where: { id: bId },
  });
};
