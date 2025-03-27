'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SeatMapEditor from '@/components/dashboard/organizer/SeatMapEditor';

export default function EventSeatMapPage() {
  // Use Next.js useParams hook to correctly handle params
  const params = useParams();
  const eventId = params.id as string;
  
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicketTypes = async () => {
      try {
        const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch ticket types');
        }
        
        const data = await response.json();
        setTicketTypes(data);
      } catch (err) {
        console.error('Error fetching ticket types:', err);
        setError('Failed to load ticket types. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketTypes();
  }, [eventId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-64 bg-gray-200 rounded w-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          {error}
        </div>
        <div className="text-center mt-4">
          <a 
            href={`/organizer/events/${eventId}/tickets`}
            className="text-blue-600 hover:underline"
          >
            Go back to ticket types
          </a>
        </div>
      </div>
    );
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg mb-4">
          You need to create at least one ticket type before designing your seat map.
        </div>
        <div className="text-center mt-4">
          <a 
            href={`/organizer/events/${eventId}/tickets`}
            className="text-blue-600 hover:underline"
          >
            Create ticket types
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SeatMapEditor eventId={eventId} ticketTypes={ticketTypes} />
    </div>
  );
} 