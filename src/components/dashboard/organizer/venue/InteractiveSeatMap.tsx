import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSeatMapStore } from '@/store/seatMapStore';
import { useZoomAndPan } from '@/hooks/useZoomAndPan';
import { useSeatMapKeyboard } from '@/hooks/useSeatMapKeyboard';
import InteractiveSeat from './InteractiveSeat';
import InteractiveSection from './InteractiveSection';
import DrawTools from './DrawTools';
import { Button } from '@/components/ui/Button';
import { 
  ZoomIn, ZoomOut, 
  Move, Pencil, Trash2, Plus, 
  RotateCcw, RotateCw, 
  Square, Circle, Maximize, Minimize
} from 'lucide-react';

export interface InteractiveSeatMapProps {
  eventId: string;
  initialLayout?: string;
  ticketTypes: Array<{id: string; name: string; price: number}>;
  readOnly?: boolean;
}

const InteractiveSeatMap: React.FC<InteractiveSeatMapProps> = ({
  eventId,
  initialLayout,
  ticketTypes,
  readOnly = false
}) => {
  // Get state and actions from store
  const {
    seats,
    sections,
    layout,
    selectedSeats,
    selectedSectionId,
    editorMode,
    activeTool,
    setTicketTypes,
    initializeFromData,
    setEditorMode,
    setActiveTool,
    clearSelection,
    assignTicketTypeToSelectedSeats,
    resetSeatMap
  } = useSeatMapStore();
  
  // Container ref for zoom and pan functionality
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  
  // Set up zoom and pan functionality
  const {
    scale,
    offset,
    zoomIn,
    zoomOut,
    resetView,
    isDragging
  } = useZoomAndPan(containerRef, { minScale: 0.1, maxScale: 3 });
  
  // Set up keyboard shortcuts
  useSeatMapKeyboard();
  
  // Initialize the seat map with data if provided
  useEffect(() => {
    if (initialLayout) {
      try {
        const parsedLayout = JSON.parse(initialLayout);
        initializeFromData(parsedLayout);
      } catch (error) {
        console.error('Failed to parse layout JSON', error);
      }
    }
    
    if (ticketTypes) {
      setTicketTypes(ticketTypes);
    }
    
    return () => {
      // Reset state when component unmounts if no initial layout provided
      if (!initialLayout) {
        resetSeatMap();
      }
    };
  }, [initialLayout, ticketTypes, initializeFromData, setTicketTypes, resetSeatMap]);
  
  // Handle background click to clear selection (unless in draw mode)
  const handleBackgroundClick = useCallback(() => {
    if (editorMode !== 'draw') {
      clearSelection();
    }
  }, [editorMode, clearSelection]);
  
  // Calculate background grid style based on grid size and scale
  const gridStyle = useMemo(() => {
    const gridSize = layout?.gridSize || 20;
    return {
      backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
      backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
      backgroundPosition: `${offset.x}px ${offset.y}px`,
    };
  }, [layout?.gridSize, scale, offset]);
  
  // Calculate transform style for the content layer
  const transformStyle = useMemo(() => {
    return {
      transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
      transformOrigin: '0 0',
    };
  }, [scale, offset]);
  
  // Calculate the main container cursor style
  const containerCursor = useMemo(() => {
    if (isDragging) return 'grabbing';
    if (editorMode === 'view') return 'grab';
    if (editorMode === 'draw' && activeTool === 'seat') return 'cell';
    if (editorMode === 'draw' && activeTool === 'section') return 'crosshair';
    if (editorMode === 'draw' && activeTool === 'arc-section') return 'crosshair';
    if (editorMode === 'edit') return 'move';
    if (editorMode === 'delete') return 'not-allowed';
    return 'default';
  }, [editorMode, activeTool, isDragging]);
  
  // Determine if this is a venue with a stage
  const hasStage = useMemo(() => {
    return layout?.hasStage || sections.some(s => s.name.toLowerCase().includes('stage'));
  }, [layout, sections]);
  
  // Get the selected section
  const selectedSection = useMemo(() => {
    return sections.find(s => s.id === selectedSectionId);
  }, [sections, selectedSectionId]);
  
  return (
    <div className="flex flex-col w-full gap-3 h-full">
      {/* Editor toolbar */}
      {!readOnly && (
        <div 
          ref={controlsRef}
          className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-wrap gap-2"
        >
          {/* Mode buttons */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium ${editorMode === 'view' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setEditorMode('view')}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span>View</span>
              </div>
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium ${editorMode === 'draw' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setEditorMode('draw')}
              disabled={readOnly}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span>Draw</span>
              </div>
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium ${editorMode === 'edit' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setEditorMode('edit')}
              disabled={readOnly}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                <span>Edit</span>
              </div>
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium ${editorMode === 'delete' ? 'bg-red-50 text-red-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setEditorMode('delete')}
              disabled={readOnly}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Delete</span>
              </div>
            </button>
          </div>
          
          {/* Draw mode tools */}
          {editorMode === 'draw' && (
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`px-3 py-1.5 text-sm font-medium ${activeTool === 'seat' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTool('seat')}
              >
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <span>Add Seat</span>
                </div>
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium ${activeTool === 'section' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTool('section')}
              >
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm0 2h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Add Section</span>
                </div>
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium ${activeTool === 'arc-section' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTool('arc-section')}
              >
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                  <span>Add Arc</span>
                </div>
              </button>
            </div>
          )}
          
          {/* Zoom controls */}
          <div className="flex ml-auto border rounded-md overflow-hidden">
            <button
              className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 hover:bg-gray-50"
              onClick={zoomIn}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Zoom In</span>
              </div>
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 hover:bg-gray-50"
              onClick={zoomOut}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>Zoom Out</span>
              </div>
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 hover:bg-gray-50"
              onClick={resetView}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span>Reset</span>
              </div>
            </button>
          </div>
          
          {/* Section rotation (if in edit mode) */}
          {editorMode === 'edit' && selectedSection && !selectedSection.isArc && (
            <div className="flex border rounded-md overflow-hidden">
              <button
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  if (selectedSection) {
                    useSeatMapStore.getState().updateSection({
                      ...selectedSection,
                      rotation: (selectedSection.rotation || 0) - 15
                    });
                  }
                }}
              >
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Rotate CCW</span>
                </div>
              </button>
              <button
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  if (selectedSection) {
                    useSeatMapStore.getState().updateSection({
                      ...selectedSection,
                      rotation: (selectedSection.rotation || 0) + 15
                    });
                  }
                }}
              >
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                  <span>Rotate CW</span>
                </div>
              </button>
            </div>
          )}
          
          {/* Legend */}
          <div className="ml-4 flex items-center px-2 border-l border-gray-200">
            <div className="text-xs text-gray-500 flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span className="mr-3">Available</span>
              
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              <span className="mr-3">Reserved</span>
              
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main seat map container */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-gray-50 rounded-lg border border-gray-200 shadow-inner ${containerCursor}`}
        onClick={handleBackgroundClick}
        style={{ touchAction: 'none' }}
      >
        {/* Background grid */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            ...gridStyle,
            opacity: scale < 0.6 ? 0 : scale < 1 ? (scale - 0.6) * 2.5 : 1
          }}
        />
        
        {/* Stage */}
        {hasStage && (
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-bold rounded-b-lg px-12 py-2 text-center z-10 shadow-md border-2 border-gray-700"
            style={{
              width: '200px',
              transform: `translateX(-50%) scale(${scale}) translateY(${offset.y / scale}px)`,
              opacity: scale < 0.3 ? 0 : 1,
            }}
          >
            STAGE
          </div>
        )}
        
        {/* Drawing tools (only when in draw mode) */}
        {editorMode === 'draw' && !readOnly && (
          <DrawTools
            containerRef={containerRef}
            scale={scale}
            offset={offset}
          />
        )}
        
        {/* Transformed content layer (sections and seats) */}
        <div
          className="absolute inset-0 origin-top-left"
          style={transformStyle}
        >
          {/* Sections */}
          {sections.map((section) => (
            <InteractiveSection
              key={section.id}
              section={section}
              isSelected={section.id === selectedSectionId}
              scale={scale}
              showLabel={scale > 0.3}
            />
          ))}
          
          {/* Seats */}
          {seats.map((seat) => {
            const isSelected = selectedSeats.includes(seat.id);
            
            return (
              <InteractiveSeat
                key={seat.id}
                seat={seat}
                isSelected={isSelected}
                seatSize={layout?.seatSize || 20}
                scale={scale}
              />
            );
          })}
        </div>
        
        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-70 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm">
          {Math.round(scale * 100)}%
        </div>
      </div>
      
      {/* Selected seats summary */}
      {selectedSeats.length > 0 && (
        <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
          </span>
          
          <button
            className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
            onClick={() => clearSelection()}
          >
            Clear
          </button>
          
          {!readOnly && ticketTypes.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm font-medium">Set ticket type:</span>
              <select
                className="py-1 px-2 border border-gray-300 rounded"
                onChange={(e) => assignTicketTypeToSelectedSeats(e.target.value)}
              >
                <option value="">Select a type...</option>
                {ticketTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: 'USD',
                      minimumFractionDigits: 0 
                    }).format(type.price)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveSeatMap; 