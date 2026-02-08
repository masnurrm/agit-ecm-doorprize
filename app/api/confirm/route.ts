import { NextResponse } from 'next/server';
import { confirmWinners } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { participantIds, prizeId } = await request.json();

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Participant IDs array is required' }, { status: 400 });
    }

    if (!prizeId) {
      return NextResponse.json({ success: false, error: 'Prize ID is required' }, { status: 400 });
    }

    // Execute transaction
    const result = await confirmWinners(participantIds, prizeId);

    return NextResponse.json({
      success: true,
      message: `${participantIds.length} winner(s) confirmed successfully!`,
      data: result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
