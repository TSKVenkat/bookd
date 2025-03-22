import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force runtime to be Node.js
export const runtime = 'nodejs';

// IMPORTANT: This route should only be used in development
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This route is not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    console.log('Received request body:', body);

    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to update user with email:', email);

    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      );
    }

    const user = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log('Successfully updated user:', user);

    return NextResponse.json({
      message: 'User successfully made admin',
      user
    });

  } catch (error) {
    console.error('Make admin error:', error);
    return NextResponse.json(
      { error: 'Failed to make user admin', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 