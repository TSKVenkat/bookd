// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

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
  user: User;
  documents: Document[];
  bankAccount: BankAccount | null;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [pendingApplications, setPendingApplications] = useState<Organizer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, authLoading, router]);

  const fetchPendingApplications = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/organizers/pending?page=${page}&limit=10`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pending applications');
      }
      
      const data = await response.json();
      setPendingApplications(data.applications);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading applications. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingApplications();
    }
  }, [user]);

  if (authLoading || (loading && pendingApplications.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Let the useEffect handle redirect
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-500 hover:underline"
        >
          Back to Main Dashboard
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Pending Organizer Applications ({pagination.total})
        </h2>
        
        {pendingApplications.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <p>No pending applications found.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left">Business Name</th>
                    <th className="py-3 px-4 text-left">Contact Person</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Applied On</th>
                    <th className="py-3 px-4 text-left">Documents</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplications.map((organizer) => (
                    <tr key={organizer.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-3 px-4">{organizer.businessName}</td>
                      <td className="py-3 px-4">{organizer.user.name}</td>
                      <td className="py-3 px-4">{organizer.user.email}</td>
                      <td className="py-3 px-4">
                        {new Date(organizer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {organizer.documents.length} documents
                      </td>
                      <td className="py-3 px-4">
                        <Link 
                          href={`/admin/organizers/${organizer.id}`}
                          className="text-blue-500 hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchPendingApplications(page)}
                className={`px-4 py-2 rounded ${
                  pagination.page === page 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}