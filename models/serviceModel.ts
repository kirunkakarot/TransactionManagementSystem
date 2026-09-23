import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface ServiceInput {
  name: string;
  category?: string | null;
  shortDesc?: string | null;
  fullDesc?: string | null;
  description?: string | null;
  price: number;
  featuredImage?: string | null;
  iconName?: string | null;
  features?: any;
  inclusions?: any;
  isActive?: boolean;
  eventTypes?: number[];
}

export const createServicesTable = async () => {
  // Managed by Prisma
};

export const createService = async (data: ServiceInput | { name: string; description?: string; price: number }) => {
  const priceNum = typeof data.price === 'string' ? parseFloat(data.price) : Number(data.price) || 0;
  const d = data as ServiceInput;

  return await prisma.service.create({
    data: {
      name: d.name,
      category: d.category || null,
      shortDesc: d.shortDesc || d.description || null,
      fullDesc: d.fullDesc || d.description || null,
      description: d.description || d.shortDesc || d.fullDesc || null,
      price: new Prisma.Decimal(priceNum),
      featuredImage: d.featuredImage || null,
      iconName: d.iconName || 'Sparkles',
      features: d.features ? d.features : [],
      inclusions: d.inclusions ? d.inclusions : [],
      isActive: d.isActive !== undefined ? Boolean(d.isActive) : true,
      eventTypes: d.eventTypes?.length ? { connect: d.eventTypes.map(id => ({ id })) } : undefined,
    },
    include: {
      eventTypes: true,
    }
  });
};

export const getServices = async (limit = 100, offset = 0, search = '') => {
  const where: Prisma.ServiceWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        id: 'asc',
      },
      include: {
        eventTypes: true,
      }
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    total,
  };
};

export const getServiceById = async (id: number | string) => {
  const serviceId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(serviceId)) return null;
  return await prisma.service.findUnique({
    where: { id: serviceId },
    include: { eventTypes: true },
  });
};

export const updateService = async (
  id: number | string,
  data: Partial<ServiceInput> | { name: string; description?: string; price: number }
) => {
  const serviceId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(serviceId)) return null;

  const d = data as Partial<ServiceInput>;
  const updatePayload: Prisma.ServiceUpdateInput = {};

  if (d.name !== undefined) updatePayload.name = d.name;
  if (d.category !== undefined) updatePayload.category = d.category;
  if (d.shortDesc !== undefined) updatePayload.shortDesc = d.shortDesc;
  if (d.fullDesc !== undefined) updatePayload.fullDesc = d.fullDesc;
  if (d.description !== undefined) updatePayload.description = d.description;
  if (d.price !== undefined) {
    const priceNum = typeof d.price === 'string' ? parseFloat(d.price) : Number(d.price);
    updatePayload.price = new Prisma.Decimal(priceNum);
  }
  if (d.featuredImage !== undefined) updatePayload.featuredImage = d.featuredImage;
  if (d.iconName !== undefined) updatePayload.iconName = d.iconName;
  if (d.features !== undefined) updatePayload.features = d.features;
  if (d.inclusions !== undefined) updatePayload.inclusions = d.inclusions;
  if (d.isActive !== undefined) updatePayload.isActive = Boolean(d.isActive);
  if (d.eventTypes !== undefined) updatePayload.eventTypes = { set: d.eventTypes.map(id => ({ id })) };

  return await prisma.service.update({
    where: { id: serviceId },
    data: updatePayload,
    include: { eventTypes: true },
  });
};

export const deleteService = async (id: number | string) => {
  const serviceId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(serviceId)) return null;
  return await prisma.service.delete({
    where: { id: serviceId },
  });
};
