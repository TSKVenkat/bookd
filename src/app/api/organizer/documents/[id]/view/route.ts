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
  context: { params: { id: string } }
) {
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

    const { id: documentId } = context.params;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document with organizer details
    const document = await prisma.organizerDocument.findUnique({
      where: { id: documentId },
      include: {
        organizer: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user owns this document
    if (document.organizer.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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

    return NextResponse.json({
      id: document.id,
      documentType: document.documentType,
      uploadedAt: document.uploadedAt,
      url: signedUrl
    });

  } catch (error) {
    console.error('Document view error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document URL' },
      { status: 500 }
    );
  }
}
