'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface Booking {
  id: string;
  eventId: string;
  eventName: string;
  ticketCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface DashboardData {
  totalSales: number;
  pendingPayouts: number;
  completedPayouts: number;
  recentBookings: Booking[];
  payoutHistory: Payout[];
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    recentBookings: [],
    payoutHistory: []
  });
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'organizer') {
        router.push('/dashboard');
        return;
      }
      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizer/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    try {
      setRequestingPayout(true);
      const response = await fetch('/api/payments/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: dashboardData.pendingPayouts
        })
      });

      if (!response.ok) {
        throw new Error('Failed to request payout');
      }

      await fetchDashboardData(); // Refresh data after payout request
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your ticket sales and manage payouts
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                ₹{dashboardData.totalSales.toFixed(2)}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Pending Payouts</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                ₹{dashboardData.pendingPayouts.toFixed(2)}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Paid Out</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                ₹{dashboardData.completedPayouts.toFixed(2)}
              </dd>
            </div>
          </div>
        </div>

        {/* Request Payout Button */}
        {dashboardData.pendingPayouts > 0 && (
          <div className="mb-8">
            <button
              onClick={requestPayout}
              disabled={requestingPayout}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {requestingPayout ? 'Requesting...' : 'Request Payout'}
            </button>
          </div>
        )}

        {/* Recent Bookings */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Bookings</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {dashboardData.recentBookings.map((booking) => (
                <li key={booking.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {booking.eventName}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {booking.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {booking.ticketCount} tickets
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          ₹{booking.totalAmount.toFixed(2)}
                        </p>
                        <p className="ml-4">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payout History */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Payout History</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {dashboardData.payoutHistory.map((payout) => (
                <li key={payout.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        ₹{payout.amount.toFixed(2)}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payout.status === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payout.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 