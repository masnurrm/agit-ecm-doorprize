import { NextResponse } from 'next/server';
import { initDatabase, participantsDb } from '@/lib/db';

// Initialize database on first request
initDatabase();

export async function GET() {
  try {
    const participants = participantsDb.getAll();
    return NextResponse.json({ success: true, data: participants });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, nim } = await request.json();

    if (!name || !nim) {
      return NextResponse.json({ success: false, error: 'Name and NIM are required' }, { status: 400 });
    }

    const id = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    participantsDb.create(id, name, nim);

    return NextResponse.json({ success: true, message: 'Participant added successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, nim } = await request.json();

    if (!id || !name || !nim) {
      return NextResponse.json({ success: false, error: 'ID, Name and NIM are required' }, { status: 400 });
    }

    participantsDb.update(id, name, nim);

    return NextResponse.json({ success: true, message: 'Participant updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Participant ID is required' }, { status: 400 });
    }

    if (id.includes(',')) {
      const ids = id.split(',');
      participantsDb.deleteMany(ids);
      return NextResponse.json({ success: true, message: `${ids.length} participants deleted successfully` });
    }

    participantsDb.delete(id);

    return NextResponse.json({ success: true, message: 'Participant deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
