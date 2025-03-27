'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SeatMapEditorProps {
  eventId: string;
  ticketTypes: TicketType[];
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  color: string;
  description?: string;
}

interface Seat {
  id?: string;
  row: string;
  number: string;
  typeId: string;
  status: string;
  x: number;
  y: number;
}

export default function SeatMapEditor({ eventId, ticketTypes }: SeatMapEditorProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>('');
  const [currentRow, setCurrentRow] = useState('A');
  const [currentSeatNumber, setCurrentSeatNumber] = useState(1);
  const [mapData, setMapData] = useState({
    rows: 10,
    columns: 10,
    stageName: 'Stage',
    hasStage: true,
    venueType: 'theater'
  });
  const [editMode, setEditMode] = useState<'draw' | 'select' | 'move'>('draw');
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  
  const SEAT_SIZE = 30;
  const STAGE_HEIGHT = 60;
  const CANVAS_PADDING = 50;

  useEffect(() => {
    fetchExistingSeatMap();
  }, [eventId]);

  useEffect(() => {
    if (ticketTypes.length > 0 && !selectedTicketType) {
      setSelectedTicketType(ticketTypes[0].id);
    }
  }, [ticketTypes]);

  useEffect(() => {
    renderSeatMap();
  }, [seats, editMode, selectedSeat, mapData]);

  const fetchExistingSeatMap = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`);
      
      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error('Failed to fetch seat map');
        }
        // If 404, it means no seat map exists yet, so we can create a new one
        return;
      }
      
      const existingSeats = await response.json();
      if (existingSeats && existingSeats.length > 0) {
        setSeats(existingSeats);
        
        // Calculate rows and columns from existing seats
        const maxRow = String.fromCharCode(Math.max(...existingSeats.map(s => s.row.charCodeAt(0))));
        const maxNumber = Math.max(...existingSeats.map(s => parseInt(s.number)));
        
        setMapData(prev => ({
          ...prev,
          rows: maxRow.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
          columns: maxNumber
        }));
        
        // Update current row and seat number for adding new seats
        setCurrentRow(String.fromCharCode(maxRow.charCodeAt(0) + 1));
        setCurrentSeatNumber(1);
      }
    } catch (err) {
      console.error('Error fetching seat map:', err);
      setError('Failed to load existing seat map');
    } finally {
      setLoading(false);
    }
  };

  const renderSeatMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate canvas dimensions based on seats
    const totalWidth = Math.max(mapData.columns * (SEAT_SIZE + 5) + CANVAS_PADDING * 2, 400);
    const totalHeight = Math.max(mapData.rows * (SEAT_SIZE + 5) + CANVAS_PADDING * 2 + (mapData.hasStage ? STAGE_HEIGHT : 0), 300);
    
    // Set canvas size
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw stage if enabled
    if (mapData.hasStage) {
      ctx.fillStyle = '#999';
      ctx.fillRect(CANVAS_PADDING, CANVAS_PADDING, totalWidth - CANVAS_PADDING * 2, STAGE_HEIGHT);
      
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(mapData.stageName, totalWidth / 2, CANVAS_PADDING + STAGE_HEIGHT / 2 + 6);
    }
    
    // Draw seats
    seats.forEach(seat => {
      const ticketType = ticketTypes.find(tt => tt.id === seat.typeId);
      
      // Calculate position - ensure x and y are valid numbers
      const x = typeof seat.x === 'number' && !isNaN(seat.x) ? seat.x : 0;
      const y = typeof seat.y === 'number' && !isNaN(seat.y) ? seat.y : 0;
      
      // Draw seat
      ctx.beginPath();
      ctx.rect(x, y, SEAT_SIZE, SEAT_SIZE);
      
      // Seat color based on ticket type
      ctx.fillStyle = ticketType?.color || '#ddd';
      
      // If seat is selected, highlight it
      if (selectedSeat && selectedSeat.row === seat.row && selectedSeat.number === seat.number) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff0000';
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
      }
      
      ctx.fill();
      ctx.stroke();
      
      // Add seat label
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${seat.row}${seat.number}`, x + SEAT_SIZE / 2, y + SEAT_SIZE / 2 + 3);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedTicketType) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (editMode === 'draw') {
      // Check if we're clicking in the stage area
      if (mapData.hasStage && y < CANVAS_PADDING + STAGE_HEIGHT) {
        return;
      }
      
      // Add a new seat
      const newSeat: Seat = {
        row: currentRow,
        number: currentSeatNumber.toString(),
        typeId: selectedTicketType,
        status: 'available',
        x: Math.round(x - SEAT_SIZE / 2),
        y: Math.round(y - SEAT_SIZE / 2)
      };
      
      // Check if seat with same row/number already exists
      const existingSeatIndex = seats.findIndex(
        s => s.row === newSeat.row && s.number === newSeat.number
      );
      
      if (existingSeatIndex >= 0) {
        // Update existing seat
        const updatedSeats = [...seats];
        updatedSeats[existingSeatIndex] = {
          ...updatedSeats[existingSeatIndex],
          typeId: newSeat.typeId,
          x: newSeat.x,
          y: newSeat.y
        };
        setSeats(updatedSeats);
      } else {
        // Add new seat
        setSeats([...seats, newSeat]);
      }
      
      // Increment seat number for next click
      setCurrentSeatNumber(prev => prev + 1);
    } else if (editMode === 'select') {
      // Find if we clicked on a seat
      const clickedSeat = seats.find(seat => 
        x >= seat.x && x <= seat.x + SEAT_SIZE &&
        y >= seat.y && y <= seat.y + SEAT_SIZE
      );
      
      if (clickedSeat) {
        setSelectedSeat(clickedSeat);
      } else {
        setSelectedSeat(null);
      }
    }
  };

  const handleSaveSeatMap = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (seats.length === 0) {
        setError('Please create at least one seat before saving');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seats,
          mapData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save seat map');
      }
      
      setSuccess('Seat map saved successfully');
      
      // Redirect to event management page
      setTimeout(() => {
        router.push(`/organizer/events/${eventId}/manage`);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving seat map:', err);
      setError(err.message || 'Failed to save seat map');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedSeat = () => {
    if (!selectedSeat) return;
    
    const updatedSeats = seats.filter(
      seat => !(seat.row === selectedSeat.row && seat.number === selectedSeat.number)
    );
    
    setSeats(updatedSeats);
    setSelectedSeat(null);
  };

  const handleChangeSelectedSeatType = (typeId: string) => {
    if (!selectedSeat) return;
    
    const updatedSeats = seats.map(seat => {
      if (seat.row === selectedSeat.row && seat.number === selectedSeat.number) {
        return { ...seat, typeId };
      }
      return seat;
    });
    
    setSeats(updatedSeats);
    setSelectedSeat({ ...selectedSeat, typeId });
  };

  const generateGridSeats = () => {
    const newSeats: Seat[] = [];
    const startX = CANVAS_PADDING;
    const startY = CANVAS_PADDING + (mapData.hasStage ? STAGE_HEIGHT + 20 : 0);
    
    for (let r = 0; r < mapData.rows; r++) {
      const rowLetter = String.fromCharCode('A'.charCodeAt(0) + r);
      
      for (let c = 0; c < mapData.columns; c++) {
        const seatNumber = (c + 1).toString();
        
        newSeats.push({
          row: rowLetter,
          number: seatNumber,
          typeId: selectedTicketType,
          status: 'available',
          x: startX + c * (SEAT_SIZE + 5),
          y: startY + r * (SEAT_SIZE + 5)
        });
      }
    }
    
    setSeats(newSeats);
    setCurrentRow(String.fromCharCode('A'.charCodeAt(0) + mapData.rows));
    setCurrentSeatNumber(1);
  };

  const handleMapDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setMapData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? 
        checked : 
        (type === 'number' ? 
          (value === '' ? '' : isNaN(parseInt(value)) ? prev[name] : parseInt(value)) : 
          value)
    }));
  };

  // Helper function to safely format price
  const formatPrice = (price: number | string): string => {
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    try {
      return parseFloat(String(price)).toFixed(2);
    } catch (e) {
      return '0.00';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-6">Seat Map Editor</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-500 p-4 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-4">
          <div className="border-b pb-3 mb-3 flex justify-between items-center">
            <h3 className="text-lg font-medium">Canvas</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setEditMode('draw')}
                className={`px-3 py-1 text-sm rounded ${
                  editMode === 'draw' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Add Seats
              </button>
              <button
                type="button"
                onClick={() => setEditMode('select')}
                className={`px-3 py-1 text-sm rounded ${
                  editMode === 'select' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Select Seats
              </button>
            </div>
          </div>
          
          <div className="overflow-auto">
            <canvas 
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="border border-gray-300 bg-gray-50 cursor-crosshair"
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-4">Ticket Types</h3>
            
            {ticketTypes.length === 0 ? (
              <div className="text-gray-500 text-sm mb-2">
                No ticket types available. Please create ticket types first.
              </div>
            ) : (
              <div className="space-y-2">
                {ticketTypes.map(type => (
                  <div 
                    key={type.id}
                    onClick={() => {
                      if (editMode === 'select' && selectedSeat) {
                        handleChangeSelectedSeatType(type.id);
                      } else {
                        setSelectedTicketType(type.id);
                      }
                    }}
                    className={`flex items-center p-2 rounded cursor-pointer ${
                      (editMode === 'draw' && selectedTicketType === type.id) || 
                      (editMode === 'select' && selectedSeat?.typeId === type.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded mr-2"
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-gray-500">
                        ${formatPrice(type.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-4">Layout Settings</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Number of Rows
                </label>
                <input
                  type="number"
                  name="rows"
                  min="1"
                  max="26"
                  value={mapData.rows}
                  onChange={handleMapDataChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Seats per Row
                </label>
                <input
                  type="number"
                  name="columns"
                  min="1"
                  max="50"
                  value={mapData.columns}
                  onChange={handleMapDataChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="hasStage"
                    checked={mapData.hasStage}
                    onChange={handleMapDataChange}
                    className="mr-2"
                  />
                  Show Stage
                </label>
              </div>
              
              {mapData.hasStage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stage Name
                  </label>
                  <input
                    type="text"
                    name="stageName"
                    value={mapData.stageName}
                    onChange={handleMapDataChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <button
                type="button"
                onClick={generateGridSeats}
                className="w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Generate Grid Layout
              </button>
            </div>
          </div>
          
          {selectedSeat && editMode === 'select' && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium mb-4">Selected Seat</h3>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Seat: </span>
                  {selectedSeat.row}{selectedSeat.number}
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Type: </span>
                  {ticketTypes.find(t => t.id === selectedSeat.typeId)?.name || 'Unknown'}
                </div>
                
                <button
                  type="button"
                  onClick={handleDeleteSelectedSeat}
                  className="w-full mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Seat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        
        <button
          type="button"
          onClick={handleSaveSeatMap}
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Seat Map'}
        </button>
      </div>
    </div>
  );
} 