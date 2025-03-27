import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionToken, invalidateSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const token = await getSessionToken();
    
    if (token) {
      // Try to invalidate the session in database
      await invalidateSession(token);
    }
    
    // Clear the session cookie regardless
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'session_token',
      value: '',
      expires: new Date(0),
      path: '/'
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if there was an error
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'session_token',
      value: '',
      expires: new Date(0),
      path: '/'
    });
    
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}