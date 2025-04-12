import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSeatMapStore } from '@/store/seatMapStore';

interface DrawToolsProps {
  containerRef: React.RefObject<HTMLDivElement>;
  scale: number;
  offset: { x: number; y: number };
}

const DrawTools: React.FC<DrawToolsProps> = ({ containerRef, scale, offset }) => {
  const { 
    activeTool, 
    editorMode, 
    layout, 
    addSection, 
    addSeat,
    ticketTypes
  } = useSeatMapStore();
  
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Arc section specific states
  const [arcCenter, setArcCenter] = useState<{ x: number; y: number } | null>(null);
  const [arcRadius, setArcRadius] = useState<number | null>(null);
  const [arcStage, setArcStage] = useState<'center' | 'radius' | 'angles'>('center');
  const [arcStartAngle, setArcStartAngle] = useState<number | null>(null);
  
  // Grid feedback refs
  const gridSizeX = (layout?.gridSize || 10) * scale;
  const gridSizeY = (layout?.gridSize || 10) * scale;
  
  // Keep track of snap guides
  const [snapGuides, setSnapGuides] = useState<{
    x: number | null;
    y: number | null;
    visible: boolean;
  }>({
    x: null,
    y: null,
    visible: false
  });
  
  // Draw preview ref
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Cleanup on unmount or when containerRef changes
  useEffect(() => {
    return () => {
      setDrawStart(null);
      setCurrentPosition(null);
      setIsDrawing(false);
      setArcCenter(null);
      setArcRadius(null);
      setArcStage('center');
      setArcStartAngle(null);
    };
  }, [containerRef]);
  
  // Snaps a position to grid
  const snapToGrid = useCallback((position: { x: number; y: number }) => {
    if (!layout?.gridSize) return position;
    
    const gridSize = layout.gridSize * scale;
    const snapX = Math.round(position.x / gridSize) * gridSize;
    const snapY = Math.round(position.y / gridSize) * gridSize;
    
    // Update snap guides
    setSnapGuides({
      x: snapX,
      y: snapY,
      visible: true
    });
    
    return { x: snapX, y: snapY };
  }, [layout?.gridSize, scale]);
  
  // Hide snap guides when not moving
  useEffect(() => {
    if (snapGuides.visible) {
      const timer = setTimeout(() => {
        setSnapGuides(prev => ({ ...prev, visible: false }));
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [snapGuides.visible]);
  
  // Get mouse position relative to the container
  const getRelativeMousePosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - offset.x) / scale;
    const rawY = (e.clientY - rect.top - offset.y) / scale;
    
    return { x: rawX, y: rawY };
  }, [containerRef, offset, scale]);
  
  // Get relative position for the preview elements
  const getPreviewPosition = useCallback(() => {
    if (!drawStart || !currentPosition) return { top: 0, left: 0, width: 0, height: 0 };
    
    const minX = Math.min(drawStart.x, currentPosition.x);
    const minY = Math.min(drawStart.y, currentPosition.y);
    const width = Math.abs(currentPosition.x - drawStart.x);
    const height = Math.abs(currentPosition.y - drawStart.y);
    
    return {
      left: minX,
      top: minY,
      width,
      height
    };
  }, [drawStart, currentPosition]);
  
  // Calculate angle from center to point
  const calculateAngle = useCallback((center: { x: number; y: number }, point: { x: number; y: number }) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    // Angle in degrees, 0 at 3 o'clock, going clockwise
    return (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  }, []);
  
  // Calculate distance between two points
  const calculateDistance = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }, []);
  
  // Create a new rectangular section
  const createSection = useCallback(() => {
    if (!drawStart || !currentPosition) return;
    
    // Ensure minimum dimensions
    const width = Math.abs(currentPosition.x - drawStart.x);
    const height = Math.abs(currentPosition.y - drawStart.y);
    
    if (width < 20 || height < 20) {
      console.warn('Section too small', width, height);
      return;
    }
    
    const minX = Math.min(drawStart.x, currentPosition.x);
    const minY = Math.min(drawStart.y, currentPosition.y);
    
    // Create a new section
    const newSection = {
      id: uuidv4(),
      name: `Section ${Math.floor(Math.random() * 900) + 100}`,
      x: minX,
      y: minY,
      width,
      height,
      rotation: 0,
      rows: 5,
      seatsPerRow: 10,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      isArc: false
    };
    
    addSection(newSection);
  }, [drawStart, currentPosition, addSection]);
  
  // Create a new arc section
  const createArcSection = useCallback(() => {
    if (!arcCenter || arcRadius === null || arcStartAngle === null || !currentPosition) return;
    
    // Calculate end angle
    const endAngle = calculateAngle(arcCenter, currentPosition);
    // Small value for inner radius by default (can be adjusted later)
    const innerRadius = arcRadius * 0.7;
    
    // Create arc section properties
    const arcData = {
      centerX: arcCenter.x,
      centerY: arcCenter.y,
      innerRadius,
      outerRadius: arcRadius,
      startAngle: arcStartAngle,
      endAngle
    };
    
    // Calculate bounding box
    const buffer = arcRadius * 1.1; // Add a small buffer
    const newSection = {
      id: uuidv4(),
      name: `Arc ${Math.floor(Math.random() * 900) + 100}`,
      x: arcCenter.x - buffer,
      y: arcCenter.y - buffer,
      width: buffer * 2,
      height: buffer * 2,
      isArc: true,
      arcData,
      rows: 5,
      seatsPerRow: 10,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      rotation: 0
    };
    
    addSection(newSection);
  }, [arcCenter, arcRadius, arcStartAngle, currentPosition, calculateAngle, addSection]);
  
  // Create a new seat
  const createSeat = useCallback((position: { x: number; y: number }) => {
    if (ticketTypes.length === 0) {
      console.warn('No ticket types available');
      return;
    }
    
    const defaultTicketTypeId = ticketTypes[0].id;
    
    const newSeat = {
      id: uuidv4(),
      label: `S${Math.floor(Math.random() * 900) + 100}`,
      x: position.x,
      y: position.y,
      status: 'available',
      ticketTypeId: defaultTicketTypeId
    };
    
    addSeat(newSeat);
  }, [addSeat, ticketTypes]);
  
  // Handle mouse down to begin drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editorMode !== 'draw' || !activeTool) return;
    
    const position = getRelativeMousePosition(e);
    const snappedPos = snapToGrid(position);
    
    if (activeTool === 'seat') {
      // Create seat immediately on click
      createSeat(snappedPos);
    } else if (activeTool === 'arc-section') {
      if (arcStage === 'center') {
        // First, set the center of the arc
        setArcCenter(snappedPos);
        setArcStage('radius');
      } else if (arcStage === 'radius' && arcCenter) {
        // Then set the radius of the arc
        setArcRadius(calculateDistance(arcCenter, snappedPos));
        setArcStage('angles');
      } else if (arcStage === 'angles' && arcCenter && arcRadius !== null) {
        if (arcStartAngle === null) {
          // Set start angle
          setArcStartAngle(calculateAngle(arcCenter, snappedPos));
        } else {
          // Set end angle and create section
          createArcSection();
          
          // Reset for next arc
          setArcCenter(null);
          setArcRadius(null);
          setArcStartAngle(null);
          setArcStage('center');
        }
      }
    } else {
      // For regular sections, start drawing
      setDrawStart(snappedPos);
      setCurrentPosition(snappedPos);
      setIsDrawing(true);
    }
  }, [
    editorMode, 
    activeTool, 
    getRelativeMousePosition, 
    snapToGrid, 
    createSeat, 
    arcStage, 
    arcCenter, 
    arcRadius, 
    arcStartAngle, 
    calculateDistance, 
    calculateAngle, 
    createArcSection
  ]);
  
  // Handle mouse move during drawing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Always update current position for guides
    const position = getRelativeMousePosition(e);
    
    if (snapGuides.visible === false) {
      setSnapGuides(prev => ({ ...prev, visible: true }));
    }
    
    if (isDrawing && drawStart) {
      // For section drawing
      setCurrentPosition(snapToGrid(position));
    } else if (arcStage === 'radius' && arcCenter) {
      // For arc radius visualization
      setCurrentPosition(position);
      
      // Update arc radius visual
      const distance = calculateDistance(arcCenter, position);
      // Don't set arcRadius yet, only when mouse down happens
    } else if (arcStage === 'angles' && arcCenter && arcRadius !== null) {
      // For arc angle visualization
      setCurrentPosition(position);
    } else {
      // Just hover position
      setCurrentPosition(snapToGrid(position));
    }
  }, [
    getRelativeMousePosition, 
    isDrawing, 
    drawStart, 
    arcStage, 
    arcCenter, 
    arcRadius, 
    snapToGrid, 
    calculateDistance,
    snapGuides.visible
  ]);
  
  // Handle mouse up to complete drawing
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDrawing && activeTool === 'section') {
      createSection();
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentPosition(null);
    }
  }, [isDrawing, activeTool, createSection]);
  
  // Set up event listeners
  useEffect(() => {
    if (!containerRef.current || editorMode !== 'draw') return;
    
    const container = containerRef.current;
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef, editorMode, handleMouseMove, handleMouseUp]);
  
  // Render nothing if not in draw mode
  if (editorMode !== 'draw' || !activeTool) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Snapping Guides */}
      {currentPosition && snapGuides.visible && (
        <>
          {/* Vertical guide */}
          {snapGuides.x !== null && (
            <div 
              className="absolute top-0 bottom-0 w-px bg-blue-500 pointer-events-none z-20"
              style={{ 
                left: `${snapGuides.x}px`,
                opacity: 0.7,
              }}
            />
          )}
          
          {/* Horizontal guide */}
          {snapGuides.y !== null && (
            <div 
              className="absolute left-0 right-0 h-px bg-blue-500 pointer-events-none z-20"
              style={{ 
                top: `${snapGuides.y}px`,
                opacity: 0.7,
              }}
            />
          )}
          
          {/* Snapped position indicator */}
          <div 
            className="absolute w-4 h-4 rounded-full bg-blue-500 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center"
            style={{ 
              left: `${currentPosition.x * scale + offset.x}px`,
              top: `${currentPosition.y * scale + offset.y}px`,
              opacity: 0.7,
              border: '2px solid white'
            }}
          />
        </>
      )}
      
      {/* Section Preview */}
      {isDrawing && drawStart && currentPosition && activeTool === 'section' && (
        <div
          ref={previewRef}
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
          style={{
            left: `${Math.min(drawStart.x, currentPosition.x) * scale + offset.x}px`,
            top: `${Math.min(drawStart.y, currentPosition.y) * scale + offset.y}px`,
            width: `${Math.abs(currentPosition.x - drawStart.x) * scale}px`,
            height: `${Math.abs(currentPosition.y - drawStart.y) * scale}px`,
          }}
        >
          {/* Size indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow">
            {Math.round(Math.abs(currentPosition.x - drawStart.x))} × {Math.round(Math.abs(currentPosition.y - drawStart.y))}
          </div>
        </div>
      )}
      
      {/* Arc Preview */}
      {arcCenter && arcStage !== 'center' && (
        <div className="absolute" style={{
          left: `${(arcCenter.x) * scale + offset.x}px`,
          top: `${(arcCenter.y) * scale + offset.y}px`,
        }}>
          {/* Center marker */}
          <div className="absolute w-4 h-4 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
          
          {/* Radius visualization */}
          {currentPosition && (
            <div className="absolute border border-blue-500 border-dashed rounded-full -translate-x-1/2 -translate-y-1/2" style={{
              width: `${calculateDistance(arcCenter, currentPosition) * 2 * scale}px`,
              height: `${calculateDistance(arcCenter, currentPosition) * 2 * scale}px`,
            }} />
          )}
          
          {/* Actual radius */}
          {arcRadius !== null && (
            <div className="absolute border-2 border-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2" style={{
              width: `${arcRadius * 2 * scale}px`,
              height: `${arcRadius * 2 * scale}px`,
            }} />
          )}
          
          {/* Angle visualization */}
          {arcRadius !== null && arcStartAngle !== null && currentPosition && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: `${arcRadius * 2 * scale}px`,
                height: `${arcRadius * 2 * scale}px`,
                transform: 'translate(-50%, -50%)',
              }}
              viewBox={`0 0 ${arcRadius * 2} ${arcRadius * 2}`}
            >
              <defs>
                <mask id="arcPreviewMask">
                  <rect width="100%" height="100%" fill="white" />
                  <path
                    d={`
                      M ${arcRadius},${arcRadius}
                      L ${arcRadius + arcRadius * Math.cos(arcStartAngle * Math.PI / 180)},
                        ${arcRadius + arcRadius * Math.sin(arcStartAngle * Math.PI / 180)}
                      A ${arcRadius},${arcRadius} 0 
                        ${(calculateAngle(arcCenter, currentPosition) - arcStartAngle + 360) % 360 > 180 ? '1' : '0'} 1 
                        ${arcRadius + arcRadius * Math.cos(calculateAngle(arcCenter, currentPosition) * Math.PI / 180)},
                        ${arcRadius + arcRadius * Math.sin(calculateAngle(arcCenter, currentPosition) * Math.PI / 180)}
                      Z
                    `}
                    fill="black"
                  />
                </mask>
              </defs>
              
              <rect
                width="100%"
                height="100%"
                fill="rgba(59, 130, 246, 0.3)"
                mask="url(#arcPreviewMask)"
              />
              
              {/* Start angle line */}
              <line
                x1={arcRadius}
                y1={arcRadius}
                x2={arcRadius + arcRadius * Math.cos(arcStartAngle * Math.PI / 180)}
                y2={arcRadius + arcRadius * Math.sin(arcStartAngle * Math.PI / 180)}
                stroke="blue"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              
              {/* Current angle line */}
              <line
                x1={arcRadius}
                y1={arcRadius}
                x2={arcRadius + arcRadius * Math.cos(calculateAngle(arcCenter, currentPosition) * Math.PI / 180)}
                y2={arcRadius + arcRadius * Math.sin(calculateAngle(arcCenter, currentPosition) * Math.PI / 180)}
                stroke="blue"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              
              {/* Arc */}
              <path
                d={`
                  M ${arcRadius + arcRadius * Math.cos(arcStartAngle * Math.PI / 180)},
                    ${arcRadius + arcRadius * Math.sin(arcStartAngle * Math.PI / 180)}
                  A ${arcRadius},${arcRadius} 0 
                    ${(calculateAngle(arcCenter, currentPosition) - arcStartAngle + 360) % 360 > 180 ? '1' : '0'} 1 
                    ${arcRadius + arcRadius * Math.cos(calculateAngle(arcCenter, currentPosition) * Math.PI / 180)},
                    ${arcRadius + arcRadius * Math.sin(calculateAngle(arcCenter, currentPosition) * Math.PI / 180)}
                `}
                stroke="blue"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}
        </div>
      )}
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-lg text-sm z-30">
        {activeTool === 'seat' && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">Adding Seats</div>
              <div className="text-gray-600">Click anywhere to place individual seats</div>
            </div>
          </div>
        )}
        
        {activeTool === 'section' && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm0 2h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">Drawing Section</div>
              <div className="text-gray-600">Click and drag to create a rectangular section</div>
            </div>
          </div>
        )}
        
        {activeTool === 'arc-section' && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">Drawing Arc Section {arcStage !== 'center' && `- Step ${arcStage === 'radius' ? '2/3' : '3/3'}`}</div>
              <div className="text-gray-600">
                {arcStage === 'center' && 'Click to set center point'}
                {arcStage === 'radius' && 'Click to set outer radius'}
                {arcStage === 'angles' && arcStartAngle === null && 'Click to set start angle'}
                {arcStage === 'angles' && arcStartAngle !== null && 'Click to set end angle and create section'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawTools; 