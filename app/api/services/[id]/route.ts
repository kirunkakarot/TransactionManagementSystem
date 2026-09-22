import { NextResponse } from 'next/server';
import { getServiceById, updateService, deleteService } from '../../../../models/serviceModel';
import { checkAuth } from '../../../../lib/auth';
import { del } from '@vercel/blob';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const service = await getServiceById(id);
    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }
    return NextResponse.json(service);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();

    const existingService = await getServiceById(id);
    if (!existingService) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    const updated = await updateService(id, body);
    if (!updated) {
      return NextResponse.json({ message: 'Failed to update service' }, { status: 500 });
    }

    // Cleanup old Blob if replaced
    if (
      body.featuredImage !== undefined &&
      existingService.featuredImage !== body.featuredImage &&
      existingService.featuredImage?.includes('.public.blob.vercel-storage.com')
    ) {
      try {
        await del(existingService.featuredImage);
      } catch (err) {
        console.warn('Failed to delete old service image blob:', err);
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;

    const existingService = await getServiceById(id);
    if (!existingService) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    const deleted = await deleteService(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Failed to delete service' }, { status: 500 });
    }

    // Cleanup Blob if service is deleted
    if (existingService.featuredImage?.includes('.public.blob.vercel-storage.com')) {
      try {
        await del(existingService.featuredImage);
      } catch (err) {
        console.warn('Failed to delete service image blob:', err);
      }
    }

    return NextResponse.json({ message: 'Service removed successfully', service: deleted });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
