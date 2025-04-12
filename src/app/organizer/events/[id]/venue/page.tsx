'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import EnhancedSeatMap from '@/components/dashboard/organizer/venue/EnhancedSeatMap';
import { Toast } from '@/components/ui/Toast';
import { TicketTypeManager } from '@/components/dashboard/organizer/venue/TicketTypeManager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function EventVenuePage() {
  const params = useParams();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch event data
        const eventResponse = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventResponse.ok) {
          throw new Error('Failed to load event data');
        }
        const eventData = await eventResponse.json();
        setEventData(eventData);
        
        // Fetch ticket types
        const ticketTypesResponse = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
        if (ticketTypesResponse.ok) {
          const ticketTypesData = await ticketTypesResponse.json();
          setTicketTypes(ticketTypesData);
        } else {
          console.error('Failed to load ticket types');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading event data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <Toast type="error" message={error} onClose={() => setError('')} />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{eventData?.name || 'Event'} - Venue Setup</h1>
        <p className="text-gray-600 mt-1">
          Configure the venue layout, seating arrangement, and manage tickets
        </p>
      </div>

      <Tabs defaultValue="seatmap">
        <TabsList className="mb-6">
          <TabsTrigger value="seatmap">Seat Map</TabsTrigger>
          <TabsTrigger value="tickettypes">Ticket Types</TabsTrigger>
        </TabsList>
        
        <TabsContent value="seatmap" className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <EnhancedSeatMap 
              eventId={eventId} 
              initialLayout={eventData?.venueLayout}
              ticketTypes={ticketTypes}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="tickettypes" className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <TicketTypeManager 
              eventId={eventId} 
              onTicketTypesChange={(types) => setTicketTypes(types)}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 