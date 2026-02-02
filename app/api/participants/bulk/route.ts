import { NextResponse } from 'next/server';
import { participantsDb } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { participants } = await request.json();

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return NextResponse.json({ success: false, error: 'Valid participants array is required' }, { status: 400 });
        }

        // Add UUIDs to participants if not provided
        const participantsWithIds = participants.map((p: any) => ({
            id: p.id || `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: p.name,
            nim: p.nim
        }));

        participantsDb.bulkCreate(participantsWithIds);

        return NextResponse.json({
            success: true,
            data: {
                count: participantsWithIds.length
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
