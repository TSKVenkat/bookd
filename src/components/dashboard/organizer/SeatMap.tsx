'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { AlertCircle, Edit } from 'lucide-react';

interface SeatMapProps {
  eventId: string;
}

interface Seat {
  id: string;
  row: string;
  number: string;
  status: string;
  ticketType: {
    id: string;
    name: string;
    price: number;
    color: string;
  };
}

interface SeatMapConfig {
  layout: {
    venueType: string;
  };
  stageConfig: {
    name: string;
    shape: string;
  };
  mapData: {
    stageName: string;
  };
}

interface SeatMapResponse {
  id: string;
  eventId: string;
  layout: any;
  seats: Seat[];
  stageConfig: any;
  sections: any[];
  createdAt: string;
  updatedAt: string;
}

export default function SeatMap({ eventId }: SeatMapProps) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [config, setConfig] = useState<SeatMapConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Group seats by row for display
  const seatsByRow: Record<string, Seat[]> = {};
  
  // Only call forEach if seats is an array and not empty
  if (Array.isArray(seats) && seats.length > 0) {
    seats.forEach(seat => {
      if (!seatsByRow[seat.row]) {
        seatsByRow[seat.row] = [];
      }
      seatsByRow[seat.row].push(seat);
    });
  }
  
  // Sort rows alphabetically
  const sortedRows = Object.keys(seatsByRow).sort();
  
  useEffect(() => {
    const fetchSeatMap = async () => {
      try {
        setLoading(true);
        
        // Fetch seat map configuration
        const configResponse = await fetch(`/api/organizer/events/${eventId}/seatmap/config`);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfig(configData);
        }
        
        // Fetch seats
        const seatsResponse = await fetch(`/api/organizer/events/${eventId}/seatmap`);
        if (seatsResponse.ok) {
          const seatMapData: SeatMapResponse = await seatsResponse.json();
          console.log('Seat map data:', seatMapData);
          
          // Check if we have a valid response with seats array
          if (seatMapData && Array.isArray(seatMapData.seats)) {
            setSeats(seatMapData.seats);
          } else if (seatMapData && typeof seatMapData.seats === 'string') {
            // If seats is a JSON string, parse it
            try {
              const parsedSeats = JSON.parse(seatMapData.seats);
              if (Array.isArray(parsedSeats)) {
                setSeats(parsedSeats);
              } else {
                console.error('Parsed seats is not an array:', parsedSeats);
                setSeats([]);
              }
            } catch (err) {
              console.error('Error parsing seats JSON:', err);
              setSeats([]);
            }
          } else if (Array.isArray(seatMapData)) {
            // If the API happens to return an array directly
            setSeats(seatMapData);
          } else {
            console.error('Seat map data structure is unexpected:', seatMapData);
            setSeats([]);
          }
        } else {
          throw new Error('Failed to fetch seat map');
        }
      } catch (err) {
        console.error('Error fetching seat map:', err);
        setError('Failed to load seat map');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSeatMap();
  }, [eventId]);
  
  const handleEditSeatMap = () => {
    router.push(`/organizer/events/${eventId}/seatmap`);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error || !Array.isArray(seats) || seats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Seat Map Found</h3>
          <p className="text-gray-500 mb-4">
            {error || "This event doesn't have a seat map yet. Create one to manage seating."}
          </p>
          <Button onClick={handleEditSeatMap}>
            {!Array.isArray(seats) || seats.length === 0 ? 'Create Seat Map' : 'Edit Seat Map'}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Seat Map</h2>
        <Button variant="outline" onClick={handleEditSeatMap}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Seat Map
        </Button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <div className="w-full bg-gray-300 p-3 text-center font-medium mb-6">
          {config?.stageConfig?.name || config?.mapData?.stageName || 'Stage'}
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
                      style={{ backgroundColor: seat.ticketType?.color || '#cccccc' }}
                      title={`${seat.row}${seat.number} - ${seat.ticketType?.name || 'Unknown'} - ${seat.status}`}
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
          {Array.from(new Set(seats
            .filter(s => s.ticketType) // Filter out seats without ticketType
            .map(s => JSON.stringify({ 
              name: s.ticketType?.name || 'Unknown', 
              color: s.ticketType?.color || '#cccccc' 
            }))))
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