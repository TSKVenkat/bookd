import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  ...(process.env.NODE_ENV === 'development' ? ['/api/dev/make-admin'] : [])
];

// Auth-only paths that logged-in users should be redirected to
const authRedirectPaths = [
  '/login',
  '/register',
  '/reset-password'
];

// Admin-only paths
const adminPaths = [
  '/admin',
  '/api/admin'
];

// Organizer-only paths
const organizerPaths = [
  '/organizer',
  '/api/organizer'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for auth token in cookies first
  const sessionToken = request.cookies.get('session_token')?.value;
  let isAuthenticated = false;
  let isAdmin = false;
  let isOrganizer = false;
  
  if (sessionToken) {
    try {
      const decoded = await verifyToken(sessionToken);
      if (decoded) {
        isAuthenticated = true;
        isAdmin = decoded.role === 'admin';
        isOrganizer = decoded.role === 'organizer';
      }
    } catch (error) {
      console.error('Token verification error:', error);
    }
  }
  
  // If authenticated and trying to access login/register pages, redirect to appropriate dashboard
  if (isAuthenticated && authRedirectPaths.includes(pathname)) {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (isOrganizer) {
      return NextResponse.redirect(new URL('/organizer/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If not authenticated and path is public, allow access
  if (!isAuthenticated && publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }
  
  // Check for admin paths
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Check for organizer paths
  if (pathname.startsWith('/organizer') || pathname.startsWith('/api/organizer')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Special case for /organizer/apply - allow regular users to access it
    if (pathname === '/organizer/apply' || pathname === '/api/organizer/apply') {
      return NextResponse.next();
    }
    // For all other organizer paths, require organizer role
    if (!isOrganizer) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // If authenticated, allow request to proceed
  if (isAuthenticated) {
    return NextResponse.next();
  }
  
  // If API request, return 401 unauthorized
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // For page requests, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};