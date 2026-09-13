import { NextResponse } from 'next/server';
import { getEquipmentById, updateEquipmentResource, deleteEquipmentResource } from '../../../../models/equipmentModel';
import { checkAuth } from '../../../../lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const equipment = await getEquipmentById(id);
    if (!equipment) {
      return NextResponse.json({ message: 'Equipment resource not found' }, { status: 404 });
    }

    const isPrivileged = auth.user.role === 'Administrator' || auth.user.role === 'Staff';
    if (!isPrivileged) {
      return NextResponse.json({
        id: equipment.id,
        name: equipment.name,
        category: equipment.category,
        unit: equipment.unit,
      });
    }

    return NextResponse.json(equipment);
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
    const updated = await updateEquipmentResource(id, body);
    if (!updated) {
      return NextResponse.json({ message: 'Equipment resource not found' }, { status: 404 });
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
    await deleteEquipmentResource(id);
    return NextResponse.json({ message: 'Equipment resource removed successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message }, { status: 400 });
  }
}
