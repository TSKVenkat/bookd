'use client';

import { useState, useEffect, useCallback } from 'react';
import { VenueLayout, Seat } from '@/components/dashboard/organizer/venue/VenueLayoutEditor';

interface UseSeatMapReturn {
  layout: VenueLayout;
  seats: Seat[];
  selectedSeatId: string | null;
  loading: boolean;
  error: string;
  success: string;
  setLayout: (layout: VenueLayout) => void;
  setSelectedSeatId: (id: string | null) => void;
  loadSeatMap: () => Promise<void>;
  saveSeatMap: () => Promise<void>;
  addSeat: (seat: Seat) => void;
  updateSeat: (seat: Seat) => void;
  deleteSeat: (id: string) => void;
  clearSelection: () => void;
  generateSeatingLayout: () => void;
}

export const useSeatMap = (eventId: string, defaultLayout: VenueLayout): UseSeatMapReturn => {
  const [layout, setLayout] = useState<VenueLayout>(defaultLayout);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load seat map from API
  const loadSeatMap = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`);
      
      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error('Failed to load seat map');
        }
        // If 404, it's a new seat map
        return;
      }
      
      const existingSeats = await response.json();
      
      if (existingSeats && Array.isArray(existingSeats) && existingSeats.length > 0) {
        // Extract layout data from the first seat with mapData
        const seatMapResponse = await fetch(`/api/organizer/events/${eventId}/seatmap/config`);
        
        if (seatMapResponse.ok) {
          const { mapData } = await seatMapResponse.json();
          
          if (mapData) {
            // Convert from the old format to the new format if needed
            const newLayout = {
              ...defaultLayout,
              ...mapData.layout,
              seats: existingSeats
            };
            
            setLayout(newLayout);
            setSeats(existingSeats);
            
            // Extract some metrics from existing seats for backwards compatibility
            if (existingSeats.length > 0) {
              const rows = new Set(existingSeats.map(s => s.row));
              const maxSeatNumber = Math.max(...existingSeats.map(s => parseInt(s.number)));
              
              setLayout(prev => ({
                ...prev,
                rows: rows.size,
                columns: maxSeatNumber
              }));
            }
          }
        }
        
        setSeats(existingSeats);
      }
    } catch (err) {
      console.error('Error loading seat map:', err);
      setError('Failed to load existing seat map');
    } finally {
      setLoading(false);
    }
  }, [eventId, defaultLayout]);

  // Save seat map to API
  const saveSeatMap = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError('');
    
    try {
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
          mapData: {
            layout,
            version: 2 // Mark as version 2 format
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save seat map');
      }
      
      // Also save layout configuration separately
      await fetch(`/api/organizer/events/${eventId}/seatmap/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mapData: { layout, version: 2 } })
      });
      
      setSuccess('Seat map saved successfully');
      
      // Clear success message after a while
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving seat map:', err);
      setError(err.message || 'Failed to save seat map');
    } finally {
      setLoading(false);
    }
  }, [eventId, layout, seats]);

  // Add a seat
  const addSeat = useCallback((seat: Seat) => {
    const newSeat = {
      ...seat,
      id: seat.id || `seat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setSeats(prev => [...prev, newSeat]);
  }, []);

  // Update a seat
  const updateSeat = useCallback((seat: Seat) => {
    if (!seat.id) return;
    
    setSeats(prev => prev.map(s => s.id === seat.id ? seat : s));
  }, []);

  // Delete a seat
  const deleteSeat = useCallback((id: string) => {
    setSeats(prev => prev.filter(s => s.id !== id));
    if (selectedSeatId === id) {
      setSelectedSeatId(null);
    }
  }, [selectedSeatId]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedSeatId(null);
  }, []);

  // Generate seating layout based on current layout settings
  const generateSeatingLayout = useCallback(() => {
    const { 
      rows, columns, rowSpacing, columnSpacing, seatSize, arcEnabled, 
      arcRadius, arcSpanDegrees, arcStartDegree, rowLabels 
    } = layout;
    
    // Generate seats based on the layout settings
    const newSeats: Seat[] = [];
    const centerX = layout.venueWidth / 2;
    const startY = layout.stageConfig.y + layout.stageConfig.height + 50;
    
    // For each row
    for (let r = 0; r < rows; r++) {
      const rowLabel = rowLabels[r] || String.fromCharCode('A'.charCodeAt(0) + r);
      const rowY = startY + r * rowSpacing;
      
      // For straight rows
      if (!arcEnabled) {
        const startX = centerX - (columns * columnSpacing) / 2 + columnSpacing / 2;
        
        for (let c = 0; c < columns; c++) {
          const seatX = startX + c * columnSpacing;
          
          newSeats.push({
            id: `seat-${rowLabel}-${c + 1}`,
            row: rowLabel,
            number: (c + 1).toString(),
            typeId: layout.seats[0]?.typeId || '', // Use the first seat's type or empty
            status: 'available',
            x: seatX,
            y: rowY,
            seatType: 'regular'
          });
        }
      } 
      // For arc rows
      else {
        const arcOffsetY = arcRadius - rowY; // Move the center point behind the rows
        
        // Calculate seats in an arc
        const angleStep = arcSpanDegrees / (columns - 1);
        const startAngle = arcStartDegree + (arcSpanDegrees - arcSpanDegrees) / 2;
        
        for (let c = 0; c < columns; c++) {
          const angle = (startAngle + c * angleStep) * (Math.PI / 180); // Convert to radians
          const radius = arcRadius - r * rowSpacing;
          
          const seatX = centerX + radius * Math.cos(angle);
          const seatY = startY + arcOffsetY + radius * Math.sin(angle);
          
          newSeats.push({
            id: `seat-${rowLabel}-${c + 1}`,
            row: rowLabel,
            number: (c + 1).toString(),
            typeId: layout.seats[0]?.typeId || '',
            status: 'available',
            x: seatX,
            y: seatY,
            rotation: angle * (180 / Math.PI) + 90, // Convert to degrees and offset
            seatType: 'regular'
          });
        }
      }
    }
    
    setSeats(newSeats);
  }, [layout]);

  // Load seat map on init
  useEffect(() => {
    loadSeatMap();
  }, [loadSeatMap]);

  return {
    layout,
    seats,
    selectedSeatId,
    loading,
    error,
    success,
    setLayout,
    setSelectedSeatId,
    loadSeatMap,
    saveSeatMap,
    addSeat,
    updateSeat,
    deleteSeat,
    clearSelection,
    generateSeatingLayout
  };
}; 