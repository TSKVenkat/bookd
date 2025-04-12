'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSeatMapStore } from '@/store/seatMapStore';
import { useZoomAndPan } from '@/hooks/useZoomAndPan';
import { useSeatMapKeyboard } from '@/hooks/useSeatMapKeyboard';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { throttle } from 'lodash';
import { Button } from '@/components/ui/Button';

// Import Konva types without importing the actual components
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Seat, Section } from '@/store/seatMapStore';

// Define threshold for when to switch from SVG to Canvas rendering
const CANVAS_THRESHOLD = 2000; // Switch to Canvas when more than 2000 seats

interface OptimizedSeatMapProps {
  eventId: string;
  initialLayout?: string;
  ticketTypes: Array<{id: string; name: string; price: number; color?: string}>;
  readOnly?: boolean;
  onSave?: () => void;
}

// Dynamic import with SSR disabled for Konva components
const KonvaStage = dynamic(() => import('react-konva').then(mod => mod.Stage), { ssr: false });
const KonvaLayer = dynamic(() => import('react-konva').then(mod => mod.Layer), { ssr: false });
const KonvaRect = dynamic(() => import('react-konva').then(mod => mod.Rect), { ssr: false });
const KonvaGroup = dynamic(() => import('react-konva').then(mod => mod.Group), { ssr: false });
const KonvaCircle = dynamic(() => import('react-konva').then(mod => mod.Circle), { ssr: false });
const KonvaText = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });

// Dynamic import with SSR disabled for custom Konva components
const KonvaSeat = dynamic(() => import('./KonvaSeat'), { ssr: false });
const KonvaSection = dynamic(() => import('./KonvaSection'), { ssr: false });

const OptimizedSeatMap: React.FC<OptimizedSeatMapProps> = ({
  eventId,
  initialLayout,
  ticketTypes,
  readOnly = false,
  onSave
}) => {
  // Track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    deleteSelectedItems,
    resetSeatMap
  } = useSeatMapStore();
  
  // Local state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [useCanvasRenderer, setUseCanvasRenderer] = useState(false);
  const [visibleSeats, setVisibleSeats] = useState<Seat[]>([]);
  const [visibleSections, setVisibleSections] = useState<Section[]>([]);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up zoom and pan functionality
  const {
    scale,
    offset,
    zoomIn,
    zoomOut,
    resetView,
    isDragging,
    setScale
  } = useZoomAndPan(containerRef, { 
    minScale: 0.1, 
    maxScale: 5,
    wheelZoomEnabled: true,
    pinchZoomEnabled: true,
    zoomTowardsPointer: true,
    boundaryPadding: 100
  });
  
  // Set up keyboard shortcuts
  useSeatMapKeyboard({
    disabledWhen: () => isTooltipVisible
  });
  
  // Initialize the seat map with data if provided
  useEffect(() => {
    if (initialLayout) {
      try {
        // Parse the initialLayout JSON
        const parsedLayout = typeof initialLayout === 'string' 
          ? JSON.parse(initialLayout) 
          : initialLayout;
        
        // Handle empty or invalid layout data
        if (parsedLayout && typeof parsedLayout === 'object') {
          // Extract layout data, checking for both layout and mapData fields
          let layoutData;
          if (parsedLayout.layout) {
            layoutData = parsedLayout.layout;
          } else if (parsedLayout.mapData) {
            // If we have mapData (from the schema), try to parse it
            try {
              layoutData = JSON.parse(parsedLayout.mapData);
            } catch {
              // If mapData can't be parsed, use it directly
              layoutData = parsedLayout.mapData;
            }
          } else {
            // If neither layout nor mapData is present, use the parsedLayout itself
            layoutData = parsedLayout;
          }
          
          // Create a simplified data structure with just the layout
          const simplifiedData = {
            layout: layoutData,
            seats: [], // We'll generate these client-side if needed
            sections: [] // We'll generate these client-side if needed
          };
          
          console.log('Initializing seat map with data:', simplifiedData);
          initializeFromData(simplifiedData);
        } else {
          console.warn('Invalid layout data:', parsedLayout);
        }
      } catch (error) {
        console.error('Failed to parse layout JSON', error);
      }
    }
    
    if (ticketTypes) {
      setTicketTypes(ticketTypes);
    }
    
    return () => {
      if (!initialLayout) {
        resetSeatMap();
      }
    };
  }, [initialLayout, ticketTypes, initializeFromData, setTicketTypes, resetSeatMap]);
  
  // Determine rendering mode based on seat count
  useEffect(() => {
    setUseCanvasRenderer(seats.length > CANVAS_THRESHOLD);
  }, [seats.length]);
  
  // Calculate visible viewport for virtualization
  const calculateVisibleItems = useCallback(
    throttle(() => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calculate viewport bounds in virtual coordinates
      const viewportLeft = -offset.x / scale;
      const viewportTop = -offset.y / scale;
      const viewportRight = viewportLeft + rect.width / scale;
      const viewportBottom = viewportTop + rect.height / scale;
      
      // Add padding to prevent pop-in when scrolling
      const padding = 300 / scale;
      
      // Filter seats to only those in the viewport
      const newVisibleSeats = seats.filter(seat => {
        return (
          seat.x >= viewportLeft - padding &&
          seat.x <= viewportRight + padding &&
          seat.y >= viewportTop - padding &&
          seat.y <= viewportBottom + padding
        );
      });
      
      setVisibleSeats(newVisibleSeats);
      
      // Sections are typically larger, so we might want to include them
      // even if only partially visible
      const newVisibleSections = sections.filter(section => {
        const sRight = section.x + section.width;
        const sBottom = section.y + section.height;
        
        return (
          ((section.x >= viewportLeft - padding && section.x <= viewportRight + padding) ||
           (sRight >= viewportLeft - padding && sRight <= viewportRight + padding)) &&
          ((section.y >= viewportTop - padding && section.y <= viewportBottom + padding) ||
           (sBottom >= viewportTop - padding && sBottom <= viewportBottom + padding))
        );
      });
      
      setVisibleSections(newVisibleSections);
    }, 150),
    [seats, sections, offset, scale]
  );
  
  // Update visible items when viewport changes
  useEffect(() => {
    calculateVisibleItems();
    
    // Set up event listener for pan/zoom updates
    window.addEventListener('seat-map:update-viewport', calculateVisibleItems);
    
    return () => {
      window.removeEventListener('seat-map:update-viewport', calculateVisibleItems);
    };
  }, [calculateVisibleItems]);
  
  // Calculate background grid style
  const gridStyle = useMemo(() => {
    const gridSize = layout?.gridSize || 20;
    return {
      backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
      backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
      backgroundPosition: `${offset.x}px ${offset.y}px`,
    };
  }, [layout?.gridSize, scale, offset]);
  
  // Calculate transform style for SVG content
  const transformStyle = useMemo(() => {
    return {
      transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
      transformOrigin: '0 0',
    };
  }, [scale, offset]);
  
  // Calculate cursor style
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
  
  // Handle showing tooltip
  const handleShowTooltip = useCallback((seat: Seat, position: {x: number, y: number}) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    // Find ticket type info
    const ticketType = ticketTypes.find(t => t.id === seat.ticketTypeId);
    
    // Format the seat label properly
    let formattedRow = seat.row || 'A';
    let formattedNumber = seat.number?.toString() || '1';
    
    // Ensure label is correctly formatted
    const label = seat.label || `${formattedRow}${formattedNumber}`;
    
    setTooltipContent({
      id: seat.id,
      label: label,
      row: formattedRow,
      number: formattedNumber,
      status: seat.status,
      price: ticketType?.price,
      type: ticketType?.name || seat.type
    });
    
    setTooltipPosition(position);
    setIsTooltipVisible(true);
  }, [ticketTypes]);
  
  // Handle hiding tooltip
  const handleHideTooltip = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    tooltipTimeoutRef.current = setTimeout(() => {
      setIsTooltipVisible(false);
    }, 100);
  }, []);
  
  // Handle background click
  const handleBackgroundClick = useCallback((e: React.MouseEvent | KonvaEventObject<MouseEvent>) => {
    // Skip if clicking on a seat or section
    const target = 'target' in e ? e.target : (e as any).target;
    if (target && (target.attrs?.id?.startsWith('seat-') || target.attrs?.id?.startsWith('section-'))) {
      return;
    }
    
    if (editorMode !== 'draw') {
      clearSelection();
    }
  }, [editorMode, clearSelection]);

  // Conditional rendering for SSR
  if (!isClient) {
    return (
      <div className="flex items-center justify-center w-full h-96 bg-gray-100 rounded-lg">
        <div className="text-gray-500">Loading seat map...</div>
      </div>
    );
  }
  
  // Render based on whether we're using Canvas or SVG
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={containerRef}
          className="absolute inset-0 overflow-hidden touch-none"
          style={{ 
            ...gridStyle, 
            cursor: containerCursor,
          }}
          onClick={handleBackgroundClick as any}
        >
          {useCanvasRenderer && isClient ? (
            renderCanvas()
          ) : (
            renderSVG()
          )}
          
          {/* Tooltip */}
          {isTooltipVisible && tooltipContent && (
            <div 
              className="absolute bg-black bg-opacity-75 text-white p-2 rounded text-sm pointer-events-none z-50"
              style={{
                left: tooltipPosition.x + 15,
                top: tooltipPosition.y - 5,
                maxWidth: '250px',
              }}
            >
              <div className="font-bold">{tooltipContent.label}</div>
              {tooltipContent.row && tooltipContent.number && (
                <div>Row {tooltipContent.row}, Seat {tooltipContent.number}</div>
              )}
              {tooltipContent.type && (
                <div>Type: {tooltipContent.type}</div>
              )}
              {tooltipContent.status && (
                <div>Status: {tooltipContent.status}</div>
              )}
              {tooltipContent.price !== undefined && (
                <div>Price: ${tooltipContent.price}</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button onClick={zoomIn} className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </Button>
          
          <Button onClick={zoomOut} className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </Button>
          
          <Button onClick={resetView} className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </Button>
          
          <div className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm">
            {Math.round(scale * 100)}%
          </div>
        </div>
        
        <div>
          {selectedSeats.length > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">{selectedSeats.length} seats selected</span>
              
              <Button 
                variant="danger"
                size="sm"
                onClick={() => clearSelection()}
              >
                Clear
              </Button>
              
              {ticketTypes.length > 0 && (
                <select
                  className="form-select text-sm border rounded py-1 px-2"
                  onChange={(e) => assignTicketTypeToSelectedSeats(e.target.value)}
                >
                  <option value="">Assign Ticket Type</option>
                  {ticketTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} (${type.price})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Render SVG content
  function renderSVG() {
    return (
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="absolute inset-0"
        overflow="visible"
      >
        <g style={transformStyle}>
          {/* Stage background if needed */}
          {layout?.hasStage && (
            <rect
              x="0"
              y="0"
              width="1000"
              height="100"
              fill="#e5e7eb"
              rx="10"
              ry="10"
            />
          )}
          
          {/* Render sections */}
          {visibleSections.map((section) => (
            <g
              key={section.id}
              transform={`translate(${section.x}, ${section.y}) rotate(${section.rotation || 0})`}
            >
              <rect
                width={section.width}
                height={section.height}
                fill={section.color}
                fillOpacity="0.2"
                stroke={section.color}
                strokeWidth="2"
                rx="5"
                ry="5"
                id={`section-${section.id}`}
                style={{
                  cursor: 'pointer',
                  strokeDasharray: selectedSectionId === section.id ? '5,5' : 'none',
                }}
              />
              <text
                x={section.width / 2}
                y={section.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(0,0,0,0.7)"
                fontSize="14"
                fontWeight="500"
              >
                {section.name}
              </text>
            </g>
          ))}
          
          {/* Render seats */}
          {visibleSeats.map((seat) => {
            const isSelected = selectedSeats.includes(seat.id);
            const ticketType = ticketTypes.find(t => t.id === seat.ticketTypeId);
            
            return (
              <g
                key={seat.id}
                transform={`translate(${seat.x}, ${seat.y}) rotate(${seat.rotation || 0})`}
                id={`seat-${seat.id}`}
                onClick={() => {/* Handle selection */}}
                onMouseEnter={(e) => handleShowTooltip(seat, { x: e.clientX, y: e.clientY })}
                onMouseLeave={handleHideTooltip}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={-layout.seatSize / 2}
                  y={-layout.seatSize / 2}
                  width={layout.seatSize}
                  height={layout.seatSize}
                  rx="3"
                  ry="3"
                  fill={ticketType?.color || '#9ca3af'}
                  stroke={isSelected ? '#000' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                  opacity={seat.status === 'available' ? 1 : 0.5}
                />
                
                {layout.seatSize > 15 && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={layout.seatSize * 0.4}
                    fontWeight="500"
                  >
                    {seat.number}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    );
  }
  
  // Render Canvas content (only client-side)
  function renderCanvas() {
    return (
      <>
        {isClient && (
          <KonvaStage
            ref={stageRef}
            width={containerRef.current?.clientWidth || window.innerWidth}
            height={containerRef.current?.clientHeight || window.innerHeight}
            offsetX={-offset.x / scale}
            offsetY={-offset.y / scale}
            scaleX={scale}
            scaleY={scale}
            onClick={handleBackgroundClick as any}
          >
            <KonvaLayer>
              {/* Stage background if needed */}
              {layout?.hasStage && (
                <KonvaRect
                  x={0}
                  y={0}
                  width={1000}
                  height={100}
                  fill="#e5e7eb"
                  cornerRadius={10}
                />
              )}
              
              {/* Render sections */}
              {visibleSections.map((section) => (
                <KonvaSection
                  key={section.id}
                  section={section}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => {/* Handle selection */}}
                />
              ))}
              
              {/* Render seats */}
              {visibleSeats.map((seat) => (
                <KonvaSeat
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeats.includes(seat.id)}
                  seatSize={layout.seatSize}
                  ticketType={ticketTypes.find(t => t.id === seat.ticketTypeId)}
                  onSelect={() => {/* Handle selection */}}
                  onShowTooltip={(position) => handleShowTooltip(seat, position)}
                  onHideTooltip={handleHideTooltip}
                />
              ))}
            </KonvaLayer>
          </KonvaStage>
        )}
      </>
    );
  }
};

export default OptimizedSeatMap; 