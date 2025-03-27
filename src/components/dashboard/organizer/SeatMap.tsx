'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SeatMapProps {
  eventId: string;
}

interface Seat {
  id: string;
  row: string;
  number: string;
  status: string;
  ticketType: {
    name: string;
    color: string;
  };
}

export default function SeatMap({ eventId }: SeatMapProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seats, setSeats] = useState<Seat[]>([]);
  
  useEffect(() => {
    fetchSeatMap();
  }, [eventId]);

  const fetchSeatMap = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`);
      
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch seat map');
      }
      
      if (response.status === 404) {
        // No seat map exists yet
        setSeats([]);
      } else {
        const data = await response.json();
        setSeats(data);
      }
    } catch (err) {
      console.error('Error fetching seat map:', err);
      setError('Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-64 bg-gray-200 rounded w-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
        <div className="text-center">
          <button
            onClick={() => fetchSeatMap()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (seats.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-50 text-yellow-600 p-4 rounded-lg mb-6">
          No seat map has been created for this event yet.
        </div>
        <Link
          href={`/organizer/events/${eventId}/seatmap`}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Create Seat Map
        </Link>
      </div>
    );
  }

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  // Sort rows alphabetically
  const sortedRows = Object.keys(seatsByRow).sort();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Seat Map</h2>
        <Link
          href={`/organizer/events/${eventId}/seatmap`}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Edit Seat Map
        </Link>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <div className="w-full bg-gray-300 p-3 text-center font-medium mb-6">
          Stage
        </div>
        
        <div className="space-y-2">
          {sortedRows.map(row => (
            <div key={row} className="flex items-center">
              <div className="w-6 font-medium text-gray-600">{row}</div>
              <div className="flex flex-wrap gap-1">
                {seatsByRow[row]
                  .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                  .map(seat => (
                    <div
                      key={seat.id}
                      className="w-8 h-8 flex items-center justify-center rounded-sm text-xs"
                      style={{ backgroundColor: seat.ticketType.color }}
                      title={`${seat.row}${seat.number} - ${seat.ticketType.name} - ${seat.status}`}
                    >
                      {seat.number}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Ticket Types</h3>
        <div className="flex flex-wrap gap-3">
          {Array.from(new Set(seats.map(s => JSON.stringify({ name: s.ticketType.name, color: s.ticketType.color }))))
            .map(s => JSON.parse(s))
            .map((ticketType: { name: string; color: string }, index: number) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-4 h-4 rounded-sm mr-1"
                  style={{ backgroundColor: ticketType.color }}
                ></div>
                <span className="text-sm">{ticketType.name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
} 