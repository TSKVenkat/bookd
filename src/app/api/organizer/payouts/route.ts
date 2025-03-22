import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organizer profile
    const organizer = await prisma.organizer.findFirst({
      where: {
        userId: session.id,
        status: 'APPROVED'
      }
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer profile not found or not approved' },
        { status: 404 }
      );
    }

    // Fetch payouts
    const payouts = await prisma.payout.findMany({
      where: {
        organizerId: organizer.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
} 