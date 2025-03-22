// src/app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import { createPasswordResetToken, resetPasswordWithToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { ResetPasswordRequest, PasswordResetData } from '@/types/auth';

// Request password reset
export async function POST(request: Request) {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const resetToken = await createPasswordResetToken(email);

    if (!resetToken) {
      // Don't reveal that the email doesn't exist for security reasons
      return NextResponse.json(
        { message: 'If this email exists, a password reset link has been sent' },
        { status: 200 }
      );
    }

    // Send the reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (!emailSent && process.env.NODE_ENV === 'production') {
      console.error(`Failed to send password reset email to ${email}`);
      // Don't reveal the failure to the client for security
    }

    return NextResponse.json(
      {
        message: 'If this email exists, a password reset link has been sent',
        // Include token in development only, for testing
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'An error occurred during password reset request' },
      { status: 500 }
    );
  }
}

// Reset password with token
export async function PUT(request: Request) {
  try {
    const body: PasswordResetData = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Invalid token or password. Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const success = await resetPasswordWithToken(token, newPassword);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'An error occurred during password reset' },
      { status: 500 }
    );
  }
}