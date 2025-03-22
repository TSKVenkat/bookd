// app/api/uploads/signed-url/route.ts
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function POST(request: Request) {
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
    
    const { fileType, documentType } = await request.json();
    
    if (!fileType || !documentType) {
      return NextResponse.json(
        { error: 'File type and document type are required' },
        { status: 400 }
      );
    }
    
    // Validate file type (only accept PDF and images)
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and PDF are supported.' },
        { status: 400 }
      );
    }
    
    // Generate a unique folder path including user ID to prevent conflicts
    const folderPath = `organizers/${user.id}/${documentType.toLowerCase()}`;
    
    // Generate timestamp and signature for secure upload
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Create parameters for the upload
    const params = {
      timestamp,
      folder: folderPath,
      // Set access mode to authenticated to ensure documents are private
      access_mode: 'authenticated',
      // Add document type as a tag for easier management
      tags: [`document_type:${documentType}`, `user_id:${user.id}`]
    };
    
    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET as string
    );
    
    // Return signed upload URL and parameters
    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: folderPath
    });
    
  } catch (error) {
    console.error('Signed URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}