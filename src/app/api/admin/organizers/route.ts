// app/api/admin/organizers/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    // Authenticate admin
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = await validateSession(sessionToken);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'ALL';
    const skip = (page - 1) * limit;
    
    // Build the filter
    const filter: any = {};
    if (status !== 'ALL') {
      filter.status = status;
    }
    
    // Get organizers with filtering
    const [organizers, totalCount] = await Promise.all([
      prisma.organizer.findMany({
        where: filter,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.organizer.count({
        where: filter
      })
    ]);
    
    // Calculate pagination info
    const pages = Math.ceil(totalCount / limit);
    
    // Log this access for audit purposes
    await prisma.adminAuditLog.create({
      data: {
        id: uuidv4(),
        adminId: user.id,
        action: 'LIST_ORGANIZERS',
        resourceType: 'ORGANIZER',
        resourceId: "all",
        details: JSON.stringify({
          filters: { status },
          page,
          limit
        })
      }
    });
    
    // Return organizers with pagination info
    return NextResponse.json({
      organizers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages
      }
    });
    
  } catch (error) {
    console.error('Organizers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizers' },
      { status: 500 }
    );
  }
}