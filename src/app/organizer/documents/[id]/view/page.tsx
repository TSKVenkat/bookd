'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function DocumentViewPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchDocument = async () => {
      if (authLoading || !user) return;
      
      try {
        const response = await fetch(`/api/organizer/documents/${documentId}/view`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch document');
        }
        
        const data = await response.json();
        setDocumentUrl(data.url);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
    
    // Redirect non-authenticated users
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [documentId, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !documentUrl) {
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
            <h1 className="text-2xl font-bold">{documentUrl.split('.').slice(0, -1).join(' ')}</h1>
            <p className="text-gray-500">
              Uploaded on: {new Date(documentUrl.split('.').slice(-1)[0]).toLocaleDateString()}
            </p>
          </div>

          <div className="aspect-[16/9] w-full bg-gray-100 rounded-lg overflow-hidden">
            {documentUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={documentUrl}
                className="w-full h-full"
                title="Document Viewer"
              />
            ) : (
              <img
                src={documentUrl}
                alt={documentUrl.split('.').slice(0, -1).join(' ')}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 