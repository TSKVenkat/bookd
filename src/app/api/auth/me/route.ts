import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies, getSessionToken, verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get raw token first for debugging
    const token = await getSessionToken();
    if (!token) {
      console.log('[/api/auth/me] No session token found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Try to manually verify the token
    console.log('[/api/auth/me] Got token, verifying...');
    const decoded = await verifyToken(token);
    if (!decoded) {
      console.log('[/api/auth/me] Token verification failed');
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }
    
    console.log('[/api/auth/me] Token decoded successfully:', decoded);
    
    // Get the user session with the validated session
    const user = await validateSessionFromCookies();
    
    if (!user) {
      console.log('[/api/auth/me] No authenticated user found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    console.log('[/api/auth/me] Authenticated user found:', user.id);
    
    // Get the full user profile from the database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizer: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
    
    if (!userProfile) {
      console.error(`[/api/auth/me] User profile not found for ID: ${user.id}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { user: userProfile },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[/api/auth/me] Get user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}