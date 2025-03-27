// app/api/payments/payout/route.ts
import { NextResponse } from 'next/server';
import { validateSessionFromCookies } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    // Parse request body
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payout amount' },
        { status: 400 }
      );
    }

    // Verify available balance
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

    const completedPayouts = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM "Payout" 
      WHERE "organizerId" = ${organizer.id} 
      AND status = 'COMPLETED'
    `;

    const totalSalesAmount = Number(totalSales._sum.totalAmount || 0);
    const totalPayoutsAmount = Number(completedPayouts[0]?.total || 0);
    const availableBalance = totalSalesAmount - totalPayoutsAmount;

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: 'Insufficient balance for payout' },
        { status: 400 }
      );
    }

    // Create payout request
    const payout = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Payout" ("id", "organizerId", "amount", "status", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${organizer.id},
        ${amount},
        'PENDING',
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({
      message: 'Payout request created successfully',
      payoutId: payout[0].id
    });

  } catch (error) {
    console.error('Payout request error:', error);
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    );
  }
}