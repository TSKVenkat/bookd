'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

interface Event {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  thumbnail?: string;
  venue: {
    name: string;
    city: string;
  };
  artist?: {
    name: string;
  };
}

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizer/events');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/organizer/events/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
      
      // Remove from local state
      setEvents(events.filter(event => event.id !== id));
    } catch (err) {
      setError('Failed to delete event');
      console.error(err);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to safely format dates with error handling
  const formatDate = (dateString: string, formatPattern: string): string => {
    try {
      // Check if dateString is valid and not null/undefined
      if (!dateString) return 'N/A';
      
      // Parse the ISO string and format it
      return format(parseISO(dateString), formatPattern);
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading events...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 mb-4">You haven't created any events yet.</p>
        <Link href="/organizer/events/create" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create your first event
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {events.map(event => (
            <tr key={event.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {event.thumbnail && (
                    <div className="flex-shrink-0 h-10 w-10 mr-3">
                      <img 
                        className="h-10 w-10 rounded-full object-cover" 
                        src={event.thumbnail} 
                        alt={event.name} 
                      />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{event.name}</div>
                    <div className="text-sm text-gray-500">
                      {event.artist?.name ? `Artist: ${event.artist.name}` : 'No artist'}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{event.venue.name}</div>
                <div className="text-sm text-gray-500">{event.venue.city}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatDate(event.startDate, 'MMM d, yyyy')}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(event.startDate, 'h:mm a')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(event.status)}`}>
                  {event.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                <Link href={`/organizer/events/${event.id}/edit`} className="text-blue-600 hover:text-blue-800">
                  Edit
                </Link>
                <Link href={`/organizer/events/${event.id}/manage`} className="text-green-600 hover:text-green-800">
                  Manage
                </Link>
                <button onClick={() => deleteEvent(event.id)} className="text-red-600 hover:text-red-800">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <Link 
          href="/organizer/events/create" 
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Create New Event
        </Link>
      </div>
    </div>
  );
} 