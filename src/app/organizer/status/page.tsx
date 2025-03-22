'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { OrganizerStatus, DocumentType, VerificationStatus } from '@/types/organizer';

interface Document {
  id: string;
  documentType: DocumentType;
  uploadedAt: string;
  verificationStatus: VerificationStatus;
}

interface ApprovalHistory {
  id: string;
  previousStatus: OrganizerStatus;
  newStatus: OrganizerStatus;
  reason: string | null;
  createdAt: string;
  admin: {
    name: string;
  };
}

interface OrganizerApplication {
  id: string;
  businessName: string;
  status: OrganizerStatus;
  createdAt: string;
  documents: Document[];
  approvalHistory: ApprovalHistory[];
}

export default function OrganizerStatusPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [application, setApplication] = useState<OrganizerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/organizer/status');
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/organizer/apply');
            return;
          }
          throw new Error('Failed to fetch application status');
        }
        
        const data = await response.json();
        setApplication(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStatus();
    }
  }, [user, authLoading, router]);

  const getStatusColor = (status: OrganizerStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600';
      case 'REJECTED':
        return 'text-red-600';
      case 'SUSPENDED':
        return 'text-orange-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getDocumentStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return 'text-green-600';
      case 'REJECTED':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white px-8 py-6 shadow rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white px-8 py-6 shadow rounded-lg">
          <h1 className="text-2xl font-bold mb-6">Application Status</h1>
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Business Details</h2>
              <span className={`font-semibold ${getStatusColor(application.status)}`}>
                {application.status}
              </span>
            </div>
            <p><span className="font-medium">Business Name:</span> {application.businessName}</p>
            <p><span className="font-medium">Applied On:</span> {new Date(application.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            <div className="space-y-4">
              {application.documents.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <p className="font-medium">{doc.documentType.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`font-medium ${getDocumentStatusColor(doc.verificationStatus)}`}>
                      {doc.verificationStatus}
                    </span>
                    <button
                      onClick={() => router.push(`/organizer/documents/${doc.id}/view`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {application.approvalHistory.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Application History</h2>
              <div className="space-y-4">
                {application.approvalHistory.map((history) => (
                  <div key={history.id} className="p-4 border rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">
                        Status changed from {history.previousStatus} to{' '}
                        <span className={getStatusColor(history.newStatus)}>
                          {history.newStatus}
                        </span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(history.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {history.reason && (
                      <p className="text-sm text-gray-600">
                        Reason: {history.reason}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      By: {history.admin.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <div className="mt-6">
              <button
                onClick={() => router.push('/organizer/apply')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Apply Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 