import { prisma } from '../lib/prisma';

export interface ScheduleInput {
  bookingId: number;
  eventDate: string | Date;
  startTime?: string;
  endTime?: string;
  venue: string;
  status?: string;
  timeline?: Array<{
    time: string;
    title: string;
    desc: string;
    tag: string;
  }>;
}

export const getEventSchedules = async (startDate?: Date | string, endDate?: Date | string) => {
  const where: any = {};
  if (startDate && endDate) {
    where.eventDate = {
      gte: typeof startDate === 'string' ? new Date(startDate) : startDate,
      lte: typeof endDate === 'string' ? new Date(endDate) : endDate,
    };
  }

  return await prisma.eventSchedule.findMany({
    where,
    orderBy: { eventDate: 'asc' },
    include: {
      booking: {
        include: {
          bookingStaff: {
            include: { staff: true },
          },
          bookingResources: {
            include: { resource: true },
          },
        },
      },
    },
  });
};

export const getScheduleByBookingId = async (bookingId: number | string) => {
  const bId = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
  if (isNaN(bId)) return null;

  return await prisma.eventSchedule.findUnique({
    where: { bookingId: bId },
    include: {
      booking: {
        include: {
          bookingStaff: {
            include: { staff: true },
          },
          bookingResources: {
            include: { resource: true },
          },
          bookingServices: true,
          bookingPackages: true,
        },
      },
    },
  });
};

export const upsertEventSchedule = async (data: ScheduleInput) => {
  const eventDateParsed = typeof data.eventDate === 'string' 
    ? new Date(data.eventDate) 
    : data.eventDate;

  const defaultTimeline = [
    { time: '1:00 PM', title: 'Technical Ingress & Rigging', desc: 'Audio-visual team loads in P3 LED Wall and line array sound system.', tag: 'Logistics' },
    { time: '3:30 PM', title: 'Floral & Stage Decoration', desc: 'Backdrop framing, VIP tablescapes, and atmospheric mood lighting setup.', tag: 'Styling' },
    { time: '5:00 PM', title: 'Performer Soundcheck', desc: 'Bilingual host and live acoustic trio mic check and run-of-show dry run.', tag: 'Rehearsal' },
    { time: '6:00 PM', title: 'Guest Arrival & Photo Booth Live', desc: '360 Glam video spinner and magnetic instant prints open.', tag: 'Program' },
    { time: '7:30 PM', title: 'Grand Program Proper', desc: 'Grand entrance, keynote/debutant cotillion, and banquet dining.', tag: 'Execution' },
    { time: '11:00 PM', title: 'Event Egress & Wrap-up', desc: 'Orderly pack-down and media softcopy backup.', tag: 'Egress' },
  ];

  return await prisma.eventSchedule.upsert({
    where: { bookingId: data.bookingId },
    create: {
      bookingId: data.bookingId,
      eventDate: eventDateParsed,
      startTime: data.startTime || '17:00',
      endTime: data.endTime || '23:00',
      venue: data.venue,
      status: data.status || 'Active',
      timeline: data.timeline || defaultTimeline,
    },
    update: {
      eventDate: eventDateParsed,
      startTime: data.startTime || '17:00',
      endTime: data.endTime || '23:00',
      venue: data.venue,
      status: data.status || 'Active',
      ...(data.timeline ? { timeline: data.timeline } : {}),
    },
  });
};
