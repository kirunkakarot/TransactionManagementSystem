import { NextResponse } from 'next/server';
import { getStaffMembers, createStaffMember } from '../../../models/staffModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    const isPrivileged = auth.user.role === 'Administrator' || auth.user.role === 'Staff';
    const data = await getStaffMembers(limit, offset, search);

    if (!isPrivileged) {
      // For customers: Expose only public coordinator names, public roles, skills, and avatars.
      // Strictly OMIT private phone numbers, emails, staff codes, and internal booking schedules.
      const sanitizedStaff = data.staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        status: s.status,
        skills: s.skills,
        avatar: s.avatar,
      }));
      return NextResponse.json({ staff: sanitizedStaff, total: data.total });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message: 'Server error', error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body.name || !body.role || !body.phone || !body.email) {
      return NextResponse.json(
        { message: 'Name, role, phone, and email are required' },
        { status: 400 }
      );
    }

    const staffCode = body.staffCode || `st-${Date.now().toString().slice(-4)}`;
    const staff = await createStaffMember({
      staffCode,
      name: body.name,
      role: body.role,
      phone: body.phone,
      email: body.email,
      status: body.status || 'Available',
      skills: body.skills || [],
      avatar: body.avatar || null,
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message: 'Server error', error: message }, { status: 500 });
  }
}
