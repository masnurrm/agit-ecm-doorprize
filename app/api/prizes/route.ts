import { NextResponse } from 'next/server';
import { prizesDb } from '@/lib/db';

export async function GET() {
  try {
    const prizes = prizesDb.getAll();
    return NextResponse.json({ success: true, data: prizes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { prizeName, quota } = await request.json();

    if (!prizeName || !quota || quota < 1) {
      return NextResponse.json({ success: false, error: 'Prize name and valid quota are required' }, { status: 400 });
    }

    const id = `prize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    prizesDb.create(id, prizeName, quota);

    return NextResponse.json({ success: true, message: 'Prize added successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, prizeName, quota } = await request.json();

    if (!id || !prizeName || quota === undefined) {
      return NextResponse.json({ success: false, error: 'ID, Prize Name and Quota are required' }, { status: 400 });
    }

    prizesDb.update(id, prizeName, quota);

    return NextResponse.json({ success: true, message: 'Prize updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Prize ID is required' }, { status: 400 });
    }

    prizesDb.delete(id);

    return NextResponse.json({ success: true, message: 'Prize deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
