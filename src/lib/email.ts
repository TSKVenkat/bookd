// src/lib/email.ts
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Configure email transport
const createTransport = () => {
  // Use actual SMTP settings for all environments
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send email
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransport();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@bookd.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback plain text
      html,
    };

    // For development, log email content for debugging purposes
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email being sent:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', html);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  
  const subject = 'Reset Your Bookd Password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Reset Your Bookd Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>The Bookd Team</p>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser: ${resetUrl}</p>
    </div>
  `;
  
  return await sendEmail({ to: email, subject, html });
}