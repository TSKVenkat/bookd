import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loader } from '@/components/ui/Loader';
import InteractiveSeatMap from './InteractiveSeatMap';
import { useSeatMapStore } from '@/store/seatMapStore';
import ArcSectionEditor from './ArcSectionEditor';
import { TicketTypeManager } from './TicketTypeManager';

interface EnhancedVenueLayoutEditorProps {
  eventId: string;
  initialLayout?: any;
  ticketTypes?: any[];
}

export default function EnhancedVenueLayoutEditor({
  eventId,
  initialLayout = null,
  ticketTypes = []
}: EnhancedVenueLayoutEditorProps) {
  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasSeatMap, setHasSeatMap] = useState(false);
  
  // Get state from store
  const {
    layout,
    seats,
    sections,
    selectedSectionId,
    selectedTicketType
  } = useSeatMapStore();
  
  // Check if seat map exists for this event
  const checkSeatMap = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`);
      if (response.ok) {
        const data = await response.json();
        setHasSeatMap(Boolean(data && Object.keys(data).length > 0));
      }
    } catch (err) {
      console.error('Error checking seat map:', err);
    }
  };
  
  // Initialize
  useEffect(() => {
    checkSeatMap();
  }, [eventId]);
  
  // Handle form input change
  const handleLayoutChange = (key: string, value: any) => {
    const updatedLayout = { ...layout, [key]: value };
    useSeatMapStore.getState().setLayout(updatedLayout);
  };
  
  // Handle save layout
  const handleSaveLayout = async () => {
    if (ticketTypes.length === 0) {
      setError('Please create at least one ticket type before saving the seat map');
      return;
    }
    
    setLoading(true);
    
    // Check if any seats don't have ticket types assigned
    const seatsWithoutTicketType = seats.filter(seat => !seat.typeId);
    if (seatsWithoutTicketType.length > 0) {
      if (!confirm(`${seatsWithoutTicketType.length} seats don't have ticket types assigned. Do you want to assign the default ticket type to them?`)) {
        setLoading(false);
        return;
      }
      
      // Assign default ticket type to seats without one
      const updatedSeats = seats.map(seat => ({
        ...seat,
        typeId: seat.typeId || ticketTypes[0].id
      }));
      
      useSeatMapStore.getState().seats = updatedSeats;
    }
    
    try {
      const payload = {
        layout,
        seats: seats.map(seat => ({
          ...seat,
          typeId: seat.typeId || ticketTypes[0].id
        })),
        stageConfig: layout.stageConfig,
        sections,
      };
      
      const response = await fetch(`/api/organizer/events/${eventId}/seatmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        setSuccess('Seat map saved successfully');
        setHasSeatMap(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save seat map');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate sample layout
  const handleGenerateLayout = () => {
    if (seats.length > 0) {
      if (!confirm('This will replace the existing seats. Continue?')) {
        return;
      }
    }
    
    // Create a sample layout with sections
    const centerX = layout.venueWidth ? layout.venueWidth / 2 : 400;
    const centerY = layout.venueHeight ? layout.venueHeight - 200 : 400;
    
    const sampleSections = [
      // Main arc section
      {
        id: `arc-section-${Date.now()}`,
        name: 'Main Seating',
        x: centerX - 300,
        y: centerY - 300,
        width: 600,
        height: 300,
        color: 'hsl(210, 70%, 75%)',
        isArc: true,
        arcData: {
          centerX,
          centerY,
          innerRadius: 200,
          outerRadius: 350,
          startAngle: 210,
          endAngle: 330,
          totalSeats: 100,
          rows: 5
        },
        rows: 5,
        seatsPerRow: 20,
        rowStartLabel: 'A',
        seatStartNumber: 1,
        rowSpacing: 30,
        seatSpacing: 15
      },
      // Left wing
      {
        id: `section-left-${Date.now()}`,
        name: 'Left Wing',
        x: centerX - 450,
        y: centerY - 150,
        width: 150,
        height: 250,
        color: 'hsl(180, 70%, 75%)',
        rows: 5,
        seatsPerRow: 5,
        rowStartLabel: 'A',
        seatStartNumber: 1,
        rowSpacing: 30,
        seatSpacing: 30,
        rotation: 15
      },
      // Right wing
      {
        id: `section-right-${Date.now()}`,
        name: 'Right Wing',
        x: centerX + 300,
        y: centerY - 150,
        width: 150,
        height: 250,
        color: 'hsl(150, 70%, 75%)',
        rows: 5,
        seatsPerRow: 5,
        rowStartLabel: 'A',
        seatStartNumber: 1,
        rowSpacing: 30,
        seatSpacing: 30,
        rotation: -15
      },
      // VIP section
      {
        id: `section-vip-${Date.now()}`,
        name: 'VIP',
        x: centerX - 150,
        y: centerY - 180,
        width: 300,
        height: 120,
        color: 'hsl(330, 70%, 75%)',
        rows: 4,
        seatsPerRow: 10,
        rowStartLabel: 'AA',
        seatStartNumber: 1,
        rowSpacing: 30,
        seatSpacing: 30
      }
    ];
    
    // Add the sections
    useSeatMapStore.getState().sections = [];
    sampleSections.forEach(section => useSeatMapStore.getState().addSection(section));
    
    // Clear existing seats
    useSeatMapStore.getState().seats = [];
    
    // Generate seats for each section if ticket type is selected
    if (selectedTicketType) {
      sampleSections.forEach(section => {
        useSeatMapStore.getState().generateSeatsForSection(section.id, selectedTicketType.id);
      });
    }
    
    setSuccess('Sample theater layout generated successfully');
  };
  
  // Check if we have the selected section
  const selectedSection = sections.find(section => section.id === selectedSectionId);
  
  // Loading state
  if (loading && !seats.length) {
    return <Loader size="lg" text="Loading seat map..." />;
  }
  
  // No ticket types message
  if (ticketTypes.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Ticket Types Required</h2>
        <p className="mb-6">You need to create ticket types before you can design the seat map.</p>
        
        <TicketTypeManager eventId={eventId} />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Toast messages */}
      {error && <Toast type="error" message={error} onClose={() => setError('')} />}
      {success && <Toast type="success" message={success} onClose={() => setSuccess('')} />}
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Panel */}
        <div className="md:w-1/3 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-4">Venue Settings</h3>
            
            <div className="space-y-4">
              <Input 
                label="Venue Name"
                value={layout.name}
                onChange={(e) => handleLayoutChange('name', e.target.value)}
              />
              
              <Select
                label="Venue Type"
                value={layout.venueType}
                onChange={(value) => handleLayoutChange('venueType', value)}
                options={[
                  { value: 'seated', label: 'Seated' },
                  { value: 'standing', label: 'Standing' },
                  { value: 'mixed', label: 'Mixed (Seated & Standing)' }
                ]}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="Width (px)"
                  type="number"
                  min={400}
                  max={2000}
                  value={layout.venueWidth}
                  onChange={(e) => handleLayoutChange('venueWidth', parseInt(e.target.value))}
                />
                
                <Input 
                  label="Height (px)"
                  type="number"
                  min={400}
                  max={1500}
                  value={layout.venueHeight}
                  onChange={(e) => handleLayoutChange('venueHeight', parseInt(e.target.value))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="Seat Size (px)"
                  type="number"
                  min={10}
                  max={50}
                  value={layout.seatSize}
                  onChange={(e) => handleLayoutChange('seatSize', parseInt(e.target.value))}
                />
                
                <Input 
                  label="Grid Size (px)"
                  type="number"
                  min={10}
                  max={100}
                  value={layout.gridSize}
                  onChange={(e) => handleLayoutChange('gridSize', parseInt(e.target.value))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="snapToGrid"
                  checked={layout.snapToGrid}
                  onChange={(e) => handleLayoutChange('snapToGrid', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="snapToGrid" className="text-gray-700">
                  Snap to Grid
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showRowLabels"
                  checked={layout.showRowLabels}
                  onChange={(e) => handleLayoutChange('showRowLabels', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showRowLabels" className="text-gray-700">
                  Show Row Labels
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showSeatNumbers"
                  checked={layout.showSeatNumbers}
                  onChange={(e) => handleLayoutChange('showSeatNumbers', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showSeatNumbers" className="text-gray-700">
                  Show Seat Numbers
                </label>
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              <Button
                variant="secondary"
                onClick={handleGenerateLayout}
                className="w-full"
              >
                Generate Sample Layout
              </Button>
              
              <Button
                onClick={handleSaveLayout}
                disabled={loading}
                loading={loading}
                className="w-full"
              >
                {hasSeatMap ? 'Update Seat Map' : 'Save Seat Map'}
              </Button>
            </div>
          </div>
          
          {/* Section Editor - Only show when a section is selected */}
          {selectedSection && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-4">Section Editor</h3>
              
              {selectedSection.isArc && selectedSection.arcData ? (
                <ArcSectionEditor
                  section={selectedSection}
                  ticketTypes={ticketTypes}
                  selectedTicketType={selectedTicketType}
                  onUpdate={(updatedSection) => {
                    useSeatMapStore.getState().updateSection(updatedSection);
                  }}
                  onGenerateSeats={(sectionId) => {
                    if (selectedTicketType) {
                      useSeatMapStore.getState().generateSeatsForSection(sectionId, selectedTicketType.id);
                    }
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Section Name"
                    value={selectedSection.name}
                    onChange={(e) => {
                      const updatedSection = { ...selectedSection, name: e.target.value };
                      useSeatMapStore.getState().updateSection(updatedSection);
                    }}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Rows"
                      type="number"
                      min={1}
                      max={26}
                      value={selectedSection.rows || 1}
                      onChange={(e) => {
                        const updatedSection = { 
                          ...selectedSection, 
                          rows: parseInt(e.target.value) 
                        };
                        useSeatMapStore.getState().updateSection(updatedSection);
                      }}
                    />
                    
                    <Input
                      label="Seats Per Row"
                      type="number"
                      min={1}
                      max={50}
                      value={selectedSection.seatsPerRow || 1}
                      onChange={(e) => {
                        const updatedSection = { 
                          ...selectedSection, 
                          seatsPerRow: parseInt(e.target.value) 
                        };
                        useSeatMapStore.getState().updateSection(updatedSection);
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Row Start Label"
                      value={selectedSection.rowStartLabel || 'A'}
                      onChange={(e) => {
                        const updatedSection = { 
                          ...selectedSection, 
                          rowStartLabel: e.target.value 
                        };
                        useSeatMapStore.getState().updateSection(updatedSection);
                      }}
                    />
                    
                    <Input
                      label="First Seat Number"
                      type="number"
                      min={1}
                      value={selectedSection.seatStartNumber || 1}
                      onChange={(e) => {
                        const updatedSection = { 
                          ...selectedSection, 
                          seatStartNumber: parseInt(e.target.value) 
                        };
                        useSeatMapStore.getState().updateSection(updatedSection);
                      }}
                    />
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (selectedTicketType) {
                        useSeatMapStore.getState().generateSeatsForSection(selectedSection.id, selectedTicketType.id);
                      }
                    }}
                    disabled={!selectedTicketType}
                    className="w-full"
                  >
                    Generate Seats for Section
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Seat Map */}
        <div className="md:w-2/3">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-4">Venue Layout</h3>
            
            <InteractiveSeatMap 
              eventId={eventId}
              initialLayout={initialLayout}
              ticketTypes={ticketTypes}
            />
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {seats.length} seats in {sections.length} sections
              </div>
              
              <Button
                onClick={handleSaveLayout}
                disabled={loading}
                loading={loading}
              >
                {hasSeatMap ? 'Update Seat Map' : 'Save Seat Map'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 