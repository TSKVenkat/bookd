// app/api/admin/organizers/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
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
    
    const organizerId = params.id;
    if (!organizerId) {
      return NextResponse.json(
        { error: 'Organizer ID is required' },
        { status: 400 }
      );
    }
    
    const { action, reason } = await request.json();
    
    if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action (APPROVED or REJECTED) is required' },
        { status: 400 }
      );
    }
    
    // Get organizer details
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId }
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }
    
    if (organizer.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Organizer has already been ${organizer.status.toLowerCase()}` },
        { status: 400 }
      );
    }
    
    // Update organizer status in a transaction
    await prisma.$transaction(async (prisma) => {
      // Update organizer status
      await prisma.organizer.update({
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
      
      // If approved, mark documents as verified
      if (action === 'APPROVED') {
        await prisma.organizerDocument.updateMany({
          where: { 
            organizerId,
            verificationStatus: 'PENDING'
          },
          data: { verificationStatus: 'VERIFIED' }
        });
      }
    });
    
    // Return success response
    return NextResponse.json({
      message: `Organizer ${action === 'APPROVED' ? 'approved' : 'rejected'} successfully`
    });
    
  } catch (error) {
    console.error('Organizer approval error:', error);
    return NextResponse.json(
      { error: 'An error occurred during the approval process' },
      { status: 500 }
    );
  }
}