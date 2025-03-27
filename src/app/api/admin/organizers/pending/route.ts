// app/api/admin/organizers/pending/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingOrganizers = await prisma.organizer.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        documents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(pendingOrganizers);
  } catch (error) {
    console.error('Error fetching pending organizers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizerId, action, reason } = body;

    if (!organizerId || !action || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Update organizer status
    const organizer = await prisma.organizer.update({
      where: { id: organizerId },
      data: { status: action }
    });

    // Create approval history record
    await prisma.approvalHistory.create({
      data: {
        organizerId,
        adminId: user.id,
        previousStatus: 'PENDING',
        newStatus: action,
        reason: reason || null
      }
    });

    // If approved, update user role
    if (action === 'APPROVED') {
      await prisma.user.update({
        where: { id: organizer.userId },
        data: { role: 'organizer' }
      });
    }

    return NextResponse.json({
      message: `Organizer ${action.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Error processing organizer action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}