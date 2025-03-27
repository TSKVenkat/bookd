import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { OrganizerStatus, DocumentType, VerificationStatus, OrganizerApplicationData } from '@/types/organizer';

// Define interface for document in the request
interface DocumentInput {
  type: DocumentType;
  reference: string;
}

// Define interface for bank details in the request
interface BankDetailsInput {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  branch?: string;
}

// Define the request body interface
interface OrganizerApplicationRequest {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  panNumber: string;
  gstNumber?: string;
  aadhaarNumber: string;
  bankDetails: BankDetailsInput;
  documents: DocumentInput[];
}

export async function POST(request: Request) {
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

    // Check if user already has an organizer profile
    const existingOrganizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });

    if (existingOrganizer) {
      return NextResponse.json(
        { error: 'You already have an organizer profile' },
        { status: 400 }
      );
    }

    const data: OrganizerApplicationData = await request.json();

    // Validate required fields
    if (!data.businessName || !data.contactPerson || !data.email || !data.phone || 
        !data.panNumber || !data.aadhaarNumber || !data.bankDetails || !data.documents) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate bank details
    if (!data.bankDetails.accountNumber || !data.bankDetails.ifscCode || 
        !data.bankDetails.accountHolderName || !data.bankDetails.bankName) {
      return NextResponse.json(
        { error: 'Missing required bank details' },
        { status: 400 }
      );
    }

    // Validate required documents
    const requiredDocTypes = [
      DocumentType.PAN_CARD,
      DocumentType.AADHAAR_CARD,
      DocumentType.BUSINESS_PROOF
    ];

    const hasAllRequiredDocs = requiredDocTypes.every(
      type => data.documents.some((doc: { type: DocumentType }) => doc.type === type)
    );

    if (!hasAllRequiredDocs) {
      return NextResponse.json(
        { error: 'Missing required documents' },
        { status: 400 }
      );
    }

    // Create organizer profile with associated data in a transaction
    const organizer = await prisma.$transaction(async (prisma) => {
      // Create organizer
      const organizer = await prisma.organizer.create({
        data: {
          userId: user.id,
          businessName: data.businessName,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address || '',
          panNumber: data.panNumber,
          gstNumber: data.gstNumber || '',
          aadhaarNumber: data.aadhaarNumber,
          status: OrganizerStatus.PENDING,
          bankAccount: {
            create: {
              accountNumber: data.bankDetails.accountNumber,
              ifscCode: data.bankDetails.ifscCode,
              accountHolderName: data.bankDetails.accountHolderName,
              bankName: data.bankDetails.bankName,
              branch: data.bankDetails.branch
            }
          }
        }
      });

      // Create documents
      await Promise.all(
        data.documents.map((doc: { type: DocumentType; reference: string }) => 
          prisma.organizerDocument.create({
            data: {
              organizerId: organizer.id,
              documentType: doc.type,
              documentReference: doc.reference,
              verificationStatus: VerificationStatus.PENDING
            }
          })
        )
      );

      return organizer;
    });

    // Update user role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'organizer' }
    });

    return NextResponse.json({
      message: 'Application submitted successfully',
      organizerId: organizer.id
    });

  } catch (error) {
    console.error('Organizer application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}