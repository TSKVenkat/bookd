'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Tab } from '@headlessui/react';
import TicketTypeManager from '@/components/dashboard/organizer/venue/TicketTypeManager';
import SeatMap from '@/components/dashboard/organizer/SeatMap';
import { Loader } from '@/components/ui/Loader';
import { AlertCircle } from 'lucide-react';

// Helper function for dynamic class names
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function EventManagePage() {
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPastEvent, setIsPastEvent] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const response = await fetch(`/api/organizer/events/${eventId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch event details');
        }
        
        const eventData = await response.json();
        setEvent(eventData);
        
        // Check if event is in the past
        const eventDate = new Date(eventData.startDate);
        const currentDate = new Date();
        setIsPastEvent(eventDate < currentDate);
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{event?.name}</h1>
        <p className="text-gray-600">
          {new Date(event?.startDate).toLocaleDateString()} - {new Date(event?.endDate).toLocaleDateString()}
        </p>
        
        {isPastEvent && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <p className="font-medium">This event has already taken place</p>
                <p className="text-sm">You can view the event details but cannot make changes.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-700 hover:bg-white/[0.12] hover:text-blue-800'
              )
            }
          >
            Ticket Types
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-700 hover:bg-white/[0.12] hover:text-blue-800'
              )
            }
          >
            Seat Map
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-6">
          <Tab.Panel>
            {isPastEvent ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Event Has Ended</h3>
                  <p className="text-gray-500">
                    This event has already taken place. Ticket types cannot be modified.
                  </p>
                </div>
              </div>
            ) : (
              <TicketTypeManager eventId={eventId} />
            )}
          </Tab.Panel>
          <Tab.Panel>
            <SeatMap eventId={eventId} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
} 