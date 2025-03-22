'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

interface PayoutStats {
  totalSales: number;
  totalPaidOut: number;
  availableBalance: number;
}

export default function PayoutHistory() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const [payoutsRes, statsRes] = await Promise.all([
        fetch('/api/organizer/payouts'),
        fetch('/api/organizer/payouts/stats')
      ]);

      if (!payoutsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch payout data');
      }

      const [payoutsData, statsData] = await Promise.all([
        payoutsRes.json(),
        statsRes.json()
      ]);

      setPayouts(payoutsData.payouts);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    if (!payoutAmount || isNaN(Number(payoutAmount))) {
      setError('Please enter a valid amount');
      return;
    }

    setRequestingPayout(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(payoutAmount),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request payout');
      }

      await fetchPayouts();
      setPayoutAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ₹{stats?.totalSales.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Paid Out</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ₹{stats?.totalPaidOut.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Available Balance</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ₹{stats?.availableBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Request Payout Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Request Payout</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>
          <button
            onClick={requestPayout}
            disabled={requestingPayout || !payoutAmount}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {requestingPayout ? 'Requesting...' : 'Request Payout'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Payout History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Payout History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(payout.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{payout.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payout.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : payout.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payout.processedAt
                      ? format(new Date(payout.processedAt), 'MMM d, yyyy')
                      : '-'}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-sm text-gray-500 text-center"
                  >
                    No payouts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 