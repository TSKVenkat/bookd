import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT } from 'jose';

declare module 'uuid';

// JWT Secret
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_for_dev'
);

export const runtime = 'nodejs';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    
    // Basic validation
    if (!email || !password || !name || password.length < 8) {
      return NextResponse.json(
        { error: 'Invalid input data. Password must be at least 8 characters.' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword
      }
    });
    
    // Generate JWT token
    const token = await generateToken(user);
    
    // Create session with JWT token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    const session = await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: token,
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
        role: user.role
      },
      token: session.token
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}