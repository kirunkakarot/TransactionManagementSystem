import { prisma } from '../lib/prisma';

export interface EquipmentInput {
  resourceCode: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  condition?: string;
  assignedServiceId?: string | null;
  notes?: string | null;
}

export const getEquipmentResources = async (limit = 100, offset = 0, search = '') => {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
          { resourceCode: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [resources, total] = await Promise.all([
    prisma.equipmentResource.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { id: 'asc' },
      include: {
        bookingResources: {
          include: {
            booking: {
              select: {
                id: true,
                bookingRef: true,
                eventTitle: true,
                eventDate: true,
                startTime: true,
                endTime: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.equipmentResource.count({ where }),
  ]);

  return { resources, total };
};

export const getEquipmentById = async (id: number | string) => {
  const resourceId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(resourceId)) return null;
  return await prisma.equipmentResource.findUnique({
    where: { id: resourceId },
    include: {
      bookingResources: {
        include: {
          booking: true,
        },
      },
    },
  });
};

export const createEquipmentResource = async (data: EquipmentInput) => {
  return await prisma.equipmentResource.create({
    data: {
      resourceCode: data.resourceCode,
      name: data.name,
      category: data.category,
      quantity: Number(data.quantity) || 1,
      unit: data.unit || 'units',
      condition: data.condition || 'Excellent',
      assignedServiceId: data.assignedServiceId || null,
      notes: data.notes || null,
    },
  });
};

export const updateEquipmentResource = async (id: number | string, data: Partial<EquipmentInput>) => {
  const resourceId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(resourceId)) return null;

  const updateData: any = {};
  if (data.resourceCode !== undefined) updateData.resourceCode = data.resourceCode;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.condition !== undefined) updateData.condition = data.condition;
  if (data.assignedServiceId !== undefined) updateData.assignedServiceId = data.assignedServiceId;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return await prisma.equipmentResource.update({
    where: { id: resourceId },
    data: updateData,
  });
};

export const deleteEquipmentResource = async (id: number | string) => {
  const resourceId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(resourceId)) return null;

  const equipment = await prisma.equipmentResource.findUnique({
    where: { id: resourceId },
    include: {
      bookingResources: {
        include: { booking: true },
      },
    },
  });

  if (!equipment) return null;

  const hasActiveBookings = equipment.bookingResources.some(br => br.booking && br.booking.status !== 'Cancelled');
  if (hasActiveBookings) {
    throw new Error(`Cannot delete equipment "${equipment.name}" because units are currently allocated to active bookings. Please reallocate or mark condition as "Needs Maintenance" / "Decommissioned".`);
  }

  return await prisma.equipmentResource.delete({
    where: { id: resourceId },
  });
};
