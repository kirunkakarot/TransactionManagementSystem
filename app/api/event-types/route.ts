import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuth(request, true);
    const isAdmin = !auth.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const whereClause: any = {};
    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }
    
    // If not admin, only show active event types
    if (!isAdmin) {
      whereClause.isActive = true;
    }

    const eventTypes = await prisma.eventType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ eventTypes, total: eventTypes.length });
  } catch (error: any) {
    console.error('Error fetching event types:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request, true);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    if (!name) {
      return NextResponse.json({ message: 'Event type name is required' }, { status: 400 });
    }

    const existingType = await prisma.eventType.findUnique({
      where: { name: name.trim() }
    });

    if (existingType) {
      return NextResponse.json({ message: 'Event type with this name already exists' }, { status: 400 });
    }

    const eventType = await prisma.eventType.create({
      data: {
        name: name.trim(),
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      }
    });

    return NextResponse.json({ message: 'Event type created successfully', eventType }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event type:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
