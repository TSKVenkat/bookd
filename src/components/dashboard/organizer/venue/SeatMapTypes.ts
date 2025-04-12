export interface TicketType {
  id: string;
  name: string;
  price: number;
  description?: string;
  color: string;
  capacity?: number;
  isPublic?: boolean;
}

export interface Seat {
  id: string;
  row: string;
  number: string;
  status: 'available' | 'unavailable' | 'reserved' | 'sold';
  typeId?: string;
  x: number;
  y: number;
  rotation?: number;
  seatType?: 'regular' | 'accessible' | 'premium';
  sectionId?: string; // Reference to parent section if part of a section
}

export interface Section {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
  isArc?: boolean; // Whether this section is curved
  arcData?: ArcSectionData; // Data for curved sections
  rows?: number; // Number of rows in this section
  seatsPerRow?: number; // Number of seats per row
  seatSpacing?: number; // Spacing between seats (horizontal)
  rowSpacing?: number; // Spacing between rows (vertical)
  seatStartNumber?: number; // Starting seat number
  rowStartLabel?: string; // Starting row label
}

export interface ArcSectionData {
  centerX: number; // Center point X of the arc
  centerY: number; // Center point Y of the arc
  innerRadius: number; // Inner radius of the arc
  outerRadius: number; // Outer radius of the arc
  startAngle: number; // Starting angle in degrees
  endAngle: number; // Ending angle in degrees
  totalSeats: number; // Total number of seats in the arc
  rows: number; // Number of rows in the arc
}

export interface StageConfig {
  name: string;
  shape: 'rectangle' | 'semicircle' | 'circle';
  width: number;
  height: number;
  x: number;
  y: number;
  rotation?: number;
}

export interface VenueLayout {
  name: string;
  venueType: 'seated' | 'standing' | 'mixed';
  
  // Basic setup
  rows: number;
  columns: number;
  seatSize: number;
  
  // Spacing
  rowSpacing?: number;
  columnSpacing?: number;
  
  // Arc seating
  arcEnabled?: boolean;
  arcRadius?: number;
  arcSpanDegrees?: number;
  arcStartDegree?: number;
  
  // Canvas dimensions
  venueWidth?: number;
  venueHeight?: number;
  
  // Row labels
  rowLabels?: string[];
  
  // Stage config
  stageConfig?: StageConfig;
  
  // Grid options
  showGrid?: boolean;
  gridSize?: number;
  
  // Snap settings
  snapToGrid?: boolean;
  
  // Display settings
  showRowLabels?: boolean;
  showSeatNumbers?: boolean;
  showSectionLabels?: boolean;
}

export interface SeatMapEditorProps {
  eventId: string;
  initialLayout?: any;
  ticketTypes: TicketType[];
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ToolGroup {
  id: string;
  name: string;
  tools: Tool[];
}

export interface Position {
  x: number;
  y: number;
}

export enum EditorMode {
  View = 'view',
  Draw = 'draw',
  Edit = 'edit',
  Delete = 'delete'
}

export enum DrawTool {
  Seat = 'seat',
  Section = 'section',
  ArcSection = 'arc-section',
  Rectangle = 'rectangle',
  Circle = 'circle',
  Text = 'text'
}

// Utility functions
export const calculateArcPosition = (
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number
): Position => {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians)
  };
};

export const generateSectionSeats = (section: Section, ticketTypeId: string): Seat[] => {
  const seats: Seat[] = [];
  
  if (section.isArc && section.arcData) {
    // Handle arc section
    const {
      centerX,
      centerY,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      rows
    } = section.arcData;
    
    const totalAngle = endAngle - startAngle;
    const seatsPerRow = section.seatsPerRow || 10;
    const angleStep = totalAngle / (seatsPerRow - 1);
    const radiusStep = (outerRadius - innerRadius) / (rows - 1);
    
    const rowChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rowStartIdx = rowChars.indexOf(section.rowStartLabel || 'A');
    
    for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
      const rowLabel = rowChars[rowStartIdx + rowIdx] || String.fromCharCode(65 + rowIdx);
      const rowRadius = innerRadius + (rowIdx * radiusStep);
      
      for (let seatIdx = 0; seatIdx < seatsPerRow; seatIdx++) {
        const seatNumber = (seatIdx + (section.seatStartNumber || 1)).toString();
        const angle = startAngle + (seatIdx * angleStep);
        const { x, y } = calculateArcPosition(centerX, centerY, rowRadius, angle);
        
        // Calculate seat rotation (perpendicular to the radius)
        const rotation = angle + 90;
        
        seats.push({
          id: `seat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          row: rowLabel,
          number: seatNumber,
          status: 'available',
          typeId: ticketTypeId,
          x,
          y,
          rotation,
          seatType: 'regular',
          sectionId: section.id
        });
      }
    }
  } else {
    // Handle rectangular section
    const { x, y, width, height } = section;
    const rows = section.rows || 1;
    const seatsPerRow = section.seatsPerRow || 1;
    
    const rowSpacing = section.rowSpacing || 30;
    const seatSpacing = section.seatSpacing || 30;
    
    const rowStartIdx = section.rowStartLabel ? 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(section.rowStartLabel) : 0;
    
    for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
      const rowLabel = String.fromCharCode(65 + rowStartIdx + rowIdx);
      
      for (let seatIdx = 0; seatIdx < seatsPerRow; seatIdx++) {
        const seatNumber = (seatIdx + (section.seatStartNumber || 1)).toString();
        
        // Calculate seat position within the section
        const seatX = x + (seatIdx * seatSpacing) + seatSpacing/2;
        const seatY = y + (rowIdx * rowSpacing) + rowSpacing/2;
        
        // Apply section rotation if specified
        let finalX = seatX;
        let finalY = seatY;
        let seatRotation = section.rotation || 0;
        
        if (section.rotation) {
          const sectionCenterX = x + width/2;
          const sectionCenterY = y + height/2;
          
          // Calculate position relative to center
          const relativeX = seatX - sectionCenterX;
          const relativeY = seatY - sectionCenterY;
          
          // Rotate point
          const rotationRad = section.rotation * (Math.PI / 180);
          finalX = sectionCenterX + (relativeX * Math.cos(rotationRad) - relativeY * Math.sin(rotationRad));
          finalY = sectionCenterY + (relativeX * Math.sin(rotationRad) + relativeY * Math.cos(rotationRad));
        }
        
        seats.push({
          id: `seat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          row: rowLabel,
          number: seatNumber,
          status: 'available',
          typeId: ticketTypeId,
          x: finalX,
          y: finalY,
          rotation: seatRotation,
          seatType: 'regular',
          sectionId: section.id
        });
      }
    }
  }
  
  return seats;
} 