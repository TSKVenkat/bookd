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

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email to organizer about ticket sales
export async function sendTicketSaleNotification(
  organizerEmail: string,
  eventName: string,
  ticketCount: number,
  totalAmount: number,
  customerName: string
) {
  try {
    await transporter.sendMail({
      from: `"Event Platform" <${process.env.EMAIL_FROM}>`,
      to: organizerEmail,
      subject: `New Ticket Sale for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Ticket Sale</h2>
          <p>Hello,</p>
          <p>You have a new ticket sale for your event <strong>${eventName}</strong>.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Tickets Purchased:</strong> ${ticketCount}</p>
            <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
          </div>
          <p>Log in to your dashboard to view more details.</p>
          <p>Thank you for using our platform!</p>
        </div>
      `
    });
    
    console.log(`Ticket sale notification sent to ${organizerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending ticket sale notification:', error);
    return false;
  }
}

// Send email to customer with ticket details
export async function sendTicketConfirmation(
  customerEmail: string,
  eventName: string,
  eventDate: Date,
  venueName: string,
  tickets: any[],
  totalAmount: number,
  bookingReference: string
) {
  try {
    const ticketListHtml = tickets.map(ticket => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.ticketType.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : 'General Admission'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${ticket.ticketType.price.toFixed(2)}</td>
      </tr>
    `).join('');

    await transporter.sendMail({
      from: `"Event Platform" <${process.env.EMAIL_FROM}>`,
      to: customerEmail,
      subject: `Your Tickets for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Ticket Confirmation</h2>
          <p>Hello,</p>
          <p>Thank you for purchasing tickets to <strong>${eventName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Date:</strong> ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString()}</p>
            <p><strong>Venue:</strong> ${venueName}</p>
            <p><strong>Booking Reference:</strong> ${bookingReference}</p>
          </div>
          
          <h3>Your Tickets</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Ticket Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Seat</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${ticketListHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 8px; font-weight: bold;">$${totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="margin-top: 20px;">Please bring this confirmation or your booking reference to the event.</p>
          <p>We hope you enjoy the event!</p>
        </div>
      `
    });
    
    console.log(`Ticket confirmation sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending ticket confirmation:', error);
    return false;
  }
}

// Send email notification about seatmap changes
export async function sendSeatMapUpdateNotification(
  organizerEmail: string,
  eventName: string,
  totalSeats: number
) {
  try {
    await transporter.sendMail({
      from: `"Event Platform" <${process.env.EMAIL_FROM}>`,
      to: organizerEmail,
      subject: `Seat Map Updated for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Seat Map Updated</h2>
          <p>Hello,</p>
          <p>The seat map for your event <strong>${eventName}</strong> has been updated.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Total Seats:</strong> ${totalSeats}</p>
            <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Log in to your dashboard to view the updated seat map.</p>
          <p>Thank you for using our platform!</p>
        </div>
      `
    });
    
    console.log(`Seat map update notification sent to ${organizerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending seat map update notification:', error);
    return false;
  }
}