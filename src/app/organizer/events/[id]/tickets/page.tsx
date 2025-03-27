'use client';

import { useParams } from 'next/navigation';
import TicketTypeManager from '@/components/dashboard/organizer/TicketTypeManager';

export default function EventTicketsPage() {
  // Use the useParams hook for client components
  const params = useParams();
  const eventId = params.id as string;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <TicketTypeManager eventId={eventId} />
    </div>
  );
}