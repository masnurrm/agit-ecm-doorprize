import { NextResponse } from 'next/server';
import { participantsDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const participants = await participantsDb.getEligible();
    return NextResponse.json({ success: true, data: participants });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
