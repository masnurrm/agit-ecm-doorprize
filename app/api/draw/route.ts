import { NextResponse } from 'next/server';
import { participantsDb, prizesDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { prizeId, quantity } = await request.json();
    
    if (!prizeId || !quantity || quantity < 1) {
      return NextResponse.json({ success: false, error: 'Prize ID and valid quantity are required' }, { status: 400 });
    }

    // Get prize details
    const prize: any = prizesDb.getById(prizeId);
    if (!prize) {
      return NextResponse.json({ success: false, error: 'Prize not found' }, { status: 404 });
    }

    if (prize.current_quota < quantity) {
      return NextResponse.json({ 
        success: false, 
        error: `Not enough quota. Available: ${prize.current_quota}, Requested: ${quantity}` 
      }, { status: 400 });
    }

    // Get eligible participants (not yet winners)
    const eligibleParticipants: any[] = participantsDb.getEligible();

    if (eligibleParticipants.length < quantity) {
      return NextResponse.json({ 
        success: false, 
        error: `Not enough eligible participants. Available: ${eligibleParticipants.length}, Requested: ${quantity}` 
      }, { status: 400 });
    }

    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...eligibleParticipants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take the first 'quantity' participants
    const selectedWinners = shuffled.slice(0, quantity);

    return NextResponse.json({ 
      success: true, 
      data: {
        winners: selectedWinners,
        prize: prize
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
