import { prisma } from '../lib/prisma';

export const createUsersTable = async () => {
  // No-op with Prisma
};

export const createUser = async (name: string, email: string, passwordHash: string, _ignoredRole?: string, phone?: string) => {
  // Security enforcement: Public registrations MUST ALWAYS be 'Customer'
  return await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: 'Customer',
      ...(phone && { phone }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
    },
  });
};

export const createPrivilegedUser = async (
  name: string, 
  email: string, 
  passwordHash: string, 
  role: 'Administrator' | 'Staff',
  phone?: string
) => {
  if (role !== 'Administrator' && role !== 'Staff') {
    throw new Error('Invalid privileged role specified. Only Administrator or Staff permitted.');
  }

  return await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role,
      ...(phone && { phone }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
    },
  });
};

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const findUserById = async (id: number | string) => {
  const userId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(userId)) return null;
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      profileImage: true,
      notificationPreferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const findFullUserById = async (id: number | string) => {
  const userId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(userId)) return null;
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};

export const updateUserProfile = async (
  id: number | string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    address?: string | null;
    notificationPreferences?: any;
    profileImage?: string | null;
  }
) => {
  const userId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(userId)) throw new Error('Invalid user ID');

  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.notificationPreferences !== undefined && { notificationPreferences: data.notificationPreferences }),
      ...(data.profileImage !== undefined && { profileImage: data.profileImage }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      profileImage: true,
      notificationPreferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const updateUserPassword = async (id: number | string, passwordHash: string) => {
  const userId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(userId)) throw new Error('Invalid user ID');

  return await prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      profileImage: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

