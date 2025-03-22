'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SeatType {
  id: string;
  name: string;
  price: number;
  color: string;
}

interface SeatData {
  row: string;
  number: string;
  typeId: string;
  status: 'available' | 'locked' | 'confirmed';
}

interface SeatMapData {
  rows: number;
  seatsPerRow: number;
  seats: SeatData[];
}

export default function SeatMap({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seatTypes, setSeatTypes] = useState<SeatType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [mapData, setMapData] = useState<SeatMapData>({
    rows: 10,
    seatsPerRow: 10,
    seats: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [seatMapRes, typesRes] = await Promise.all([
          fetch(`/api/organizer/events/${eventId}/seatmap`),
          fetch(`/api/organizer/events/${eventId}/ticket-types`)
        ]);

        if (typesRes.ok) {
          const types = await typesRes.json();
          setSeatTypes(types);
          if (types.length > 0) setSelectedType(types[0].id);
        }

        if (seatMapRes.ok) {
          const data = await seatMapRes.json();
          setMapData(data);
        }
      } catch (err) {
        setError('Failed to load seat map data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleSeatClick = (row: number, seat: number) => {
    if (!selectedType) return;

    const rowLetter = String.fromCharCode(65 + row); // Convert 0 to A, 1 to B, etc.
    const seatNumber = (seat + 1).toString().padStart(2, '0');

    setMapData(prev => {
      const seats = [...prev.seats];
      const existingSeatIndex = seats.findIndex(
        s => s.row === rowLetter && s.number === seatNumber
      );

      if (existingSeatIndex >= 0) {
        // If clicking the same type, remove the seat
        if (seats[existingSeatIndex].typeId === selectedType) {
          seats.splice(existingSeatIndex, 1);
        } else {
          // Otherwise, update the type
          seats[existingSeatIndex].typeId = selectedType;
        }
      } else {
        // Add new seat
        seats.push({
          row: rowLetter,
          number: seatNumber,
          typeId: selectedType,
          status: 'available'
        });
      }

      return { ...prev, seats };
    });
  };

  const getSeatColor = (row: number, seat: number) => {
    const rowLetter = String.fromCharCode(65 + row);
    const seatNumber = (seat + 1).toString().padStart(2, '0');
    const seatData = mapData.seats.find(
      s => s.row === rowLetter && s.number === seatNumber
    );

    if (!seatData) return 'bg-gray-200';
    const type = seatTypes.find(t => t.id === seatData.typeId);
    return type?.color || 'bg-gray-200';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapData),
      });

      if (!response.ok) throw new Error('Failed to save seat map');

      router.refresh();
    } catch (err) {
      setError('Failed to save seat map');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Seat Map</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-6">
        <div className="w-64 space-y-4">
          <h3 className="font-medium">Seat Types</h3>
          <div className="space-y-2">
            {seatTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-2 text-left rounded-md ${
                  selectedType === type.id ? 'ring-2 ring-blue-500' : ''
                } ${type.color}`}
              >
                {type.name} - ₹{type.price}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="w-full aspect-video bg-gray-100 p-8 rounded-lg overflow-auto">
            <div className="grid gap-2" style={{
              gridTemplateColumns: `repeat(${mapData.seatsPerRow}, minmax(0, 1fr))`
            }}>
              {Array.from({ length: mapData.rows * mapData.seatsPerRow }).map((_, index) => {
                const row = Math.floor(index / mapData.seatsPerRow);
                const seat = index % mapData.seatsPerRow;
                return (
                  <button
                    key={index}
                    onClick={() => handleSeatClick(row, seat)}
                    className={`aspect-square rounded-md ${getSeatColor(row, seat)} hover:opacity-75 transition-opacity`}
                  >
                    {String.fromCharCode(65 + row)}
                    {(seat + 1).toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 