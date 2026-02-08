import { NextResponse } from 'next/server';
import { prizesDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prizes = await prizesDb.getAvailable();
    return NextResponse.json({ success: true, data: prizes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
