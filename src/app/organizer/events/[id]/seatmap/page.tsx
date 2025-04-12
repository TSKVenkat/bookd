'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Layers, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { Loader } from '@/components/ui/Loader';
import VenueLayoutEditor from '@/components/dashboard/organizer/venue/VenueLayoutEditor';
import OptimizedSeatMap from '@/components/dashboard/organizer/venue/OptimizedSeatMap';
import { TicketType } from '@/components/dashboard/organizer/venue/SeatMapTypes';
import { useSeatMapStore } from '@/store/seatMapStore';

// Default layout if none exists
const DEFAULT_LAYOUT = {
  name: 'New Venue Layout',
  seatSize: 25,
  gridSize: 20,
  snapToGrid: true,
  hasStage: true,
  stagePosition: 'top',
  venueType: 'seated',
};

const SeatMapPage = () => {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [seatMap, setSeatMap] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [useOptimizedRenderer, setUseOptimizedRenderer] = useState<boolean>(false);
  
  // Access store state for saving
  const { seats, sections, layout } = useSeatMapStore();
  
  // Fetch event and seat map data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch event data directly
        const eventResponse = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventResponse.ok) {
          throw new Error('Failed to load event data');
        }
        const eventResponseData = await eventResponse.json();
        setEventData(eventResponseData);
        
        // Check if event date is in the past
        const eventDate = new Date(eventResponseData.date || eventResponseData.startDate);
        if (eventDate < new Date()) {
          setError('This event has already occurred. Seat map cannot be modified.');
        }
        
        // Fetch ticket types
        const ticketTypesResponse = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
        if (ticketTypesResponse.ok) {
          const ticketTypesData = await ticketTypesResponse.json();
          setTicketTypes(ticketTypesData);
        } else {
          console.error('Failed to load ticket types');
        }
        
        // Fetch seat map data
        const seatMapResponse = await fetch(`/api/organizer/events/${eventId}/seatmap`);
        if (seatMapResponse.ok) {
          const data = await seatMapResponse.json();
          setSeatMap(data);
          
          // Automatically switch to optimized renderer for large seat maps
          if (data?.seats?.length > 2000) {
            setUseOptimizedRenderer(true);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load event data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (eventId) {
      fetchData();
    }
  }, [eventId]);
  
  const handleBack = () => {
    router.push(`/organizer/events/${eventId}`);
  };
  
  const toggleRenderer = () => {
    setUseOptimizedRenderer(!useOptimizedRenderer);
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      
      // Prepare data to save
      const dataToSave = {
        layout: layout || DEFAULT_LAYOUT,
        seats: seats || [],
        sections: sections || []
      };
      
      console.log('Saving data:', {
        layoutKeys: Object.keys(dataToSave.layout),
        seatsCount: dataToSave.seats.length,
        sectionsCount: dataToSave.sections.length
      });
      
      // Save to server
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save seat map');
      }
      
      setSuccess('Seat map saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Error saving seat map:', err);
      setError(err.message || 'Failed to save seat map');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Loader size="lg" text="Loading event data..." />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Toast type="error" message={error} onClose={() => setError('')} />
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      {success && (
        <Toast type="success" message={success} onClose={() => setSuccess('')} />
      )}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button onClick={handleBack} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
          <h1 className="text-2xl font-bold mt-2">
            Seat Map: {eventData?.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Create or edit the seat map for this event
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            variant="primary"
            size="sm"
            className="flex items-center"
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Seat Map'}
          </Button>
          
          <Button
            onClick={toggleRenderer}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <Layers className="h-4 w-4 mr-2" />
            {useOptimizedRenderer ? 'Standard Renderer' : 'High-Performance Renderer'}
          </Button>
          
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-700 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Click the Save button to save your changes. Tickets sold with previous layouts will not be affected.</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {useOptimizedRenderer ? (
          <OptimizedSeatMap
            eventId={eventId}
            initialLayout={seatMap ? JSON.stringify(seatMap) : undefined}
            ticketTypes={ticketTypes}
            onSave={handleSave}
          />
        ) : (
          <VenueLayoutEditor 
            eventId={eventId}
            initialLayout={seatMap}
            ticketTypes={ticketTypes}
          />
        )}
      </div>
    </div>
  );
};

export default SeatMapPage; 