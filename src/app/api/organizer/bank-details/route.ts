// app/api/organizer/bank-details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // First, find the organizer record using the user's ID
    // Using findFirst with a filter on email since email isn't a unique field in the schema
    const organizer = await prisma.organizer.findFirst({
      where: {
        email: { equals: user.email }
      },
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    // Now get bank details using the organizer ID
    const bankAccount = await prisma.bankAccount.findUnique({
      where: {
        organizerId: organizer.id,
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { message: 'No bank details found' },
        { status: 404 }
      );
    }

    return NextResponse.json(bankAccount);
  } catch (error) {
    console.error('Error fetching bank details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank details' },
      { status: 500 }
    );
  }
}

// Update the POST and PUT handlers similarly
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Find the organizer record using email as a filter
    const organizer = await prisma.organizer.findFirst({
      where: {
        email: { equals: user.email }
      },
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['accountNumber', 'ifscCode', 'accountHolderName', 'bankName'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if the user already has bank details
    const existingAccount = await prisma.bankAccount.findUnique({
      where: {
        organizerId: organizer.id,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Bank account details already exist. Use PUT to update.' },
        { status: 400 }
      );
    }

    // Create new bank details
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizerId: organizer.id,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        branch: data.branch || null,
      },
    });

    return NextResponse.json(bankAccount, { status: 201 });
  } catch (error) {
    console.error('Error creating bank details:', error);
    return NextResponse.json(
      { error: 'Failed to create bank details' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Find the organizer record using email as a filter
    const organizer = await prisma.organizer.findFirst({
      where: {
        email: { equals: user.email }
      },
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['accountNumber', 'ifscCode', 'accountHolderName', 'bankName'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Update existing bank details
    const bankAccount = await prisma.bankAccount.update({
      where: {
        organizerId: organizer.id,
      },
      data: {
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        branch: data.branch || null,
      },
    });

    return NextResponse.json(bankAccount);
  } catch (error) {
    console.error('Error updating bank details:', error);
    return NextResponse.json(
      { error: 'Failed to update bank details' },
      { status: 500 }
    );
  }
}