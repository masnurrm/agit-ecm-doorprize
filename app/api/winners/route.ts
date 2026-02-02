import { NextResponse } from 'next/server';
import { winnersDb, removeWinner } from '@/lib/db';

export async function GET() {
  try {
    const winners = winnersDb.getAll();
    return NextResponse.json({ success: true, data: winners });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Winner ID is required' }, { status: 400 });
    }

    removeWinner(id);

    return NextResponse.json({ success: true, message: 'Winner removed and quota restored' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
