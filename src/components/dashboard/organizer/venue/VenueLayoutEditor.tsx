'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loader } from '@/components/ui/Loader';
import { 
  VenueLayout, 
  StageConfig, 
  Seat, 
  Section, 
  TicketType, 
  SeatMapEditorProps,
  EditorMode,
  DrawTool,
  generateSectionSeats
} from './SeatMapTypes';
import VenueLayoutCanvas from './VenueLayoutCanvas';
import { TicketTypeManager } from './TicketTypeManager';
import ArcSectionEditor from './ArcSectionEditor';
import { 
  Grid, 
  Move, 
  Pencil, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  RotateCw,
  Square,
  Circle,
  Type
} from 'lucide-react';

// Default values
const DEFAULT_LAYOUT: VenueLayout = {
  name: 'New Venue Layout',
  rows: 10,
  columns: 15,
  seatSize: 25,
  venueType: 'seated',
  rowSpacing: 35,
  columnSpacing: 30,
  arcEnabled: false,
  arcRadius: 300,
  arcSpanDegrees: 120,
  arcStartDegree: -60,
  venueWidth: 800,
  venueHeight: 600,
  rowLabels: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  showGrid: true,
  gridSize: 20,
  snapToGrid: true,
  showRowLabels: true,
  showSeatNumbers: true,
  showSectionLabels: true
};

const DEFAULT_STAGE: StageConfig = {
  name: 'SCREEN',
  shape: 'rectangle',
  width: 300,
  height: 60,
  x: 250,
  y: 520,
};

const VenueLayoutEditor: React.FC<SeatMapEditorProps> = ({ 
  eventId,
  initialLayout = null,
  ticketTypes = []
}) => {
  // State
  const [layout, setLayout] = useState<VenueLayout>({ ...DEFAULT_LAYOUT, stageConfig: DEFAULT_STAGE });
  const [seats, setSeats] = useState<Seat[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.View);
  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
  
  const [hasSeatMap, setHasSeatMap] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
  // Load initial data
  useEffect(() => {
    if (initialLayout) {
      try {
        const parsedData = typeof initialLayout === 'string' 
          ? JSON.parse(initialLayout) 
          : initialLayout;
        
        // Parse layout data
        if (parsedData.layout) {
          setLayout(prevLayout => ({
            ...prevLayout,
            ...parsedData.layout,
            stageConfig: {
              ...(prevLayout.stageConfig || DEFAULT_STAGE),
              ...(parsedData.stageConfig || {})
            }
          }));
        }
        
        // Parse seats
        if (Array.isArray(parsedData.seats)) {
          setSeats(parsedData.seats);
        }
        
        // Parse sections
        if (Array.isArray(parsedData.sections)) {
          setSections(parsedData.sections);
        }
      } catch (err) {
        console.error('Error parsing initial layout:', err);
        setError('Failed to load the existing layout configuration.');
      }
    }
    
    // Check if seat map exists
    checkSeatMap();
    
    // Set default selected ticket type if available
    if (ticketTypes.length > 0) {
      setSelectedTicketType(ticketTypes[0]);
    }
  }, [initialLayout, eventId, ticketTypes]);
  
  // Check if seat map exists
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
  
  // Selection handlers
  const handleSeatClick = (seat: Seat) => {
    setSelectedSeatId(seat.id);
    setSelectedSectionId(null);
  };
  
  const handleSectionClick = (section: Section) => {
    setSelectedSectionId(section.id);
    setSelectedSeatId(null);
  };
  
  const handleCanvasClick = () => {
    setSelectedSeatId(null);
    setSelectedSectionId(null);
  };
  
  // Add handlers
  const handleSeatAdd = (seat: Seat) => {
    // Generate a unique ID
    const newSeat = {
      ...seat,
      id: seat.id || `seat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      typeId: seat.typeId || (selectedTicketType?.id || '')
    };
    
    setSeats(prevSeats => [...prevSeats, newSeat]);
    setSelectedSeatId(newSeat.id);
  };
  
  const handleSectionAdd = (section: Section) => {
    // Generate a unique ID
    const newSection = {
      ...section,
      id: section.id || `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    setSections(prevSections => [...prevSections, newSection]);
    setSelectedSectionId(newSection.id);
  };
  
  // Update handlers
  const handleSeatUpdate = (updatedSeat: Seat) => {
    setSeats(prevSeats => 
      prevSeats.map(seat => seat.id === updatedSeat.id ? updatedSeat : seat)
    );
  };
  
  const handleSectionUpdate = (updatedSection: Section) => {
    setSections(prevSections => 
      prevSections.map(section => section.id === updatedSection.id ? updatedSection : section)
    );
  };
  
  // Delete handlers
  const handleSeatDelete = (id: string) => {
    setSeats(prevSeats => prevSeats.filter(seat => seat.id !== id));
    if (selectedSeatId === id) {
      setSelectedSeatId(null);
    }
  };
  
  const handleSectionDelete = (id: string) => {
    // Delete the section
    setSections(prevSections => prevSections.filter(section => section.id !== id));
    
    // Also remove any seats that belong to this section
    setSeats(prevSeats => prevSeats.filter(seat => seat.sectionId !== id));
    
    if (selectedSectionId === id) {
      setSelectedSectionId(null);
    }
  };
  
  // Generate seats for a section
  const handleGenerateSeatsForSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !selectedTicketType) return;
    
    // Generate seats for this section
    const newSeats = generateSectionSeats(section, selectedTicketType.id);
    
    // Add the new seats
    setSeats(prevSeats => {
      // Remove any existing seats for this section
      const filteredSeats = prevSeats.filter(seat => seat.sectionId !== sectionId);
      // Add the new seats
      return [...filteredSeats, ...newSeats];
    });
    
    setSuccess(`Generated ${newSeats.length} seats for section "${section.name}"`);
  };
  
  // Rotate a section
  const handleRotateSection = (sectionId: string, degrees: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Update the section's rotation
    const currentRotation = section.rotation || 0;
    const newRotation = (currentRotation + degrees) % 360;
    
    const updatedSection = {
      ...section,
      rotation: newRotation
    };
    
    handleSectionUpdate(updatedSection);
    
    // If there are seats in this section, rotate them too
    const sectionSeats = seats.filter(seat => seat.sectionId === sectionId);
    if (sectionSeats.length > 0) {
      // Ask if user wants to rotate the seats too
      if (confirm(`Do you want to rotate the ${sectionSeats.length} seats in this section too?`)) {
        const updatedSeats = sectionSeats.map(seat => {
          const seatRotation = seat.rotation || 0;
          return {
            ...seat,
            rotation: (seatRotation + degrees) % 360
          };
        });
        
        setSeats(prevSeats => {
          // Replace the updated seats
          const unseatedSeats = prevSeats.filter(seat => seat.sectionId !== sectionId);
          return [...unseatedSeats, ...updatedSeats];
        });
      }
    }
  };
  
  // Generate layout automatically
  const handleGenerateLayout = () => {
    if (seats.length > 0) {
      if (!confirm('This will replace the existing seats. Continue?')) {
        return;
      }
    }
    
    // Create a sample arc section
    const centerX = layout.venueWidth ? layout.venueWidth / 2 : 400;
    const centerY = layout.venueHeight ? layout.venueHeight - 200 : 400;
    
    const arcSection: Section = {
      id: `arc-section-${Date.now()}`,
      name: 'Main Seating',
      x: centerX - 300, // Bounding box x
      y: centerY - 300, // Bounding box y
      width: 600, // Bounding box width
      height: 300, // Bounding box height
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
    };
    
    // Add two side sections
    const leftSection: Section = {
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
    };
    
    const rightSection: Section = {
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
    };
    
    // Add VIP section at the front
    const vipSection: Section = {
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
    };
    
    // Set the new sections
    const newSections = [arcSection, leftSection, rightSection, vipSection];
    setSections(newSections);
    
    // Clear existing seats
    setSeats([]);
    
    // Generate seats for each section if there's a selected ticket type
    if (selectedTicketType) {
      const allNewSeats = newSections.flatMap(section => 
        generateSectionSeats(section, selectedTicketType.id)
      );
      
      setSeats(allNewSeats);
    }
    
    setSuccess('Sample theater layout generated successfully');
  };
  
  // Save the layout
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
      
      setSeats(updatedSeats);
    }
    
    try {
      const payload = {
        layout,
        seats: seats.map(seat => ({
          ...seat,
          typeId: seat.typeId || ticketTypes[0].id
        })),
        stageConfig: layout.stageConfig || DEFAULT_STAGE,
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
  
  // Get the selected seat and section objects
  const selectedSeat = seats.find(seat => seat.id === selectedSeatId) || null;
  const selectedSection = sections.find(section => section.id === selectedSectionId) || null;
  
  // Group seats by section for display
  const seatsBySection = seats.reduce((acc, seat) => {
    const sectionId = seat.sectionId || 'unsectioned';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);
  
  // Update layout
  const updateLayout = (key: keyof VenueLayout, value: any) => {
    setLayout(prev => ({ ...prev, [key]: value }));
  };
  
  // Handle form input
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    isNumeric: boolean = false
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      updateLayout(name as keyof VenueLayout, (e.target as HTMLInputElement).checked);
    } else if (isNumeric) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        updateLayout(name as keyof VenueLayout, numValue);
      }
    } else {
      updateLayout(name as keyof VenueLayout, value);
    }
  };
  
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
      
      {/* Beginner's guide */}
      {showGuide && (
        <div className="bg-blue-50 p-4 rounded-md relative">
          <button 
            className="absolute top-2 right-2 text-blue-700" 
            onClick={() => setShowGuide(false)}
          >
            &times;
          </button>
          <h3 className="font-semibold text-blue-800">Venue Layout Editor Guide</h3>
          <ul className="mt-2 text-sm text-blue-700 list-disc pl-5 space-y-1">
            <li>Use the toolbar to switch between view, draw, edit, and delete modes</li>
            <li>Create sections first (rectangular or curved) to organize your seats</li>
            <li>Generate seats automatically for each section</li>
            <li>Drag seats and sections to reposition them in edit mode</li>
            <li>Rotate sections to create angled seating areas</li>
            <li>Each seat must be assigned to a ticket type</li>
            <li>Remember to save your changes before leaving this page</li>
          </ul>
        </div>
      )}
      
      {/* Editor toolbar */}
      <div className="bg-white rounded-lg shadow p-3 flex flex-wrap items-center gap-3">
        <div className="flex border rounded-md overflow-hidden">
          <button
            className={`p-2 ${editorMode === EditorMode.View ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => {
              setEditorMode(EditorMode.View);
              setActiveTool(null);
            }}
            title="View Mode"
          >
            <Move size={20} />
          </button>
          <button
            className={`p-2 ${editorMode === EditorMode.Draw ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => {
              setEditorMode(EditorMode.Draw);
              setActiveTool(DrawTool.Seat);
            }}
            title="Draw Mode"
          >
            <Pencil size={20} />
          </button>
          <button
            className={`p-2 ${editorMode === EditorMode.Edit ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => {
              setEditorMode(EditorMode.Edit);
              setActiveTool(null);
            }}
            title="Edit Mode"
          >
            <Move size={20} />
          </button>
          <button
            className={`p-2 ${editorMode === EditorMode.Delete ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => {
              setEditorMode(EditorMode.Delete);
              setActiveTool(null);
            }}
            title="Delete Mode"
          >
            <Trash2 size={20} />
          </button>
        </div>
        
        {editorMode === EditorMode.Draw && (
          <div className="flex border rounded-md overflow-hidden ml-2">
            <button
              className={`p-2 ${activeTool === DrawTool.Seat ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTool(DrawTool.Seat)}
              title="Add Seat"
            >
              <Plus size={20} />
            </button>
            <button
              className={`p-2 ${activeTool === DrawTool.Section ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTool(DrawTool.Section)}
              title="Add Section"
            >
              <Square size={20} />
            </button>
            <button
              className={`p-2 ${activeTool === DrawTool.ArcSection ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTool(DrawTool.ArcSection)}
              title="Add Arc Section"
            >
              <Circle size={20} />
            </button>
            <button
              className={`p-2 ${activeTool === DrawTool.Text ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTool(DrawTool.Text)}
              title="Add Text Label"
            >
              <Type size={20} />
            </button>
          </div>
        )}
        
        <div className="ml-auto flex items-center gap-3">
          <button
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
            onClick={() => setLayout(prev => ({ ...prev, showGrid: !prev.showGrid }))}
            title="Toggle Grid"
          >
            <Grid size={18} />
            <span className="hidden sm:inline">{layout.showGrid ? 'Hide Grid' : 'Show Grid'}</span>
          </button>
          
          <button
            className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex items-center gap-1"
            onClick={handleGenerateLayout}
            title="Generate Sample Layout"
          >
            <Plus size={18} />
            <span>Generate Sample</span>
          </button>
          
          <Button
            onClick={handleSaveLayout}
            disabled={loading}
            loading={loading}
          >
            {hasSeatMap ? 'Update Seat Map' : 'Save Seat Map'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar (settings) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Venue Settings</h3>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            
            {isExpanded && (
              <div className="space-y-4">
                <Input 
                  label="Venue Name"
                  name="name"
                  value={layout.name}
                  onChange={(e) => handleFormChange(e)}
                />
                
                <Select
                  label="Venue Type"
                  name="venueType"
                  value={layout.venueType}
                  onChange={(value) => updateLayout('venueType', value)}
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
                    name="venueWidth"
                    min={400}
                    max={2000}
                    value={layout.venueWidth}
                    onChange={(e) => handleFormChange(e, true)}
                  />
                  
                  <Input 
                    label="Height (px)"
                    type="number"
                    name="venueHeight"
                    min={400}
                    max={1500}
                    value={layout.venueHeight}
                    onChange={(e) => handleFormChange(e, true)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="Seat Size (px)"
                    type="number"
                    name="seatSize"
                    min={10}
                    max={50}
                    value={layout.seatSize}
                    onChange={(e) => handleFormChange(e, true)}
                  />
                  
                  <Input 
                    label="Grid Size (px)"
                    type="number"
                    name="gridSize"
                    min={10}
                    max={100}
                    value={layout.gridSize}
                    onChange={(e) => handleFormChange(e, true)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="snapToGrid"
                    name="snapToGrid"
                    checked={layout.snapToGrid}
                    onChange={(e) => handleFormChange(e)}
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
                    name="showRowLabels"
                    checked={layout.showRowLabels}
                    onChange={(e) => handleFormChange(e)}
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
                    name="showSeatNumbers"
                    checked={layout.showSeatNumbers}
                    onChange={(e) => handleFormChange(e)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showSeatNumbers" className="text-gray-700">
                    Show Seat Numbers
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Ticket types selection */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-3">Ticket Types</h3>
            <Select
              label="Active Ticket Type"
              value={selectedTicketType?.id || ''}
              onChange={(value) => {
                const selected = ticketTypes.find(t => t.id === value);
                setSelectedTicketType(selected || null);
              }}
              options={[
                { value: '', label: 'Select Ticket Type' },
                ...ticketTypes.map(type => ({
                  value: type.id,
                  label: `${type.name} - $${type.price}`
                }))
              ]}
            />
            <div className="mt-2 flex justify-end">
              <a
                href={`/organizer/events/${eventId}/tickets`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Manage Ticket Types
              </a>
            </div>
          </div>
          
          {/* Selected item details */}
          {selectedSeat && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Selected Seat</h3>
                <button
                  onClick={() => handleSeatDelete(selectedSeat.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete Seat"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Row"
                    value={selectedSeat.row}
                    onChange={(e) => {
                      handleSeatUpdate({
                        ...selectedSeat,
                        row: e.target.value
                      });
                    }}
                  />
                  
                <Input
                    label="Number"
                    value={selectedSeat.number}
                    onChange={(e) => {
                      handleSeatUpdate({
                        ...selectedSeat,
                        number: e.target.value
                      });
                    }}
                />
              </div>
              
                <Select
                  label="Seat Type"
                  value={selectedSeat.seatType || 'regular'}
                  onChange={(value) => {
                    handleSeatUpdate({
                      ...selectedSeat,
                      seatType: value as 'regular' | 'accessible' | 'premium'
                    });
                  }}
                  options={[
                    { value: 'regular', label: 'Regular' },
                    { value: 'accessible', label: 'Accessible' },
                    { value: 'premium', label: 'Premium' }
                  ]}
                />
              
                <Select
                  label="Ticket Type"
                  value={selectedSeat.typeId || ''}
                  onChange={(value) => {
                    handleSeatUpdate({
                      ...selectedSeat,
                      typeId: value
                    });
                  }}
                  options={[
                    { value: '', label: 'Select Ticket Type' },
                    ...ticketTypes.map(type => ({
                    value: type.id,
                      label: `${type.name} - $${type.price}`
                    }))
                  ]}
                />
                
                <Select
                  label="Status"
                  value={selectedSeat.status}
                  onChange={(value) => {
                    handleSeatUpdate({
                      ...selectedSeat,
                      status: value as 'available' | 'unavailable' | 'reserved' | 'sold'
                    });
                  }}
                  options={[
                    { value: 'available', label: 'Available' },
                    { value: 'unavailable', label: 'Unavailable' },
                    { value: 'reserved', label: 'Reserved' },
                    { value: 'sold', label: 'Sold' }
                  ]}
                />
                
                <Input
                  label="Rotation (degrees)"
                  type="number"
                  value={selectedSeat.rotation || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      handleSeatUpdate({
                        ...selectedSeat,
                        rotation: value
                      });
                    }
                  }}
                />
              </div>
            </div>
          )}
          
          {selectedSection && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Selected Section</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRotateSection(selectedSection.id, -15)}
                    className="text-blue-500 hover:text-blue-700"
                    title="Rotate Counter-Clockwise"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => handleRotateSection(selectedSection.id, 15)}
                    className="text-blue-500 hover:text-blue-700"
                    title="Rotate Clockwise"
                  >
                    <RotateCw size={18} />
                  </button>
                  <button
                    onClick={() => handleSectionDelete(selectedSection.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete Section"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {selectedSection.isArc && selectedSection.arcData ? (
                <ArcSectionEditor
                  section={selectedSection}
                  ticketTypes={ticketTypes}
                  selectedTicketType={selectedTicketType}
                  onUpdate={handleSectionUpdate}
                  onGenerateSeats={handleGenerateSeatsForSection}
                />
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Name"
                    value={selectedSection.name}
                    onChange={(e) => {
                      handleSectionUpdate({
                        ...selectedSection,
                        name: e.target.value
                      });
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
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          handleSectionUpdate({
                            ...selectedSection,
                            rows: value
                          });
                        }
                      }}
                    />
                    
                    <Input
                      label="Seats Per Row"
                      type="number"
                      min={1}
                      max={50}
                      value={selectedSection.seatsPerRow || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          handleSectionUpdate({
                            ...selectedSection,
                            seatsPerRow: value
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Row Start Label"
                      value={selectedSection.rowStartLabel || 'A'}
                      onChange={(e) => {
                        handleSectionUpdate({
                          ...selectedSection,
                          rowStartLabel: e.target.value
                        });
                      }}
                    />
                    
                    <Input
                      label="First Seat Number"
                      type="number"
                      min={1}
                      value={selectedSection.seatStartNumber || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          handleSectionUpdate({
                            ...selectedSection,
                            seatStartNumber: value
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <Button
                    onClick={() => handleGenerateSeatsForSection(selectedSection.id)}
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
        
        {/* Main content (canvas) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-4">Venue Layout</h3>
            
            <VenueLayoutCanvas
              layout={layout}
              sections={sections}
              seats={seats}
              selectedSeatId={selectedSeatId}
              selectedSectionId={selectedSectionId}
              stageConfig={layout.stageConfig || DEFAULT_STAGE}
              editorMode={editorMode}
              activeTool={activeTool}
              selectedTicketType={selectedTicketType}
              onSeatClick={handleSeatClick}
              onSectionClick={handleSectionClick}
              onSeatAdd={handleSeatAdd}
              onSectionAdd={handleSectionAdd}
              onSeatUpdate={handleSeatUpdate}
              onSectionUpdate={handleSectionUpdate}
              onCanvasClick={handleCanvasClick}
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
          
          {/* Sections overview */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-3">Sections Overview</h3>
            
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-3">
                No sections created yet. Use the drawing tools to create sections.
              </p>
            ) : (
              <div className="space-y-3">
                {sections.map(section => {
                  const sectionSeats = seatsBySection[section.id] || [];
                  return (
                    <div 
                      key={section.id}
                      className={`border rounded-md p-3 hover:bg-gray-50 ${selectedSectionId === section.id ? 'border-blue-300 bg-blue-50' : ''}`}
                      onClick={() => handleSectionClick(section)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: section.color }}
                          ></div>
                          <h4 className="font-medium">{section.name}</h4>
                        </div>
                        <div className="text-sm text-gray-500">
                          {sectionSeats.length} seats
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueLayoutEditor; 