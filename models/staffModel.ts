import { prisma } from '../lib/prisma';

export interface StaffInput {
  staffCode: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status?: string;
  skills?: string[];
  avatar?: string | null;
}

export const getStaffMembers = async (limit = 100, offset = 0, search = '') => {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { role: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { staffCode: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { id: 'asc' },
      include: {
        bookingStaff: {
          include: {
            booking: {
              select: {
                id: true,
                bookingRef: true,
                eventTitle: true,
                eventDate: true,
                startTime: true,
                endTime: true,
                venue: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.staff.count({ where }),
  ]);

  return { staff, total };
};

export const getStaffById = async (id: number | string) => {
  const staffId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(staffId)) return null;
  return await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      bookingStaff: {
        include: {
          booking: true,
        },
      },
    },
  });
};

export const getStaffByCode = async (staffCode: string) => {
  return await prisma.staff.findUnique({
    where: { staffCode },
    include: {
      bookingStaff: {
        include: {
          booking: true,
        },
      },
    },
  });
};

export const createStaffMember = async (data: StaffInput) => {
  return await prisma.staff.create({
    data: {
      staffCode: data.staffCode,
      name: data.name,
      role: data.role,
      phone: data.phone,
      email: data.email,
      status: data.status || 'Available',
      skills: data.skills ? data.skills : [],
      avatar: data.avatar || null,
    },
  });
};

export const updateStaffMember = async (id: number | string, data: Partial<StaffInput>) => {
  const staffId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(staffId)) return null;

  const updateData: any = {};
  if (data.staffCode !== undefined) updateData.staffCode = data.staffCode;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.skills !== undefined) updateData.skills = data.skills;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;

  return await prisma.staff.update({
    where: { id: staffId },
    data: updateData,
  });
};

export const deleteStaffMember = async (id: number | string) => {
  const staffId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(staffId)) return null;

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      bookingStaff: {
        include: { booking: true },
      },
    },
  });

  if (!staff) return null;

  const hasActiveBookings = staff.bookingStaff.some(bs => bs.booking && bs.booking.status !== 'Cancelled');
  if (hasActiveBookings) {
    throw new Error(`Cannot delete staff member "${staff.name}" because they are currently assigned to active event bookings. Please reassign their duties or mark them as "On Leave".`);
  }

  return await prisma.staff.delete({
    where: { id: staffId },
  });
};
