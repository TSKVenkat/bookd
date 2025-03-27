import { compare, hash } from 'bcryptjs';
import prisma from './prisma';
import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Constants
const TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'session_token';

// Secret key with fallback
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET
);

// Types
export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Password Hashing
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// JWT Token Management
export async function generateToken(user: { id: string; role: string }): Promise<string> {
  const payload = {
    userId: user.id,
    role: user.role
  };
  
  console.log('Creating token with payload:', payload);
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    // Log the payload to debug
    console.log('JWT payload:', payload);
    
    // Check if userId exists in the payload
    const userId = payload.userId as string;
    if (!userId) {
      console.error('Missing userId in JWT payload');
      return null;
    }
    
    // Check if role exists in the payload, default to 'user' if missing
    const role = (payload.role as string) || 'user';
    
    return { userId, role };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Session Management
export async function createSession(userId: string): Promise<string> {
  const userRecord = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { role: true }
  });
  
  const role = userRecord?.role || 'user';
  
  const token = await generateToken({ 
    id: userId, 
    role
  });

  const session = await prisma.session.create({
    data: {
      id: randomBytes(32).toString('hex'),
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  });

  return session.token;
}

// Cookie Management
export async function getSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      console.log('No session token found in cookies');
      return undefined;
    }
    
    return token;
  } catch (error) {
    console.error('Error retrieving session token:', error);
    return undefined;
  }
}

// Session Validation
export async function validateSession(token: string): Promise<UserSession | null> {
  try {
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      console.error('validateSession: Invalid or missing userId in token', decoded);
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      console.error(`validateSession: User not found for ID: ${decoded.userId}`);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Main Authentication Function
export async function validateSessionFromCookies(): Promise<UserSession | null> {
  try {
    const token = await getSessionToken();
    if (!token) {
      console.log('No token found in cookies during validation');
      return null;
    }
    
    const session = await validateSession(token);
    if (!session) {
      console.log('Invalid or expired session token');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error validating session from cookies:', error);
    return null;
  }
}

// Password Reset
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const resetToken = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry: expiry
    }
  });

  return resetToken;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() }
    }
  });

  if (!user) return false;

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  return true;
}

// Session Cleanup
export async function invalidateSession(token: string): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: { token }
    });
    return true;
  } catch {
    return false;
  }
}

// Role Checks
export function isAdmin(user: { role?: string }) {
  return user?.role === 'admin';
}

export function isOrganizer(session: UserSession | null): boolean {
  return session?.role === 'organizer';
}

export function isVenueStaff(session: UserSession | null): boolean {
  return session?.role === 'venue_staff';
}