import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Authenticate user
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

    // Get total sales
    const totalSales = await prisma.booking.aggregate({
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

    // Get completed payouts
    const completedPayouts = await prisma.payout.aggregate({
      where: {
        organizerId: organizer.id,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Calculate pending payouts (total sales - completed payouts)
    const pendingPayouts = (totalSales._sum.totalAmount || 0) - (completedPayouts._sum.amount || 0);

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: {
        event: {
          organizerId: organizer.id
        }
      },
      include: {
        event: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get payout history
    const payoutHistory = await prisma.payout.findMany({
      where: {
        organizerId: organizer.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      totalSales: totalSales._sum.totalAmount || 0,
      pendingPayouts,
      completedPayouts: completedPayouts._sum.amount || 0,
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        eventId: booking.eventId,
        eventName: booking.event.name,
        ticketCount: booking.ticketCount,
        totalAmount: booking.totalAmount,
        status: booking.status,
        createdAt: booking.createdAt
      })),
      payoutHistory: payoutHistory.map(payout => ({
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        createdAt: payout.createdAt
      }))
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 