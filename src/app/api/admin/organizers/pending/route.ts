// app/api/admin/organizers/pending/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { OrganizerStatus } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Authenticate admin
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get total count of pending applications
    const totalCount = await prisma.organizer.count({
      where: {
        status: OrganizerStatus.PENDING
      }
    });
    
    // Get pending applications with pagination
    const applications = await prisma.organizer.findMany({
      where: {
        status: OrganizerStatus.PENDING
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            uploadedAt: true,
            verificationStatus: true
          }
        },
        bankAccount: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    return NextResponse.json({
      applications,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Pending organizers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending applications' },
      { status: 500 }
    );
  }
}