// app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Get the Razorpay signature from headers
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }
    
    // Get the webhook payload
    const payload = await request.text();
    
    // Verify the webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET as string)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
    
    // Parse the payload
    const event = JSON.parse(payload);
    
    // Handle different event types
    if (event.event === 'payout.processed' || 
        event.event === 'payout.failed' || 
        event.event === 'payout.reversed') {
      
      const payoutId = event.payload.payout.entity.id;
      const status = event.payload.payout.entity.status;
      
      // Update payout status in database
      await prisma.organizerPayout.update({
        where: { razorpayPayoutId: payoutId },
        data: { 
          status,
          processedAt: status === 'processed' ? new Date() : undefined,
          failureReason: status === 'failed' ? event.payload.payout.entity.failure_reason : undefined
        }
      });
      
      // If payout failed, notify admin (in a production app, you would implement notifications)
      if (status === 'failed') {
        console.error(`Payout ${payoutId} failed: ${event.payload.payout.entity.failure_reason}`);
        // TODO: Implement admin notification
      }
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}