import { NextResponse } from 'next/server';
import { participantsDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Participant ID is required' }, { status: 400 });
    }

    const result = await participantsDb.markAsCheckedIn(id);

    if (result.alreadyCheckedIn) {
      return NextResponse.json({
        success: false,
        error: 'Participant already checked in'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Checked in successfully',
      data: result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
