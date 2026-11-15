import { NextResponse } from 'next/server';
import { getPackages, createPackage } from '../../../models/packageModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuth(req, true);
    const isAdmin = !auth.error;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    const data = await getPackages(limit, offset, search);
    if (!isAdmin) {
      return NextResponse.json({
        ...data,
        packages: data.packages.map(({ price, originalPrice, ...rest }: any) => rest),
      });
    }
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
      return NextResponse.json({ message: 'Name and price are required' }, { status: 400 });
    }

    const pkg = await createPackage(body);
    return NextResponse.json(pkg, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
