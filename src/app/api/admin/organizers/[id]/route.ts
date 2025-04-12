// app/api/admin/organizers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Use destructuring instead of awaiting params
    const { id: organizerId } = params;
    
    if (!organizerId) {
      return NextResponse.json(
        { error: 'Organizer ID is required' },
        { status: 400 }
      );
    }
    
    // Get organizer details with related data
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
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
            verificationStatus: true,
            documentReference: true
          }
        },
        bankAccount: true,
        approvalHistory: {
          include: {
            admin: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }
    
    // Log this access for audit purposes
    await prisma.adminAuditLog.create({
      data: {
        id: uuidv4(),
        adminId: user.id,
        action: 'VIEW_ORGANIZER',
        resourceType: 'ORGANIZER',
        resourceId: organizerId,
        details: JSON.stringify({
          organizerName: organizer.businessName
        })
      }
    });
    
    return NextResponse.json(organizer);
    
  } catch (error) {
    console.error('Organizer detail fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizer details' },
      { status: 500 }
    );
  }
}