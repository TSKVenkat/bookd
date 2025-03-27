import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = await validateSession(sessionToken);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get organizer profile
    const organizer = await prisma.organizer.findFirst({
      where: {
        userId: user.id,
        status: 'APPROVED'
      }
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer profile not found or not approved' },
        { status: 404 }
      );
    }

    // Calculate total sales from completed bookings
    const totalSalesResult = await prisma.booking.aggregate({
      where: {
        event: {
          organizerId: organizer.id
        },
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      }
    });

    // Calculate total paid out amount
    const totalPaidOutResult = await prisma.payout.aggregate({
      where: {
        organizerId: organizer.id,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    const totalSales = Number(totalSalesResult._sum.totalAmount || 0);
    const totalPaidOut = Number(totalPaidOutResult._sum.amount || 0);
    const availableBalance = totalSales - totalPaidOut;

    return NextResponse.json({
      totalSales,
      totalPaidOut,
      availableBalance
    });
  } catch (error) {
    console.error('Error fetching payout stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout statistics' },
      { status: 500 }
    );
  }
}