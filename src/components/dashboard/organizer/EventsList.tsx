'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  ticketPrice: number;
  totalTickets: number;
  soldTickets: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
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
      const response = await fetch('/api/organizer/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete event');
      fetchEvents(); // Refresh the list
    } catch (err) {
      setError('Failed to delete event');
      console.error(err);
    }
  };

  if (loading) return <div>Loading events...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Your Events</h2>
      </div>

      {events.length === 0 ? (
        <p className="text-gray-500">No events found. Create your first event!</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>📅 {format(new Date(event.date), 'PPP')}</p>
                <p>📍 {event.venue}</p>
                <p>💰 ₹{event.ticketPrice}</p>
                <p>🎟️ {event.soldTickets}/{event.totalTickets} tickets sold</p>
                <p className={`font-semibold ${
                  event.status === 'PUBLISHED' ? 'text-green-600' :
                  event.status === 'DRAFT' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {event.status}
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <Link 
                  href={`/organizer/events/${event.id}/edit`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 