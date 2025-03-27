import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT } from 'jose';

// Type declarations for modules without types
declare module 'uuid';

export const runtime = 'nodejs';

// JWT Secret
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_for_dev'
);

// JWT token generation
const generateToken = async (user: any): Promise<string> => {
  const payload = { 
    userId: user.id, 
    email: user.email, 
    role: user.role 
  };
  
  console.log('Creating JWT with payload:', payload);
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizer: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = await generateToken(user);
    
    // Create session with JWT token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    const session = await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: token, // Include the JWT token
        expiresAt
      }
    });
    
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'session_token',
      value: session.token,
      httpOnly: true,
      path: '/',
      expires: expiresAt,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Return user data and token
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizer: user.organizer
      },
      token: session.token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}