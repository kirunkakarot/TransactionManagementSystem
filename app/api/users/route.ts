import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAllUsers, findUserByEmail, createPrivilegedUser } from '../../../models/userModel';
import { createStaffMember } from '../../../models/staffModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // SECURITY ENFORCEMENT:
  // Only authenticated Administrator can create privileged accounts (Staff / Administrator)
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, email, password, role, phone } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Full name is required (minimum 2 characters)' },
        { status: 400 }
      );
    }

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { message: 'A valid email address is required' },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { message: 'Temporary password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate privileged role
    const normalizedRole = role === 'admin' || role === 'ADMIN' ? 'Administrator' : role;
    if (normalizedRole !== 'Administrator' && normalizedRole !== 'Staff') {
      return NextResponse.json(
        { message: 'Invalid role specified. Only "Administrator" or "Staff" accounts can be created through this admin endpoint.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await findUserByEmail(normalizedEmail);
    if (userExists) {
      return NextResponse.json(
        { message: `An account with email "${normalizedEmail}" already exists` },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createPrivilegedUser(
      name.trim(),
      normalizedEmail,
      hashedPassword,
      normalizedRole,
      phone ? String(phone).trim() : undefined
    );

    const staffCode = `st-${Date.now().toString().slice(-4)}`;
    await createStaffMember({
      staffCode,
      name: name.trim(),
      role: normalizedRole,
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : 'N/A',
      status: 'Available',
      skills: [],
    });

    return NextResponse.json(
      {
        success: true,
        message: `${normalizedRole} account for "${newUser.name}" created successfully.`,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

