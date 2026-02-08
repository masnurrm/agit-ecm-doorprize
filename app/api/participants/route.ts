import { NextResponse } from 'next/server';
import { initDatabase, participantsDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Initialize database on first request
initDatabase().catch(console.error);

export async function GET() {
  try {
    const participants = await participantsDb.getAll();
    return NextResponse.json({ success: true, data: participants });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, nim, category, employment_type, is_winner } = await request.json();

    if (!name || !nim) {
      return NextResponse.json({ success: false, error: 'Name and NIM are required' }, { status: 400 });
    }

    const id = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await participantsDb.create(
      id,
      name,
      nim,
      category || 'Staff',
      employment_type || 'AGIT',
      is_winner !== undefined ? is_winner : 0
    );

    return NextResponse.json({ success: true, message: 'Participant added successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, nim, category, employment_type, is_winner } = await request.json();

    if (!id || !name || !nim) {
      return NextResponse.json({ success: false, error: 'ID, Name and NIM are required' }, { status: 400 });
    }

    await participantsDb.update(
      id,
      name,
      nim,
      category || 'Staff',
      employment_type || 'AGIT',
      is_winner !== undefined ? is_winner : 0
    );

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
      await participantsDb.deleteMany(ids);
      return NextResponse.json({ success: true, message: `${ids.length} participants deleted successfully` });
    }

    await participantsDb.delete(id);

    return NextResponse.json({ success: true, message: 'Participant deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
