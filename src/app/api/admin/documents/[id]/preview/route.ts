// app/api/admin/documents/[id]/preview/route.ts
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function GET(
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
    
    const documentId = params.id;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Get document details
    const document = await prisma.organizerDocument.findUnique({
      where: { id: documentId },
      include: { organizer: true }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Generate a short-lived signed URL (valid for 15 minutes)
    const signedUrl = cloudinary.url(document.documentReference, {
      secure: true,
      resource_type: 'auto',
      type: 'authenticated',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 900 // 15 minutes
    });
    
    // Log the access for audit purposes
    await prisma.adminAuditLog.create({
      data: {
        adminId: user.id,
        action: 'DOCUMENT_ACCESS',
        resourceType: 'ORGANIZER_DOCUMENT',
        resourceId: documentId,
        details: JSON.stringify({
          documentType: document.documentType,
          organizerId: document.organizerId,
          organizerName: document.organizer.businessName
        })
      }
    });
    
    // Return the signed URL
    return NextResponse.json({ url: signedUrl });
    
  } catch (error) {
    console.error('Document preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document preview URL' },
      { status: 500 }
    );
  }
}