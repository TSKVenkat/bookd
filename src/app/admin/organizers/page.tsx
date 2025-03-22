// app/admin/organizers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Organizer {
  id: string;
  businessName: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function Organizers() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrganizers = async (page = 1, status = 'ALL') => {
    try {
      setLoading(true);
      // This API endpoint would need to be implemented
      const response = await fetch(`/api/admin/organizers?page=${page}&limit=10&status=${status}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizers');
      }
      
      const data = await response.json();
      setOrganizers(data.organizers);
      setPagination(data.pagination);
    } catch (err) {
      setError('Error loading organizers. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers(1, statusFilter);
  }, [statusFilter]);

  const handlePageChange = (newPage: number) => {
    fetchOrganizers(newPage, statusFilter);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && organizers.length === 0) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-6">Organizers</h1>
      
      <div className="mb-6">
        <div className="flex mb-4">
          <select
            className="border p-2 rounded mr-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {organizers.length === 0 ? (
          <p>No organizers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Business Name</th>
                  <th className="py-2 px-4 border">Contact Person</th>
                  <th className="py-2 px-4 border">Email</th>
                  <th className="py-2 px-4 border">Status</th>
                  <th className="py-2 px-4 border">Registration Date</th>
                  <th className="py-2 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizers.map((organizer) => (
                  <tr key={organizer.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border">{organizer.businessName}</td>
                    <td className="py-2 px-4 border">{organizer.user.name}</td>
                    <td className="py-2 px-4 border">{organizer.user.email}</td>
                    <td className="py-2 px-4 border">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(organizer.status)}`}>
                        {organizer.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 border">
                      {new Date(organizer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-4 border">
                      <Link 
                        href={`/admin/organizers/${organizer.id}`}
                        className="text-blue-500 hover:underline"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center mt-4">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`mx-1 px-3 py-1 border ${
                  pagination.page === page ? 'bg-blue-500 text-white' : 'bg-white'
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