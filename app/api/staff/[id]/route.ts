import { NextResponse } from 'next/server';
import { getStaffById, updateStaffMember, deleteStaffMember } from '../../../../models/staffModel';
import { checkAuth } from '../../../../lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const staff = await getStaffById(id);
    if (!staff) {
      return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
    }

    const isPrivileged = auth.user.role === 'Administrator' || auth.user.role === 'Staff';
    if (!isPrivileged) {
      return NextResponse.json({
        id: staff.id,
        name: staff.name,
        role: staff.role,
        status: staff.status,
        skills: staff.skills,
        avatar: staff.avatar,
      });
    }

    return NextResponse.json(staff);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message: 'Server error', error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateStaffMember(id, body);
    if (!updated) {
      return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteStaffMember(id);
    return NextResponse.json({ message: 'Staff member removed successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message }, { status: 400 });
  }
}
