import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Constants
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-for-development-only'
);

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

// Auth-only paths that logged-in users should be redirected from
const authRedirectPaths = [
  '/login',
  '/register',
  '/reset-password'
];

// Role-specific paths
const roleRestrictedPaths = {
  admin: ['/admin', '/api/admin'],
  organizer: ['/organizer', '/api/organizer'],
  venue_staff: ['/venue', '/api/venue']
};

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  
  if (!token) {
    console.log('No session token found in cookies');
    return null;
  }

  try {
    console.log('Verifying token in middleware');
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    console.log('JWT payload in middleware:', payload);
    
    // Extract userId and ensure it exists
    const userId = payload.userId as string;
    if (!userId) {
      console.error('Missing userId in JWT payload:', payload);
      return null;
    }
    
    // Extract role, default to 'user' if not specified
    const role = (payload.role as string) || 'user';
    
    return { userId, role };
  } catch (error) {
    console.error('Token verification error in middleware:', error);
    return null;
  }
}

function matchesPath(pathname: string, paths: string[]) {
  return paths.some(path => pathname === path || pathname.startsWith(path + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths without authentication
  if (matchesPath(pathname, publicPaths)) {
    return NextResponse.next();
  }

  // Verify authentication
  const auth = await verifyAuth(request);
  
  // If authenticated and trying to access auth pages, redirect to dashboard
  if (auth && matchesPath(pathname, authRedirectPaths)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If not authenticated, handle appropriately
  if (!auth) {
    // For API requests, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For page requests, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle role-specific access
  const userRole = auth.role;
  
  // Check admin paths
  if (matchesPath(pathname, roleRestrictedPaths.admin) && userRole !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check organizer paths (except /organizer/apply)
  if (matchesPath(pathname, roleRestrictedPaths.organizer)) {
    if (pathname === '/organizer/apply' || pathname === '/api/organizer/apply') {
      return NextResponse.next();
    }
    if (userRole !== 'organizer') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Check venue staff paths
  if (matchesPath(pathname, roleRestrictedPaths.venue_staff) && userRole !== 'venue_staff') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow authenticated request to proceed
  return NextResponse.next();
}

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