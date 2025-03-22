// types/organizer.ts
export interface OrganizerApplicationData {
    businessName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    panNumber: string;
    gstNumber?: string;
    aadhaarNumber: string;
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        bankName: string;
        branch?: string;
    };
    documents: {
        type: DocumentType;
        reference: string; // Cloudinary asset ID
        expiryDate?: string;
    }[];
}

export enum DocumentType {
    PAN_CARD = 'PAN_CARD',
    GST_CERTIFICATE = 'GST_CERTIFICATE',
    AADHAAR_CARD = 'AADHAAR_CARD',
    BUSINESS_PROOF = 'BUSINESS_PROOF',
    IDENTITY_PROOF = 'IDENTITY_PROOF',
    BANK_STATEMENT = 'BANK_STATEMENT',
    OTHER = 'OTHER'
}

export enum OrganizerStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    SUSPENDED = 'SUSPENDED'
}

export enum VerificationStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    REJECTED = 'REJECTED'
}