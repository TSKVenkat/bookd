import { compare, hash } from 'bcryptjs';
import prisma from './prisma';
import { User, AuthResponse } from '../types/auth';
import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  token?: string;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);
const TOKEN_EXPIRY = '24h';

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

// Compare password with hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// Generate JWT token
export async function generateToken(user: { id: string, role: string }): Promise<string> {
  const token = await new SignJWT({ 
    userId: user.id,
    role: user.role 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<{ userId: string, role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      role: payload.role as string
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Create session in database
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
  
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });
  
  return token;
}

// Validate session
export async function validateSession(token: string): Promise<UserSession | null> {
  try {
    // First verify the JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    
    if (!userId) {
      return null;
    }

    // Then check the database for the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user',
      token
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Invalidate session (logout)
export async function invalidateSession(token: string): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: { token }
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Create password reset token
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    return null;
  }
  
  const resetToken = randomBytes(32).toString('hex');
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // Token valid for 1 hour
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry: expiry
    }
  });
  
  return resetToken;
}

// Reset password with token
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date() // Token must not be expired
      }
    }
  });
  
  if (!user) {
    return false;
  }
  
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

// Get safe user object (without sensitive data)
export function getSafeUser(user: any): User {
  const { hashedPassword, resetToken, resetTokenExpiry, ...safeUser } = user;
  return safeUser;
}

export async function getServerSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return null;
    }
    
    return validateSession(token);
  } catch (error) {
    console.error('Get server session error:', error);
    return null;
  }
}