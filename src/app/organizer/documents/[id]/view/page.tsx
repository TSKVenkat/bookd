'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface DocumentDetails {
  id: string;
  documentType: string;
  uploadedAt: string;
  url: string;
}

export default function DocumentViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/organizer/documents/${params.id}/view`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch document');
        }
        
        const data = await response.json();
        setDocument(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDocument();
    }
  }, [params.id, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white px-8 py-6 shadow rounded-lg">
            <div className="mb-4">
              <button 
                onClick={() => router.back()}
                className="text-blue-500 hover:underline"
              >
                &larr; Back
              </button>
            </div>
            <p className="text-red-600">{error || 'Document not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white px-8 py-6 shadow rounded-lg">
          <div className="mb-6">
            <button 
              onClick={() => router.back()}
              className="text-blue-500 hover:underline"
            >
              &larr; Back to Application
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold">{document.documentType.replace(/_/g, ' ')}</h1>
            <p className="text-gray-500">
              Uploaded on: {new Date(document.uploadedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="aspect-[16/9] w-full bg-gray-100 rounded-lg overflow-hidden">
            {document.url.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={document.url}
                className="w-full h-full"
                title="Document Viewer"
              />
            ) : (
              <img
                src={document.url}
                alt={document.documentType}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 