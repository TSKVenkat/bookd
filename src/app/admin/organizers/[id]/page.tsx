// app/admin/organizers/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Document {
  id: string;
  documentType: string;
  uploadedAt: string;
  verificationStatus: string;
}

interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Organizer {
  id: string;
  businessName: string;
  status: string;
  createdAt: string;
  email: string;
  phone: string;
  address: string;
  gstin: string | null;
  panNumber: string;
  user: User;
  documents: Document[];
  bankAccount: BankAccount | null;
}

export default function OrganizerDetail() {
  const router = useRouter();
  const params = useParams();
  const organizerId = params.id as string;
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    const fetchOrganizerDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/organizers/${organizerId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch organizer details');
        }
        
        const data = await response.json();
        setOrganizer(data);
      } catch (err) {
        setError('Error loading organizer details. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerDetails();
  }, [organizerId]);

  const handleDocumentPreview = async (documentId: string) => {
    try {
      const response = await fetch(`/api/admin/documents/${documentId}/preview`);
      
      if (!response.ok) {
        throw new Error('Failed to generate preview URL');
      }
      
      const data = await response.json();
      setPreviewUrl(data.url);
      
      // Open the preview in a new tab
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Failed to preview document:', err);
      alert('Failed to generate document preview. Please try again.');
    }
  };

  const handleApprove = async () => {
    if (confirm('Are you sure you want to approve this organizer?')) {
      setProcessingAction(true);
      try {
        const response = await fetch(`/api/admin/organizers/${organizerId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'APPROVED' }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to approve organizer');
        }
        
        alert('Organizer approved successfully!');
        router.push('/admin/dashboard');
      } catch (err) {
        console.error('Failed to approve organizer:', err);
        alert('Failed to approve organizer. Please try again.');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  const handleReject = async () => {
    setShowRejectForm(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/organizers/${organizerId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'REJECTED',
          reason: rejectionReason 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject organizer');
      }
      
      alert('Organizer rejected successfully!');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Failed to reject organizer:', err);
      alert('Failed to reject organizer. Please try again.');
    } finally {
      setProcessingAction(false);
      setShowRejectForm(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error || !organizer) {
    return <div className="p-6 text-red-500">{error || 'Organizer not found'}</div>;
  }

  return (
    <div className="p-6 text-black">
      <div className="mb-4">
        <button 
          onClick={() => router.push('/admin/dashboard')}
          className="text-blue-500 hover:underline"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Review Organizer Application</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Business Information</h2>
          <div className="bg-white p-4 border rounded shadow">
            <div className="mb-4">
              <p className="font-semibold">Business Name</p>
              <p>{organizer.businessName}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold">Contact Person</p>
              <p>{organizer.user.name}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold">Email</p>
              <p>{organizer.email || organizer.user.email}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold">Phone</p>
              <p>{organizer.phone}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold">Address</p>
              <p>{organizer.address}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold">PAN Number</p>
              <p>{organizer.panNumber}</p>
            </div>
            {organizer.gstin && (
              <div className="mb-4">
                <p className="font-semibold">GSTIN</p>
                <p>{organizer.gstin}</p>
              </div>
            )}
          </div>

          {organizer.bankAccount && (
            <>
              <h2 className="text-xl font-semibold mt-6 mb-4">Bank Account Information</h2>
              <div className="bg-white p-4 border rounded shadow">
                <div className="mb-4">
                  <p className="font-semibold">Account Holder Name</p>
                  <p>{organizer.bankAccount.accountHolderName}</p>
                </div>
                <div className="mb-4">
                  <p className="font-semibold">Account Number</p>
                  <p>{organizer.bankAccount.accountNumber}</p>
                </div>
                <div className="mb-4">
                  <p className="font-semibold">IFSC Code</p>
                  <p>{organizer.bankAccount.ifscCode}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Documents</h2>
          {organizer.documents.length === 0 ? (
            <p>No documents submitted.</p>
          ) : (
            <div className="bg-white p-4 border rounded shadow">
              {organizer.documents.map((doc) => (
                <div key={doc.id} className="mb-4 p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{doc.documentType}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: {doc.verificationStatus}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDocumentPreview(doc.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-xl font-semibold mt-6 mb-4">Actions</h2>
          <div className="bg-white p-4 border rounded shadow">
            {showRejectForm ? (
              <div>
                <h3 className="font-semibold mb-2">Provide reason for rejection:</h3>
                <textarea
                  className="w-full p-2 border rounded mb-4"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter detailed reason for rejection..."
                ></textarea>
                <div className="flex space-x-4">
                  <button
                    onClick={submitRejection}
                    disabled={processingAction}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
                  >
                    {processingAction ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    disabled={processingAction}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 disabled:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-4">
                <button
                  onClick={handleApprove}
                  disabled={processingAction}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  {processingAction ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingAction}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
                >
                  {processingAction ? 'Processing...' : 'Reject'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}