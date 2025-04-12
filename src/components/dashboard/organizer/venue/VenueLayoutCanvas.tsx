'use client';

import React, { useRef, useEffect, useState } from 'react';
import { 
  TicketType, 
  Seat, 
  Section, 
  StageConfig, 
  VenueLayout, 
  Position,
  EditorMode,
  DrawTool,
  calculateArcPosition
} from './SeatMapTypes';

interface VenueLayoutCanvasProps {
  layout: VenueLayout;
  sections: Section[];
  seats: Seat[];
  selectedSeatId: string | null;
  selectedSectionId: string | null;
  stageConfig: StageConfig;
  editorMode: EditorMode;
  activeTool: DrawTool | null;
  selectedTicketType: TicketType | null;
  onSeatClick: (seat: Seat) => void;
  onSectionClick: (section: Section) => void;
  onSeatAdd: (seat: Seat) => void;
  onSectionAdd: (section: Section) => void;
  onSeatUpdate: (seat: Seat) => void;
  onSectionUpdate: (section: Section) => void;
  onCanvasClick: () => void;
}

// Helper function to generate seat color based on status and ticket type
const getSeatColor = (
  seat: Seat, 
  ticketTypes: TicketType[],
  isSelected: boolean
): string => {
  if (isSelected) return '#3b82f6'; // Blue when selected
  
  if (seat.status === 'unavailable') return '#6b7280'; // Gray
  if (seat.status === 'reserved') return '#eab308'; // Yellow
  if (seat.status === 'sold') return '#ef4444'; // Red
  
  // Available seats - use ticket type color if available
  if (seat.typeId) {
    const ticketType = ticketTypes.find(tt => tt.id === seat.typeId);
    if (ticketType?.color) return ticketType.color;
  }
  
  return '#10b981'; // Default green
};

// Helper function to draw a seat
const drawSeat = (
  ctx: CanvasRenderingContext2D,
  seat: Seat,
  seatSize: number,
  isSelected: boolean,
  ticketTypes: TicketType[],
  showSeatNumbers: boolean
) => {
  const { x, y, rotation, seatType } = seat;
  
  ctx.save();
  
  // Apply rotation if specified
  if (rotation) {
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-x, -y);
  }
  
  // Set fill and stroke styles
  const color = getSeatColor(seat, ticketTypes, isSelected);
  ctx.fillStyle = color;
  ctx.strokeStyle = isSelected ? '#1e40af' : '#0f172a';
  ctx.lineWidth = isSelected ? 2 : 1;
  
  // Draw seat based on seat type
  const halfSize = seatSize / 2;
  
  switch (seatType) {
    case 'accessible':
      // Accessible seat (rounded rectangle with symbol)
      ctx.beginPath();
      ctx.roundRect(x - halfSize, y - halfSize, seatSize, seatSize, 8);
      ctx.fill();
      ctx.stroke();
      
      // Draw accessibility symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.floor(seatSize * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♿', x, y);
      break;
      
    case 'premium':
      // Premium seat (star shape)
      const outerRadius = halfSize;
      const innerRadius = halfSize * 0.4;
      const spikes = 5;
      
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / spikes) * i;
        const pointX = x + Math.cos(angle) * radius;
        const pointY = y + Math.sin(angle) * radius;
        
        if (i === 0) ctx.moveTo(pointX, pointY);
        else ctx.lineTo(pointX, pointY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    default:
      // Regular seat (square with rounded corners)
      ctx.beginPath();
      ctx.roundRect(x - halfSize, y - halfSize, seatSize, seatSize, 4);
      ctx.fill();
      ctx.stroke();
  }
  
  // Draw seat label if requested
  if (showSeatNumbers && seat.row && seat.number && seatSize >= 20) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(seatSize * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${seat.number}`, x, y);
  }
  
  ctx.restore();
};

// Helper function to draw a stage
const drawStage = (
  ctx: CanvasRenderingContext2D,
  stageConfig: StageConfig,
  isSelected: boolean
) => {
  const { x, y, width, height, shape, rotation = 0, name } = stageConfig;
  
  ctx.save();
  
  // Apply rotation if specified
  if (rotation) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }
  
  // Set fill and stroke styles
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = isSelected ? '#3b82f6' : '#0f172a';
  ctx.lineWidth = isSelected ? 3 : 2;
  
  // Draw stage based on shape
  switch (shape) {
    case 'semicircle':
      // Rectangle with a semicircle
      ctx.beginPath();
      ctx.rect(x, y + height / 2, width, height / 2);
      ctx.arc(x + width / 2, y + height / 2, width / 2, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'circle':
      // Circle
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      break;
      
    default:
      // Rectangle
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 8);
      ctx.fill();
      ctx.stroke();
  }
  
  // Draw label
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name || 'Stage', x + width / 2, y + height / 2);
  
  ctx.restore();
};

// Helper function to draw a section
const drawSection = (
  ctx: CanvasRenderingContext2D,
  section: Section,
  isSelected: boolean,
  showSectionLabels: boolean
) => {
  const { x, y, width, height, color = '#94a3b8', rotation = 0, name } = section;
  
  ctx.save();
  
  // Apply rotation if needed
  if (rotation) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }
  
  // Set fill and stroke styles
  ctx.fillStyle = isSelected ? `${color}dd` : `${color}99`;
  ctx.strokeStyle = isSelected ? '#3b82f6' : '#0f172a';
  ctx.lineWidth = isSelected ? 3 : 2;
  
  // Draw section as rectangle with dashed border
  if (!isSelected) {
    ctx.setLineDash([5, 5]);
  }
  
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
  
  // Draw label if requested
  if (showSectionLabels && name) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x + width / 2, y + height / 2);
  }
  
  ctx.restore();
};

// Helper function to draw arc section
const drawArcSection = (
  ctx: CanvasRenderingContext2D,
  section: Section,
  isSelected: boolean,
  showSectionLabels: boolean
) => {
  if (!section.arcData) return;
  
  const { centerX, centerY, innerRadius, outerRadius, startAngle, endAngle } = section.arcData;
  const name = section.name || 'Arc Section';
  
  ctx.save();
  
  // Set fill and stroke styles
  const color = section.color || '#94a3b8';
  ctx.fillStyle = isSelected ? `${color}dd` : `${color}99`;
  ctx.strokeStyle = isSelected ? '#3b82f6' : '#0f172a';
  ctx.lineWidth = isSelected ? 3 : 2;
  
  // Draw section as arc
  if (!isSelected) {
    ctx.setLineDash([5, 5]);
  }
  
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;
  
  // Draw arc section - first the outer arc
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, startAngleRad, endAngleRad);
  
  // Draw the line to inner radius at end angle
  const endAngleOuterX = centerX + Math.cos(endAngleRad) * outerRadius;
  const endAngleOuterY = centerY + Math.sin(endAngleRad) * outerRadius;
  const endAngleInnerX = centerX + Math.cos(endAngleRad) * innerRadius;
  const endAngleInnerY = centerY + Math.sin(endAngleRad) * innerRadius;
  ctx.lineTo(endAngleInnerX, endAngleInnerY);
  
  // Draw the inner arc in reverse
  ctx.arc(centerX, centerY, innerRadius, endAngleRad, startAngleRad, true);
  
  // Complete the path
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Draw label if requested
  if (showSectionLabels && name) {
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = (innerRadius + outerRadius) / 2;
    const labelX = centerX + Math.cos(labelAngle * Math.PI / 180) * labelRadius;
    const labelY = centerY + Math.sin(labelAngle * Math.PI / 180) * labelRadius;
    
    ctx.fillStyle = '#0f172a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Rotate text to follow the arc
    ctx.translate(labelX, labelY);
    ctx.rotate((labelAngle + 90) * Math.PI / 180);
    ctx.fillText(name, 0, 0);
  }
  
  ctx.restore();
};

// Helper function to draw row labels
const drawRowLabels = (
  ctx: CanvasRenderingContext2D,
  seats: Seat[],
  layout: VenueLayout
) => {
  if (!layout.showRowLabels) return;
  
  // Group seats by row
  const rowMap = new Map<string, Seat[]>();
  seats.forEach(seat => {
    if (!rowMap.has(seat.row)) {
      rowMap.set(seat.row, []);
    }
    rowMap.get(seat.row)?.push(seat);
  });
  
  // Draw row labels
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  rowMap.forEach((rowSeats, rowLabel) => {
    if (rowSeats.length === 0) return;
    
    // Find leftmost seat in the row
    const leftmostSeat = rowSeats.reduce((prev, current) => 
      prev.x < current.x ? prev : current
    );
    
    // Draw label to the left of the row
    ctx.fillText(
      rowLabel, 
      leftmostSeat.x - layout.seatSize - 10, 
      leftmostSeat.y
    );
  });
  
  ctx.restore();
};

// Helper function to draw background grid
const drawGrid = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  gridSize: number = 50
) => {
  ctx.save();
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  
  // Draw vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Draw horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.restore();
};

// Main component
const VenueLayoutCanvas: React.FC<VenueLayoutCanvasProps> = ({
  layout,
  sections,
  seats,
  selectedSeatId,
  selectedSectionId,
  stageConfig,
  editorMode,
  activeTool,
  selectedTicketType,
  onSeatClick,
  onSectionClick,
  onSeatAdd,
  onSectionAdd,
  onSeatUpdate,
  onSectionUpdate,
  onCanvasClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(layout.venueWidth || 800);
  const [canvasHeight, setCanvasHeight] = useState(layout.venueHeight || 600);
  
  // State for drawing and interaction
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{type: 'seat' | 'section', id: string} | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Position>({ x: 0, y: 0 });
  const [currentMousePos, setCurrentMousePos] = useState<Position>({ x: 0, y: 0 });
  
  // State for arc section creation
  const [arcCreationStage, setArcCreationStage] = useState<'center' | 'inner' | 'outer' | 'start' | 'end' | null>(null);
  const [arcCreationData, setArcCreationData] = useState<Partial<{
    centerX: number,
    centerY: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number,
  }>>({});
  
  // State for regular section creation
  const [sectionStart, setSectionStart] = useState<Position | null>(null);
  
  // Set canvas dimensions based on layout
  useEffect(() => {
    setCanvasWidth(layout.venueWidth || 800);
    setCanvasHeight(layout.venueHeight || 600);
  }, [layout]);
  
  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid if enabled
    if (layout.showGrid) {
      drawGrid(ctx, canvas.width, canvas.height, layout.gridSize || 50);
    }
    
    // Draw sections
    sections.forEach(section => {
      const isSelected = section.id === selectedSectionId;
      if (section.isArc && section.arcData) {
        drawArcSection(ctx, section, isSelected, layout.showSectionLabels || false);
      } else {
        drawSection(ctx, section, isSelected, layout.showSectionLabels || false);
      }
    });
    
    // Draw stage
    drawStage(ctx, stageConfig, false);
    
    // Draw row labels if enabled
    if (layout.showRowLabels) {
      drawRowLabels(ctx, seats, layout);
    }
    
    // Draw seats
    seats.forEach(seat => {
      const isSelected = seat.id === selectedSeatId;
      drawSeat(ctx, seat, layout.seatSize, isSelected, [selectedTicketType].filter(Boolean) as TicketType[], layout.showSeatNumbers || false);
    });
    
    // Draw preview elements for creation modes
    if (editorMode === EditorMode.Draw) {
      // Arc section preview
      if (activeTool === DrawTool.ArcSection && arcCreationStage) {
        drawArcCreationPreview(ctx);
      }
      
      // Regular section preview
      if (activeTool === DrawTool.Section && sectionStart) {
        drawSectionCreationPreview(ctx);
      }
      
      // Single seat preview when in seat placement mode
      if (activeTool === DrawTool.Seat && !isDragging) {
        drawSeatPlacementPreview(ctx);
      }
    }
    
  }, [
    canvasWidth,
    canvasHeight,
    layout,
    sections,
    seats,
    selectedSeatId,
    selectedSectionId,
    stageConfig,
    editorMode,
    activeTool,
    selectedTicketType,
    isDragging,
    draggedItem,
    currentMousePos,
    sectionStart,
    arcCreationStage,
    arcCreationData
  ]);
  
  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Snap to grid if enabled
    const position = layout.snapToGrid 
      ? snapToGrid({ x, y }, layout.gridSize || 20)
      : { x, y };
    
    // Handle different editor modes
    switch (editorMode) {
      case EditorMode.View:
        handleViewModeClick(position);
        break;
      case EditorMode.Draw:
        handleDrawModeClick(position);
        break;
      case EditorMode.Edit:
        handleEditModeClick(position);
        break;
      case EditorMode.Delete:
        handleDeleteModeClick(position);
        break;
    }
  };
  
  // Handle view mode clicks (selection)
  const handleViewModeClick = (position: Position) => {
    const { x, y } = position;
    
    // Check if clicked on a seat
    const clickedSeat = findSeatAtPosition(x, y);
    if (clickedSeat) {
      onSeatClick(clickedSeat);
      return;
    }
    
    // Check if clicked on a section
    const clickedSection = findSectionAtPosition(x, y);
    if (clickedSection) {
      onSectionClick(clickedSection);
      return;
    }
    
    // If nothing was clicked, clear selection
    onCanvasClick();
  };
  
  // Handle drawing mode clicks
  const handleDrawModeClick = (position: Position) => {
    const { x, y } = position;
    
    if (!activeTool) return;
    
    switch (activeTool) {
      case DrawTool.Seat:
        // Add a single seat at the clicked position
        if (selectedTicketType) {
          const newSeat: Seat = {
            id: `seat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            row: 'A', // Default row, should be configurable
            number: '1', // Default number, should be configurable
            status: 'available',
            x,
            y,
            typeId: selectedTicketType.id,
            seatType: 'regular'
          };
          onSeatAdd(newSeat);
        }
        break;
        
      case DrawTool.Section:
        // Start or finish drawing a section
        if (!sectionStart) {
          setSectionStart({ x, y });
        } else {
          // Complete the section
          const width = Math.abs(x - sectionStart.x);
          const height = Math.abs(y - sectionStart.y);
          const sectionX = Math.min(x, sectionStart.x);
          const sectionY = Math.min(y, sectionStart.y);
          
          const newSection: Section = {
            id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: `Section ${sections.length + 1}`,
            x: sectionX,
            y: sectionY,
            width,
            height,
            color: getRandomLightColor(),
            rows: 5,
            seatsPerRow: 10,
            rowSpacing: 30,
            seatSpacing: 30,
            seatStartNumber: 1,
            rowStartLabel: 'A'
          };
          
          onSectionAdd(newSection);
          setSectionStart(null);
        }
        break;
        
      case DrawTool.ArcSection:
        // Multi-step arc section creation
        handleArcSectionCreation(position);
        break;
    }
  };
  
  // Handle edit mode clicks
  const handleEditModeClick = (position: Position) => {
    const { x, y } = position;
    
    // In edit mode, we first select an item then can drag it
    const clickedSeat = findSeatAtPosition(x, y);
    if (clickedSeat) {
      onSeatClick(clickedSeat);
      return;
    }
    
    const clickedSection = findSectionAtPosition(x, y);
    if (clickedSection) {
      onSectionClick(clickedSection);
      return;
    }
    
    onCanvasClick();
  };
  
  // Handle delete mode clicks
  const handleDeleteModeClick = (position: Position) => {
    // This would trigger deletion of items at the clicked position
    // Implementation would depend on how deletion is handled in the parent component
  };
  
  // Handle arc section creation (multi-step process)
  const handleArcSectionCreation = (position: Position) => {
    const { x, y } = position;
    
    if (!arcCreationStage) {
      // Start by setting the center point
      setArcCreationStage('center');
      setArcCreationData({ centerX: x, centerY: y });
      return;
    }
    
    // Update arc creation data based on the current stage
    switch (arcCreationStage) {
      case 'center':
        // Center was set, now set inner radius
        const centerX = arcCreationData.centerX || 0;
        const centerY = arcCreationData.centerY || 0;
        const innerRadius = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        setArcCreationData({ ...arcCreationData, innerRadius });
        setArcCreationStage('outer');
        break;
        
      case 'outer':
        // Inner radius was set, now set outer radius
        const outerRadius = Math.sqrt(
          Math.pow(x - (arcCreationData.centerX || 0), 2) + 
          Math.pow(y - (arcCreationData.centerY || 0), 2)
        );
        setArcCreationData({ ...arcCreationData, outerRadius });
        setArcCreationStage('start');
        break;
        
      case 'start':
        // Outer radius was set, now set start angle
        const startAngle = calculateAngle(
          arcCreationData.centerX || 0, 
          arcCreationData.centerY || 0, 
          x, y
        );
        setArcCreationData({ ...arcCreationData, startAngle });
        setArcCreationStage('end');
        break;
        
      case 'end':
        // Start angle was set, now set end angle and create the section
        const endAngle = calculateAngle(
          arcCreationData.centerX || 0, 
          arcCreationData.centerY || 0, 
          x, y
        );
        
        const {
          centerX: cx = 0,
          centerY: cy = 0,
          innerRadius: ir = 0,
          outerRadius: or = 0,
          startAngle: sa = 0
        } = arcCreationData;
        
        // Create the arc section
        const newSection: Section = {
          id: `arc-section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: `Arc Section ${sections.length + 1}`,
          x: cx - or, // Bounding box x
          y: cy - or, // Bounding box y
          width: or * 2, // Bounding box width
          height: or * 2, // Bounding box height
          color: getRandomLightColor(),
          isArc: true,
          arcData: {
            centerX: cx,
            centerY: cy,
            innerRadius: ir,
            outerRadius: or,
            startAngle: sa,
            endAngle,
            totalSeats: 60, // Default, should be configurable
            rows: 5 // Default, should be configurable
          },
          rows: 5,
          seatsPerRow: 12,
          rowStartLabel: 'A',
          seatStartNumber: 1
        };
        
        onSectionAdd(newSection);
        
        // Reset arc creation state
        setArcCreationStage(null);
        setArcCreationData({});
        break;
    }
  };
  
  // Draw arc creation preview
  const drawArcCreationPreview = (ctx: CanvasRenderingContext2D) => {
    if (!arcCreationStage) return;
    
    const {
      centerX = 0,
      centerY = 0,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle
    } = arcCreationData;
    
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Draw center point
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw inner radius if set
    if (typeof innerRadius === 'number') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw line from center to current mouse position if setting outer radius
      if (arcCreationStage === 'outer') {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
        ctx.stroke();
      }
    }
    
    // Draw outer radius if set
    if (typeof outerRadius === 'number') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw start angle if set
    if (typeof startAngle === 'number' && typeof outerRadius === 'number') {
      const startX = centerX + Math.cos(startAngle * Math.PI / 180) * outerRadius;
      const startY = centerY + Math.sin(startAngle * Math.PI / 180) * outerRadius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(startX, startY);
      ctx.stroke();
    }
    
    // Draw arc section if all needed values are set
    if (
      typeof innerRadius === 'number' && 
      typeof outerRadius === 'number' && 
      typeof startAngle === 'number' && 
      typeof endAngle === 'number'
    ) {
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startRad, endRad);
      
      const endOuterX = centerX + Math.cos(endRad) * outerRadius;
      const endOuterY = centerY + Math.sin(endRad) * outerRadius;
      const endInnerX = centerX + Math.cos(endRad) * innerRadius;
      const endInnerY = centerY + Math.sin(endRad) * innerRadius;
      
      ctx.lineTo(endInnerX, endInnerY);
      ctx.arc(centerX, centerY, innerRadius, endRad, startRad, true);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
    }
    
    ctx.restore();
  };
  
  // Draw section creation preview
  const drawSectionCreationPreview = (ctx: CanvasRenderingContext2D) => {
    if (!sectionStart) return;
    
    const width = Math.abs(currentMousePos.x - sectionStart.x);
    const height = Math.abs(currentMousePos.y - sectionStart.y);
    const x = Math.min(currentMousePos.x, sectionStart.x);
    const y = Math.min(currentMousePos.y, sectionStart.y);
    
    ctx.save();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  };
  
  // Draw seat placement preview
  const drawSeatPlacementPreview = (ctx: CanvasRenderingContext2D) => {
    if (!selectedTicketType) return;
    
    const previewSeat: Seat = {
      id: 'preview',
      row: 'A',
      number: '1',
      status: 'available',
      x: currentMousePos.x,
      y: currentMousePos.y,
      typeId: selectedTicketType.id,
      seatType: 'regular'
    };
    
    drawSeat(ctx, previewSeat, layout.seatSize, false, [selectedTicketType], false);
  };
  
  // Find seat at position
  const findSeatAtPosition = (x: number, y: number): Seat | undefined => {
    return seats.find(seat => {
      const distance = Math.sqrt(
        Math.pow(x - seat.x, 2) + Math.pow(y - seat.y, 2)
      );
      return distance <= layout.seatSize / 1.5;
    });
  };

  // Find section at position
  const findSectionAtPosition = (x: number, y: number): Section | undefined => {
    return sections.find(section => {
      if (section.isArc && section.arcData) {
        // For arc sections, check if the point is within the arc
        const { centerX, centerY, innerRadius, outerRadius, startAngle, endAngle } = section.arcData;
        
        // Calculate distance from center
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        
        // Check if distance is between inner and outer radius
        if (distance < innerRadius || distance > outerRadius) return false;
        
        // Calculate angle of the point
        const angle = calculateAngle(centerX, centerY, x, y);
        
        // Check if angle is between start and end angles
        return angle >= startAngle && angle <= endAngle;
      } else {
        // For regular sections, check if the point is within the rectangle
      return (
          x >= section.x && 
          x <= section.x + section.width && 
          y >= section.y && 
          y <= section.y + section.height
        );
      }
    });
  };

  // Mouse down handler (for drag operations)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editorMode !== EditorMode.Edit) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if we're clicking on a draggable element
    const clickedSeat = findSeatAtPosition(x, y);
    if (clickedSeat) {
      setIsDragging(true);
      setDraggedItem({ type: 'seat', id: clickedSeat.id });
      setDragStartPos({ x, y });
      return;
    }
    
    const clickedSection = findSectionAtPosition(x, y);
    if (clickedSection) {
      setIsDragging(true);
      setDraggedItem({ type: 'section', id: clickedSection.id });
      setDragStartPos({ x, y });
      return;
    }
  };
  
  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update current mouse position for previews
    setCurrentMousePos({ x, y });
    
    // Handle dragging
    if (isDragging && draggedItem) {
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      if (draggedItem.type === 'seat') {
        // Find the seat
        const seat = seats.find(s => s.id === draggedItem.id);
        if (seat) {
          // Update seat position
          const updatedSeat = {
            ...seat,
            x: seat.x + deltaX,
            y: seat.y + deltaY
          };
          
          // If snap to grid is enabled, snap to the nearest grid point
          if (layout.snapToGrid) {
            const { x: snappedX, y: snappedY } = snapToGrid(updatedSeat, layout.gridSize || 20);
            updatedSeat.x = snappedX;
            updatedSeat.y = snappedY;
          }
          
          onSeatUpdate(updatedSeat);
          
          // Reset drag start position
          setDragStartPos({ x, y });
        }
      } else if (draggedItem.type === 'section') {
        // Find the section
        const section = sections.find(s => s.id === draggedItem.id);
        if (section) {
          const updatedSection = { ...section };
          
          if (section.isArc && section.arcData) {
            // Update arc section
            updatedSection.arcData = {
              ...section.arcData,
              centerX: section.arcData.centerX + deltaX,
              centerY: section.arcData.centerY + deltaY
            };
            
            // Update bounding box
            updatedSection.x = updatedSection.arcData.centerX - updatedSection.arcData.outerRadius;
            updatedSection.y = updatedSection.arcData.centerY - updatedSection.arcData.outerRadius;
          } else {
            // Update regular section
            updatedSection.x = section.x + deltaX;
            updatedSection.y = section.y + deltaY;
            
            // If snap to grid is enabled, snap to the nearest grid point
            if (layout.snapToGrid) {
              const { x: snappedX, y: snappedY } = snapToGrid(updatedSection, layout.gridSize || 20);
              updatedSection.x = snappedX;
              updatedSection.y = snappedY;
            }
          }
          
          onSectionUpdate(updatedSection);
          
          // Reset drag start position
          setDragStartPos({ x, y });
        }
      }
    }
  };
  
  // Mouse up handler
  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };
  
  // Helper: Calculate angle in degrees from center to point
  const calculateAngle = (centerX: number, centerY: number, x: number, y: number): number => {
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    
    // Calculate angle in radians
    let angle = Math.atan2(deltaY, deltaX);
    
    // Convert to degrees
    angle = angle * (180 / Math.PI);
    
    // Normalize to 0-360 range
    if (angle < 0) angle += 360;
    
    return angle;
  };
  
  // Helper: Snap position to grid
  const snapToGrid = (position: { x: number; y: number }, gridSize: number): Position => {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  };
  
  // Helper: Generate random light color
  const getRandomLightColor = (): string => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 75%)`;
  };
  
  // Determine cursor based on current mode and tool
  const getCursorStyle = (): string => {
    if (isDragging) return 'grabbing';
    
    switch (editorMode) {
      case EditorMode.View:
        return 'default';
      case EditorMode.Draw:
        return 'crosshair';
      case EditorMode.Edit:
        return (draggedItem ? 'grab' : 'move');
      case EditorMode.Delete:
        return 'not-allowed';
      default:
        return 'default';
    }
  };

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="touch-none"
      style={{ 
        width: '100%', 
        height: 'auto', 
          cursor: getCursorStyle()
        }}
      />
      
      {arcCreationStage && (
        <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-md">
          <p className="font-medium">Arc Section Creation</p>
          {arcCreationStage === 'center' && <p>Click to set the center point</p>}
          {arcCreationStage === 'inner' && <p>Click to set the inner radius</p>}
          {arcCreationStage === 'outer' && <p>Click to set the outer radius</p>}
          {arcCreationStage === 'start' && <p>Click to set the starting angle</p>}
          {arcCreationStage === 'end' && <p>Click to set the ending angle</p>}
        </div>
      )}
      
      {sectionStart && (
        <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-md">
          <p>Click again to complete the section</p>
        </div>
      )}
    </div>
  );
};

export default VenueLayoutCanvas; 