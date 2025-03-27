'use client';

import { useState, useEffect } from 'react';

interface BankAccount {
  id: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  branch: string | null;
  isVerified: boolean;
  razorpayContactId: string | null;
  razorpayFundId: string | null;
}

export default function BankDetails() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({});

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizer/bank-details/');
      
      if (response.status === 404) {
        // Not an error, just no bank details yet
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBankDetails(data);
      setFormData(data);
    } catch (err) {
      console.error('Failed to fetch bank details:', err);
      setError('Failed to load bank details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const method = bankDetails ? 'PUT' : 'POST';
      
      const response = await fetch('/api/organizer/bank-details/', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save bank details');
      }

      // Refresh data
      await fetchBankDetails();
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving bank details:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded">
        {error}
      </div>
    );
  }

  if (isEditing || !bankDetails) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          {bankDetails ? 'Edit Bank Account Details' : 'Add Bank Account Details'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">
                Account Holder Name
              </label>
              <input
                type="text"
                id="accountHolderName"
                name="accountHolderName"
                required
                value={formData.accountHolderName || ''}
                onChange={handleChange}
                className="mt-1 text-black block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
                Bank Name
              </label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                required
                value={formData.bankName || ''}
                onChange={handleChange}
                className="mt-1 text-black block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                Account Number
              </label>
              <input
                type="text"
                id="accountNumber"
                name="accountNumber"
                required
                value={formData.accountNumber || ''}
                onChange={handleChange}
                className="mt-1 text-black block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700">
                IFSC Code
              </label>
              <input
                type="text"
                id="ifscCode"
                name="ifscCode"
                required
                value={formData.ifscCode || ''}
                onChange={handleChange}
                className="mt-1 text-black block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                Branch (Optional)
              </label>
              <input
                type="text"
                id="branch"
                name="branch"
                value={formData.branch || ''}
                onChange={handleChange}
                className="mt-1 text-black block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {bankDetails && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {loading ? 'Saving...' : bankDetails ? 'Update Details' : 'Save Details'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Bank Account Details</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          Edit Details
        </button>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Account Holder</h3>
            <p className="mt-1 text-base text-gray-900">{bankDetails.accountHolderName}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Bank Name</h3>
            <p className="mt-1 text-base text-gray-900">{bankDetails.bankName}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Account Number</h3>
            <p className="mt-1 text-base text-gray-900">
              {'•'.repeat(Math.max(0, bankDetails.accountNumber.length - 4))}
              {bankDetails.accountNumber.slice(-4)}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">IFSC Code</h3>
            <p className="mt-1 text-base text-gray-900">{bankDetails.ifscCode}</p>
          </div>
          
          {bankDetails.branch && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Branch</h3>
              <p className="mt-1 text-base text-gray-900">{bankDetails.branch}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Verification Status</h3>
            <p className="mt-1 text-base">
              {bankDetails.isVerified ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending Verification
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}