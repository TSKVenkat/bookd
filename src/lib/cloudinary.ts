// services/cloudinary.ts

import { v2 as cloudinary } from 'cloudinary';
import { createHash } from 'crypto';

// Initialize Cloudinary with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export const generateSignedUploadParams = (userId: string, documentType: string) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `organizers/${userId}/documents`;
    const publicId = `${folder}/${documentType}_${timestamp}`;

    // Generate a SHA-256 hash of the timestamp, folder, and document type
    const unique_filename = createHash('sha256')
        .update(`${userId}-${documentType}-${timestamp}`)
        .digest('hex')
        .substring(0, 16);

    // Create the signature
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp,
            folder,
            public_id: publicId,
            unique_filename,
            resource_type: 'image',
            type: 'private', // Very important - makes the asset private
            access_mode: 'authenticated', // Requires authentication to access
        },
        process.env.CLOUDINARY_API_SECRET as string
    );

    return {
        signature,
        timestamp,
        folder,
        publicId,
        apiKey: process.env.CLOUDINARY_API_KEY,
        resourceType: 'image',
        type: 'private',
        accessMode: 'authenticated',
    };
};

export const generateSignedViewUrl = async (assetId: string, expirySeconds = 300) => {
    // Generate a signed URL that's valid for a limited time (default 5 minutes)
    const url = cloudinary.url(assetId, {
        type: 'private',
        resource_type: 'image',
        sign_url: true,
        secure: true,
        secure_distribution: process.env.CLOUDINARY_SECURE_DISTRIBUTION,
        expires_at: Math.floor(Date.now() / 1000) + expirySeconds,
    });

    return url;
};