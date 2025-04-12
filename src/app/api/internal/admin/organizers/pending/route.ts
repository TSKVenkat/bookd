import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OrganizerStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { validateSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Validate internal request
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Invalid authorization header' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const session = await validateSession(token);
    
    if (!session || session.role !== 'admin') {
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
    
    // Get pending organizers with pagination
    const [applications, totalCount] = await Promise.all([
      prisma.organizer.findMany({
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
          bankAccount: {
            select: {
              id: true,
              accountHolderName: true,
              accountNumber: true,
              ifscCode: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.organizer.count({
        where: {
          status: OrganizerStatus.PENDING
        }
      })
    ]);
    
    // Calculate pagination info
    const pages = Math.ceil(totalCount / limit);
    
    // Log this access for audit purposes
    await prisma.adminAuditLog.create({
      data: {
        id: uuidv4(),
        adminId: session.id,
        action: 'LIST_PENDING_ORGANIZERS',
        resourceType: 'ORGANIZER',
        resourceId: 'pending',
        details: JSON.stringify({
          page,
          limit
        })
      }
    });
    
    return NextResponse.json({
      applications,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages
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