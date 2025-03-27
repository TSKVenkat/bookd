'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import OrganizerDashboard from '@/components/dashboard/OrganizerDashboard';

export default function OrganizersDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

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
    }
  }, [user, authLoading, router]);

  

  

  return <OrganizerDashboard />;
} 