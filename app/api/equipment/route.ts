import { NextResponse } from 'next/server';
import { getEquipmentResources, createEquipmentResource } from '../../../models/equipmentModel';
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
    const data = await getEquipmentResources(limit, offset, search);

    if (!isPrivileged) {
      // For customers: Expose only public equipment names, categories, and units.
      // Strictly OMIT internal condition reports, internal resource codes, notes, and booking allocation details.
      const sanitizedEquipment = data.resources.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        unit: r.unit,
      }));
      return NextResponse.json({ resources: sanitizedEquipment, total: data.total });
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
    if (!body.name || !body.category || body.quantity === undefined) {
      return NextResponse.json(
        { message: 'Name, category, and quantity are required' },
        { status: 400 }
      );
    }

    const resourceCode = body.resourceCode || `eq-${Date.now().toString().slice(-4)}`;
    const equipment = await createEquipmentResource({
      resourceCode,
      name: body.name,
      category: body.category,
      quantity: Number(body.quantity) || 1,
      unit: body.unit || 'units',
      condition: body.condition || 'Excellent',
      assignedServiceId: body.assignedServiceId || null,
      notes: body.notes || null,
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ message: 'Server error', error: message }, { status: 500 });
  }
}
