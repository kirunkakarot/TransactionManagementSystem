import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface PackageInput {
  name: string;
  tagline?: string | null;
  description?: string | null;
  capacity?: string | null;
  price: number;
  originalPrice?: number | null;
  isPopular?: boolean;
  isActive?: boolean;
  idealFor?: string | null;
  inclusions?: any;
  features?: any;
  servicesIncluded?: any;
}

export const createPackagesTable = async () => {
  // Managed by Prisma
};

export const createPackage = async (data: PackageInput | { name: string; description?: string; price: number }) => {
  const priceNum = typeof data.price === 'string' ? parseFloat(data.price) : Number(data.price) || 0;
  const d = data as PackageInput;

  return await prisma.package.create({
    data: {
      name: d.name,
      tagline: d.tagline || d.description || null,
      description: d.description || d.tagline || null,
      capacity: d.capacity || null,
      price: new Prisma.Decimal(priceNum),
      originalPrice: d.originalPrice ? new Prisma.Decimal(Number(d.originalPrice)) : null,
      isPopular: d.isPopular !== undefined ? Boolean(d.isPopular) : false,
      isActive: d.isActive !== undefined ? Boolean(d.isActive) : true,
      idealFor: d.idealFor || null,
      inclusions: d.inclusions ? d.inclusions : [],
      features: d.features ? d.features : [],
      servicesIncluded: d.servicesIncluded ? d.servicesIncluded : [],
    },
  });
};

export const getPackages = async (limit = 100, offset = 0, search = '') => {
  const where: Prisma.PackageWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tagline: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        id: 'asc',
      },
    }),
    prisma.package.count({ where }),
  ]);

  return {
    packages,
    total,
  };
};

export const getPackageById = async (id: number | string) => {
  const packageId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(packageId)) return null;
  return await prisma.package.findUnique({
    where: { id: packageId },
  });
};

export const updatePackage = async (
  id: number | string,
  data: Partial<PackageInput> | { name: string; description?: string; price: number }
) => {
  const packageId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(packageId)) return null;

  const d = data as Partial<PackageInput>;
  const updatePayload: Prisma.PackageUpdateInput = {};

  if (d.name !== undefined) updatePayload.name = d.name;
  if (d.tagline !== undefined) updatePayload.tagline = d.tagline;
  if (d.description !== undefined) updatePayload.description = d.description;
  if (d.capacity !== undefined) updatePayload.capacity = d.capacity;
  if (d.price !== undefined) {
    const priceNum = typeof d.price === 'string' ? parseFloat(d.price) : Number(d.price);
    updatePayload.price = new Prisma.Decimal(priceNum);
  }
  if (d.originalPrice !== undefined) {
    updatePayload.originalPrice = d.originalPrice ? new Prisma.Decimal(Number(d.originalPrice)) : null;
  }
  if (d.isPopular !== undefined) updatePayload.isPopular = Boolean(d.isPopular);
  if (d.isActive !== undefined) updatePayload.isActive = Boolean(d.isActive);
  if (d.idealFor !== undefined) updatePayload.idealFor = d.idealFor;
  if (d.inclusions !== undefined) updatePayload.inclusions = d.inclusions;
  if (d.features !== undefined) updatePayload.features = d.features;
  if (d.servicesIncluded !== undefined) updatePayload.servicesIncluded = d.servicesIncluded;

  return await prisma.package.update({
    where: { id: packageId },
    data: updatePayload,
  });
};

export const deletePackage = async (id: number | string) => {
  const packageId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(packageId)) return null;
  return await prisma.package.delete({
    where: { id: packageId },
  });
};
