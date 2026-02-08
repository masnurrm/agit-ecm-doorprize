import { NextResponse } from 'next/server';
import { participantsDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nim = searchParams.get('nim');

    if (!nim) {
      return NextResponse.json({ success: false, error: 'NIM is required' }, { status: 400 });
    }

    const participant = await participantsDb.getByNim(nim);

    if (!participant) {
      return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: participant });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
