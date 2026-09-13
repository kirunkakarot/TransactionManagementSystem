import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkAuth } from '../../../../lib/auth';

export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const userEmail = auth.user.email;
    const userId = auth.user.id;

    // 1. Fetch user's inquiries
    const inquiries = await prisma.inquiry.findMany({
      where: {
        OR: [
          { userId },
          { clientEmail: { equals: userEmail, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch user's quotations (by userId, clientEmail, or linked inquiry IDs)
    const userInquiryIds = inquiries.map(i => i.id);
    const quotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { userId },
          { clientEmail: { equals: userEmail, mode: 'insensitive' } },
          ...(userInquiryIds.length > 0 ? [{ inquiryId: { in: userInquiryIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        inquiry: true,
        bookings: true,
        payments: true,
      },
    });

    // 3. Fetch user's bookings (by userId, clientEmail, or linked quotation/inquiry IDs)
    const userQuotationIds = quotations.map(q => q.id);
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          { clientEmail: { equals: userEmail, mode: 'insensitive' } },
          ...(userQuotationIds.length > 0 ? [{ quotationId: { in: userQuotationIds } }] : []),
          ...(userInquiryIds.length > 0 ? [{ inquiryId: { in: userInquiryIds } }] : []),
        ],
      },
      orderBy: { eventDate: 'desc' },
      include: {
        schedule: true,
        bookingServices: { include: { service: true } },
        bookingPackages: { include: { package: true } },
        bookingStaff: { include: { staff: true } },
        bookingResources: { include: { resource: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        quotation: true,
        inquiry: true,
        feedback: true,
      },
    });

    // 4. Fetch user's payments
    const userBookingIds = bookings.map(b => b.id);
    const payments = await prisma.paymentTransaction.findMany({
      where: {
        OR: [
          { clientEmail: { equals: userEmail, mode: 'insensitive' } },
          ...(userQuotationIds.length > 0 ? [{ quotationId: { in: userQuotationIds } }] : []),
          ...(userBookingIds.length > 0 ? [{ bookingId: { in: userBookingIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      user: {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone,
        address: auth.user.address,
        profileImage: auth.user.profileImage,
      },
      inquiries,
      quotations,
      bookings,
      payments,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
