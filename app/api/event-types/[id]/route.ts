import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuth(request, true);
    if (auth.error) {
      return auth.error;
    }

    const resolvedParams = await params;
    const eventTypeId = parseInt(resolvedParams.id, 10);
    if (isNaN(eventTypeId)) {
      return NextResponse.json({ message: 'Invalid event type ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const existingType = await prisma.eventType.findUnique({
      where: { id: eventTypeId }
    });

    if (!existingType) {
      return NextResponse.json({ message: 'Event type not found' }, { status: 404 });
    }

    if (name && name.trim() !== existingType.name) {
      const nameConflict = await prisma.eventType.findUnique({
        where: { name: name.trim() }
      });
      if (nameConflict) {
        return NextResponse.json({ message: 'Event type with this name already exists' }, { status: 400 });
      }
    }

    const updatedEventType = await prisma.eventType.update({
      where: { id: eventTypeId },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    });

    return NextResponse.json({ message: 'Event type updated successfully', eventType: updatedEventType }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating event type:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
