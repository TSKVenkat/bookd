'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Group, Text } from 'react-konva';
import { useSeatMapStore } from '@/store/seatMapStore';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import KonvaSeat from './KonvaSeat';
import KonvaSection from './KonvaSection';
import ControlPanel from './ControlPanel';
import { ChevronUp, ChevronDown, RotateCcw, RotateCw, Save, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface EnhancedSeatMapProps {
  eventId: string;
  initialLayout?: any;
  ticketTypes?: any[];
  readOnly?: boolean;
}

export default function EnhancedSeatMap({
  eventId,
  initialLayout = null,
  ticketTypes = [],
  readOnly = false
}: EnhancedSeatMapProps) {
  // Refs
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(600);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hoveredSeat, setHoveredSeat] = useState<any>(null);
  
  // Get state from store
  const {
    seats,
    sections,
    layout,
    selectedSeatIds,
    selectedSectionId,
    editorMode,
    activeTool,
    selectedTicketType,
    setLayout,
    setTicketTypes,
    setSelectedTicketType,
    resetStore
  } = useSeatMapStore();
  
  // Initialize with data
  useEffect(() => {
    if (initialLayout) {
      try {
        const parsedData = typeof initialLayout === 'string' 
          ? JSON.parse(initialLayout) 
          : initialLayout;
        
        // Set the layout
        if (parsedData.layout) {
          setLayout(parsedData.layout);
        }
      } catch (err) {
        console.error('Error parsing initial layout:', err);
      }
    }
    
    // Set ticket types
    if (ticketTypes.length > 0) {
      setTicketTypes(ticketTypes);
      setSelectedTicketType(ticketTypes[0]);
    }
    
    // Cleanup on unmount
    return () => {
      if (!initialLayout) {
        resetStore();
      }
    };
  }, [initialLayout, ticketTypes, setLayout, setTicketTypes, setSelectedTicketType, resetStore]);
  
  // Adjust canvas size based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setStageWidth(clientWidth);
        setStageHeight(clientHeight);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Handle zooming
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    
    // Zoom speed factor
    const zoomFactor = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * zoomFactor : oldScale / zoomFactor;
    
    // Limit min/max scale
    const limitedScale = Math.max(0.1, Math.min(5, newScale));
    
    setScale(limitedScale);
    
    // Calculate new position to zoom toward mouse pointer
    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };
    
    setPosition(newPos);
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    const newScale = scale * 1.2;
    setScale(Math.min(5, newScale));
  };
  
  const handleZoomOut = () => {
    const newScale = scale / 1.2;
    setScale(Math.max(0.1, newScale));
  };
  
  const handleResetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Handle canvas drag
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Snap position to grid
  const snapToGrid = (pos: { x: number; y: number }, gridSize: number = 20) => {
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
  };
  
  // Handle clicking on the background
  const handleStageClick = (e: any) => {
    // Ignore if dragging or not clicking on the stage directly
    if (isDragging || e.target !== e.currentTarget) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    // Clear selections when clicking on background
    useSeatMapStore.getState().clearSelectedSeats();
    useSeatMapStore.getState().setSelectedSectionId(null);
    
    // If in draw mode, handle drawing
    if (editorMode === 'draw' && activeTool) {
      const pos = stage.getPointerPosition();
      const worldPos = {
        x: (pos.x - position.x) / scale,
        y: (pos.y - position.y) / scale,
      };
      
      // If snapToGrid is enabled in layout
      const snappedPos = layout.snapToGrid ? snapToGrid(worldPos) : worldPos;
      
      if (activeTool === 'seat' && selectedTicketType) {
        // Add a single seat
        useSeatMapStore.getState().addSeat({
          id: `seat-${Date.now()}`,
          row: 'X',
          number: '1',
          status: 'available',
          type: 'regular',
          typeId: selectedTicketType.id,
          x: snappedPos.x,
          y: snappedPos.y,
          rotation: 0,
        });
      } else if (activeTool === 'section') {
        if (!isDrawing) {
          // Start drawing a section
          setIsDrawing(true);
          setDrawStart(snappedPos);
        }
      }
    }
  };
  
  // Handle mouse move for drawing
  const handleMouseMove = (e: any) => {
    if (editorMode !== 'draw' || !isDrawing || !drawStart) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    const worldPos = {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale,
    };
    
    // If snapToGrid is enabled in layout
    const snappedPos = layout.snapToGrid ? snapToGrid(worldPos) : worldPos;
    
    // Update current mouse position for drawing preview
    // This would be used to render a preview of the section being drawn
  };
  
  // Handle mouse up for drawing
  const handleMouseUp = () => {
    if (editorMode !== 'draw' || !isDrawing || !drawStart) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    const worldPos = {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale,
    };
    
    // If snapToGrid is enabled in layout
    const snappedPos = layout.snapToGrid ? snapToGrid(worldPos) : worldPos;
    
    // Calculate section dimensions
    const x = Math.min(drawStart.x, snappedPos.x);
    const y = Math.min(drawStart.y, snappedPos.y);
    const width = Math.abs(snappedPos.x - drawStart.x);
    const height = Math.abs(snappedPos.y - drawStart.y);
    
    // Only create if the section has some size
    if (width > 10 && height > 10) {
      useSeatMapStore.getState().addSection({
        id: `section-${Date.now()}`,
        name: `Section ${Math.floor(Math.random() * 100)}`,
        x,
        y,
        width,
        height,
        color: `hsla(${Math.random() * 360}, 70%, 75%, 0.6)`,
        rotation: 0,
        rows: Math.max(1, Math.floor(height / 30)),
        seatsPerRow: Math.max(1, Math.floor(width / 30)),
        rowStartLabel: 'A',
        seatStartNumber: 1,
        rowSpacing: 30,
        seatSpacing: 30,
      });
    }
    
    // End drawing
    setIsDrawing(false);
    setDrawStart(null);
  };
  
  // Save seat map
  const handleSaveLayout = async () => {
    if (ticketTypes.length === 0) {
      setError('Please create at least one ticket type before saving the seat map');
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        layout,
        seats: seats.map(seat => ({
          ...seat,
          typeId: seat.typeId || ticketTypes[0].id,
        })),
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
  
  return (
    <div className="flex flex-col h-full">
      {error && <Toast type="error" message={error} onClose={() => setError('')} />}
      {success && <Toast type="success" message={success} onClose={() => setSuccess('')} />}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Interactive Seat Map</h2>
        
        {!readOnly && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSaveLayout}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Layout
            </Button>
          </div>
        )}
      </div>
      
      {!readOnly && (
        <ControlPanel
          editorMode={editorMode}
          activeTool={activeTool}
          ticketTypes={ticketTypes}
          selectedTicketType={selectedTicketType}
          selectedSectionId={selectedSectionId}
          section={sections.find(s => s.id === selectedSectionId)}
        />
      )}
      
      <div 
        ref={containerRef}
        className="relative border rounded-md bg-gray-100 mt-4"
        style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}
      >
        <div className="absolute top-2 right-2 z-10 flex space-x-1 bg-white rounded-md shadow-sm">
          <button
            className="p-1 hover:bg-gray-100 rounded-l-md"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="p-1 hover:bg-gray-100"
            onClick={handleResetView}
            title="Reset View"
          >
            <Maximize size={18} />
          </button>
          <button
            className="p-1 hover:bg-gray-100 rounded-r-md"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>
        
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          draggable={editorMode !== 'draw'}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          position={position}
          scale={{ x: scale, y: scale }}
        >
          {/* Grid Layer */}
          <Layer>
            {layout.showGrid && Array.from({ length: Math.ceil(stageWidth / (layout.gridSize || 20)) }).map((_, i) => (
              <React.Fragment key={`grid-v-${i}`}>
                <Rect
                  x={i * (layout.gridSize || 20)}
                  y={0}
                  width={1}
                  height={stageHeight}
                  fill="#e5e7eb"
                />
              </React.Fragment>
            ))}
            
            {layout.showGrid && Array.from({ length: Math.ceil(stageHeight / (layout.gridSize || 20)) }).map((_, i) => (
              <React.Fragment key={`grid-h-${i}`}>
                <Rect
                  x={0}
                  y={i * (layout.gridSize || 20)}
                  width={stageWidth}
                  height={1}
                  fill="#e5e7eb"
                />
              </React.Fragment>
            ))}
          </Layer>
          
          {/* Stage Layer */}
          <Layer>
            {layout.stageConfig && (
              <Group>
                <Rect
                  x={layout.stageConfig.x}
                  y={layout.stageConfig.y}
                  width={layout.stageConfig.width}
                  height={layout.stageConfig.height}
                  fill="#1f2937"
                  rotation={layout.stageConfig.rotation || 0}
                  cornerRadius={
                    layout.stageConfig.shape === 'semicircle' ? layout.stageConfig.height / 2 : 0
                  }
                />
                <Text
                  x={layout.stageConfig.x + layout.stageConfig.width / 2}
                  y={layout.stageConfig.y + layout.stageConfig.height / 2}
                  text={layout.stageConfig.name || "STAGE"}
                  fill="#ffffff"
                  fontSize={16}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  offsetX={layout.stageConfig.width / 2}
                  offsetY={layout.stageConfig.height / 2}
                  rotation={layout.stageConfig.rotation || 0}
                />
              </Group>
            )}
          </Layer>
          
          {/* Sections Layer */}
          <Layer>
            {sections.map(section => (
              <KonvaSection
                key={section.id}
                section={section}
                isSelected={selectedSectionId === section.id}
                showLabel={layout.showSectionLabels}
              />
            ))}
          </Layer>
          
          {/* Seats Layer */}
          <Layer>
            {seats.map(seat => (
              <KonvaSeat
                key={seat.id}
                seat={seat}
                isSelected={selectedSeatIds.includes(seat.id)}
                seatSize={layout.seatSize}
                showLabel={layout.showRowLabels}
                showNumber={layout.showSeatNumbers}
                isEditorMode={!readOnly}
                onHover={setHoveredSeat}
              />
            ))}
          </Layer>
          
          {/* Preview Layer for Drawing */}
          {isDrawing && drawStart && (
            <Layer>
              <Rect
                x={drawStart.x}
                y={drawStart.y}
                width={50} // This would be dynamic based on current mouse position
                height={50} // This would be dynamic based on current mouse position
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[5, 5]}
                fill="rgba(59, 130, 246, 0.1)"
              />
            </Layer>
          )}
        </Stage>
        
        {/* Zoom indicator */}
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-80 rounded px-2 py-1 text-xs text-gray-600">
          {Math.round(scale * 100)}%
        </div>
        
        {/* Seat hover tooltip */}
        {hoveredSeat && (
          <div 
            className="absolute bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded pointer-events-none"
            style={{
              left: hoveredSeat.x * scale + position.x,
              top: hoveredSeat.y * scale + position.y - 25,
              transform: 'translate(-50%, -100%)',
              zIndex: 1000,
            }}
          >
            {hoveredSeat.row}{hoveredSeat.number} - {hoveredSeat.status}
          </div>
        )}
      </div>
      
      {/* Selected seats summary */}
      {selectedSeatIds.length > 0 && (
        <div className="mt-4 p-3 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="space-x-2">
              <Button 
                variant="outline"
                onClick={() => useSeatMapStore.getState().clearSelectedSeats()}
                size="sm"
              >
                Clear Selection
              </Button>
              {selectedTicketType && (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // Change the type of selected seats
                    selectedSeatIds.forEach(seatId => {
                      const seat = seats.find(s => s.id === seatId);
                      if (seat && seat.status !== 'booked') {
                        useSeatMapStore.getState().updateSeat({
                          ...seat,
                          typeId: selectedTicketType.id,
                        });
                      }
                    });
                  }}
                >
                  Assign to {selectedTicketType.name}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 