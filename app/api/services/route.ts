import { NextResponse } from 'next/server';
import { getServices, createService } from '../../../models/serviceModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    const data = await getServices(limit, offset, search);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, price } = body;
    if (!name || price === undefined || price === null) {
      return NextResponse.json({ message: 'Name and starting price are required' }, { status: 400 });
    }

    const service = await createService(body);
    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
