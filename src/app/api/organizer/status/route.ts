import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Authenticate user
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

    // Get organizer profile with related data
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            uploadedAt: true,
            verificationStatus: true
          }
        },
        approvalHistory: {
          include: {
            admin: {
              select: {
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
        { error: 'No organizer profile found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: organizer.id,
      businessName: organizer.businessName,
      status: organizer.status,
      createdAt: organizer.createdAt,
      documents: organizer.documents,
      approvalHistory: organizer.approvalHistory
    });

  } catch (error) {
    console.error('Status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application status' },
      { status: 500 }
    );
  }
} 