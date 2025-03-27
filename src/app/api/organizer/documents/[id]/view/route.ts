import { NextResponse } from 'next/server';
import { validateSessionFromCookies } from '@/lib/auth';
import prisma from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Ensure params is properly awaited
    const { id: documentId } = params;
    
    // Check if the document exists
    const document = await prisma.organizerDocument.findUnique({
      where: { id: documentId },
      include: {
        organizer: true
      }
    });
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    // Check if the user is authorized to view this document
    if (document.organizer.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Get the document from Cloudinary
    try {
      // Generate a signed URL with a short expiration
      const result = cloudinary.utils.api_sign_request({
        public_id: document.documentReference,
        timestamp: Math.floor(Date.now() / 1000)
      }, process.env.CLOUDINARY_API_SECRET!);
      
      const signedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/${document.documentReference}?signature=${result}&timestamp=${Math.floor(Date.now() / 1000)}`;
      
      return NextResponse.json({ url: signedUrl });
    } catch (cloudinaryError) {
      console.error("Cloudinary error:", cloudinaryError);
      return NextResponse.json({ error: "Failed to retrieve document" }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Error retrieving document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
