'use client';

import { useState, useEffect } from 'react';

export default function BankDetails() {
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    // TODO: Fetch bank details
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Bank Account Details</h2>
      {/* TODO: Add bank details form */}
      <p>Bank details management coming soon...</p>
    </div>
  );
} 