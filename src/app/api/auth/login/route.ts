import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, getSafeUser } from '@/lib/auth';
import { LoginCredentials } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body: LoginCredentials = await request.json();
    const { email, password } = body;
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Check if user exists and password is correct
    if (!user || !(await verifyPassword(password, user.hashedPassword))) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      role: user.role || 'user'
    });
    
    // Set HTTP-only cookie with session token
    const response = NextResponse.json(
      { user: getSafeUser(user) },
      { status: 200 }
    );
    
    response.cookies.set({
      name: 'session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}