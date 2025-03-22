import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken, getSafeUser, createSession } from '@/lib/auth';
import { RegisterData } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body: RegisterData = await request.json();
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
    const token = generateToken(user.id);
    
    // Create session
    const sessionToken = await createSession(user.id);
    
    // Set HTTP-only cookie with session token
    const response = NextResponse.json(
      { user: getSafeUser(user), token },
      { status: 201 }
    );
    
    response.cookies.set({
      name: 'session_token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return response;
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}