import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type SeatStatus = 'available' | 'reserved' | 'booked' | 'selected' | 'unavailable';
export type SeatType = 'regular' | 'accessible' | 'vip' | 'premium' | 'standing';
export type EditorMode = 'view' | 'draw' | 'edit' | 'delete';
export type DrawTool = 'seat' | 'section' | 'arc-section' | null;

export interface Seat {
  id: string;
  label?: string;
  row?: string;
  number?: string;
  x: number;
  y: number;
  status: SeatStatus;
  type?: SeatType;
  ticketTypeId?: string;
  sectionId?: string;
  rotation?: number;
  price?: number;
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
  isArc: boolean;
  arcData?: {
    centerX: number;
    centerY: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
  };
  rows?: number;
  seatsPerRow?: number;
  seatSpacing?: number;
  rowSpacing?: number;
  seatStartNumber?: number;
  rowStartLabel?: string;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  color?: string;
  description?: string;
}

export interface VenueLayout {
  name: string;
  rows?: number;
  columns?: number;
  seatSize: number;
  venueType?: 'seated' | 'standing' | 'mixed';
  rowSpacing?: number;
  columnSpacing?: number;
  venueWidth?: number;
  venueHeight?: number;
  gridSize: number;
  snapToGrid?: boolean;
  hasStage?: boolean;
  stagePosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface SeatMapState {
  // Data
  seats: Seat[];
  sections: Section[];
  layout: VenueLayout;
  ticketTypes: TicketType[];
  selectedTicketType?: string;
  
  // UI state
  selectedSeats: string[];
  selectedSectionId: string | null;
  editorMode: EditorMode;
  activeTool: DrawTool;
  isDragging: boolean;
  
  // CRUD operations - seats
  setSeats: (seats: Seat[]) => void;
  addSeat: (seat: Partial<Seat>) => void;
  updateSeat: (updatedSeat: Partial<Seat> & { id: string }) => void;
  deleteSeat: (id: string) => void;
  
  // CRUD operations - sections
  setSections: (sections: Section[]) => void;
  addSection: (section: Partial<Section>) => void;
  updateSection: (updatedSection: Partial<Section> & { id: string }) => void;
  deleteSection: (id: string) => void;
  
  // Layout management
  setLayout: (layoutUpdates: Partial<VenueLayout>) => void;
  
  // Ticket types
  setTicketTypes: (ticketTypes: TicketType[]) => void;
  setSelectedTicketType: (typeId: string | undefined) => void;
  
  // Selection management
  selectSeat: (id: string) => void;
  unselectSeat: (id: string) => void;
  toggleSeatSelection: (id: string) => void;
  clearSeatSelection: () => void;
  selectSection: (id: string) => void;
  clearSectionSelection: () => void;
  clearSelection: () => void;
  
  // Editor management
  setEditorMode: (mode: EditorMode) => void;
  setActiveTool: (tool: DrawTool) => void;
  
  // Dragging state
  setIsDragging: (isDragging: boolean) => void;
  
  // Utility functions
  generateSeatsForSection: (sectionId: string, ticketTypeId: string) => void;
  assignTicketTypeToSelectedSeats: (ticketTypeId: string) => void;
  deleteSelectedItems: () => void;
  initializeFromData: (data: any) => void;
  resetSeatMap: () => void;
}

// Default values
const DEFAULT_LAYOUT: VenueLayout = {
  name: 'New Venue Layout',
  seatSize: 25,
  gridSize: 20,
  snapToGrid: true,
  hasStage: true,
  stagePosition: 'top',
  venueType: 'seated',
};

export const useSeatMapStore = create<SeatMapState>()(
  devtools(
    (set, get) => ({
      // Initial state
      seats: [],
      sections: [],
      layout: DEFAULT_LAYOUT,
      ticketTypes: [],
      selectedSeats: [],
      selectedSectionId: null,
      editorMode: 'view',
      activeTool: null,
      isDragging: false,
      selectedTicketType: undefined,

      // CRUD operations for seats
      setSeats: (seats) => {
        set({ seats });
      },
      
      addSeat: (seatData) => {
        const seat: Seat = {
          id: seatData.id || uuidv4(),
          row: seatData.row,
          number: seatData.number,
          x: seatData.x || 0,
          y: seatData.y || 0,
          status: seatData.status || 'available',
          type: seatData.type || 'regular',
          ticketTypeId: seatData.ticketTypeId,
          sectionId: seatData.sectionId,
          rotation: seatData.rotation || 0,
          price: seatData.price,
          label: seatData.label || `${seatData.row || ''}${seatData.number || ''}`
        };
        
        set((state) => ({
          seats: [...state.seats, seat]
        }));
        
        return seat;
      },
      
      updateSeat: (updatedSeat) => {
        set((state) => ({
          seats: state.seats.map((seat) => 
            seat.id === updatedSeat.id 
              ? { ...seat, ...updatedSeat }
              : seat
          )
        }));
      },
      
      deleteSeat: (id) => {
        set((state) => ({
          seats: state.seats.filter((seat) => seat.id !== id),
          selectedSeats: state.selectedSeats.filter((seatId) => seatId !== id)
        }));
      },
      
      // CRUD operations for sections
      setSections: (sections) => {
        set({ sections });
      },
      
      addSection: (sectionData) => {
        const section: Section = {
          id: sectionData.id || uuidv4(),
          name: sectionData.name || `Section ${get().sections.length + 1}`,
          x: sectionData.x || 100,
          y: sectionData.y || 100,
          width: sectionData.width || 200,
          height: sectionData.height || 100,
          color: sectionData.color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
          rotation: sectionData.rotation || 0,
          isArc: sectionData.isArc || false,
          arcData: sectionData.arcData,
          rows: sectionData.rows || 5,
          seatsPerRow: sectionData.seatsPerRow || 10,
          seatSpacing: sectionData.seatSpacing || 30,
          rowSpacing: sectionData.rowSpacing || 35,
          seatStartNumber: sectionData.seatStartNumber || 1,
          rowStartLabel: sectionData.rowStartLabel || 'A'
        };
        
        set((state) => ({
          sections: [...state.sections, section],
          selectedSectionId: section.id
        }));
        
        return section;
      },
      
      updateSection: (updatedSection) => {
        set((state) => ({
          sections: state.sections.map((section) => 
            section.id === updatedSection.id 
              ? { ...section, ...updatedSection }
              : section
          )
        }));
      },
      
      deleteSection: (id) => {
        set((state) => ({
          sections: state.sections.filter((section) => section.id !== id),
          selectedSectionId: state.selectedSectionId === id ? null : state.selectedSectionId,
          // Also remove associated seats
          seats: state.seats.filter((seat) => seat.sectionId !== id)
        }));
      },
      
      // Setting layout
      setLayout: (layoutUpdates) => {
        set((state) => ({
          layout: { ...state.layout, ...layoutUpdates }
        }));
      },
      
      // Setting ticket types
      setTicketTypes: (ticketTypes) => {
        set({ ticketTypes });
      },
      
      // Selection management
      selectSeat: (id) => {
        const { editorMode } = get();
        if (editorMode === 'delete') {
          get().deleteSeat(id);
          return;
        }
        
        set((state) => ({
          selectedSeats: [...state.selectedSeats, id],
          // Clear section selection when selecting a seat
          selectedSectionId: null
        }));
      },
      
      unselectSeat: (id) => {
        set((state) => ({
          selectedSeats: state.selectedSeats.filter((seatId) => seatId !== id)
        }));
      },
      
      toggleSeatSelection: (id) => {
        const { editorMode } = get();
        if (editorMode === 'delete') {
          get().deleteSeat(id);
          return;
        }
        
        set((state) => {
          const isSelected = state.selectedSeats.includes(id);
          return {
            selectedSeats: isSelected
              ? state.selectedSeats.filter((seatId) => seatId !== id)
              : [...state.selectedSeats, id],
            // Clear section selection when toggling a seat
            selectedSectionId: null
          };
        });
      },
      
      clearSeatSelection: () => {
        set({ selectedSeats: [] });
      },
      
      selectSection: (id) => {
        const { editorMode } = get();
        if (editorMode === 'delete') {
          get().deleteSection(id);
          return;
        }
        
        set((state) => ({
          selectedSectionId: id,
          // Clear seat selection when selecting a section
          selectedSeats: []
        }));
      },
      
      clearSectionSelection: () => {
        set({ selectedSectionId: null });
      },
      
      clearSelection: () => {
        set({ 
          selectedSeats: [],
          selectedSectionId: null
        });
      },
      
      // Editor mode and tools
      setEditorMode: (mode) => {
        set({ 
          editorMode: mode,
          // Reset active tool when changing mode
          activeTool: mode === 'draw' ? 'seat' : null
        });
      },
      
      setActiveTool: (tool) => {
        set({ activeTool: tool });
      },
      
      // Dragging state
      setIsDragging: (isDragging) => {
        set({ isDragging });
      },
      
      // Utility functions
      generateSeatsForSection: (sectionId, ticketTypeId) => {
        const section = get().sections.find((s) => s.id === sectionId);
        if (!section) return;
        
        // Remove existing seats in this section
        const seatsToKeep = get().seats.filter((seat) => seat.sectionId !== sectionId);
        
        const newSeats: Seat[] = [];
        const currentTypeId = ticketTypeId || get().ticketTypes[0]?.id;
        
        // Generate appropriate row labels (A, B, C... or 1, 2, 3...)
        const generateRowLabel = (rowIndex: number, startLabel = 'A') => {
          if (/^[A-Za-z]$/.test(startLabel)) { // If alphabetical
            // Convert from ASCII code
            const startCode = startLabel.toUpperCase().charCodeAt(0);
            return String.fromCharCode(startCode + rowIndex);
          } else { // If numerical
            return String(Number(startLabel) + rowIndex);
          }
        };
        
        // Helper function to calculate position on an arc
        const calculateArcPosition = (
          centerX: number, 
          centerY: number, 
          radius: number, 
          angleDegrees: number
        ) => {
          const angleRad = (angleDegrees * Math.PI) / 180;
          return {
            x: centerX + radius * Math.cos(angleRad),
            y: centerY + radius * Math.sin(angleRad)
          };
        };
        
        if (section.isArc && section.arcData) {
          // Generate seats for arc section
          const arcData = section.arcData;
          const rowCount = section.rows || 5;
          const seatsPerRow = section.seatsPerRow || 10;
          const startAngle = arcData.startAngle;
          const endAngle = arcData.endAngle;
          const innerRadius = arcData.innerRadius;
          const outerRadius = arcData.outerRadius;
          
          // Calculate radius step between rows
          const radiusStep = (outerRadius - innerRadius) / (rowCount - 1 || 1);
          
          for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
            const rowLabel = generateRowLabel(rowIdx, section.rowStartLabel || 'A');
            const radius = innerRadius + rowIdx * radiusStep;
            
            // Calculate angle between seats
            const angleStep = (endAngle - startAngle) / (seatsPerRow - 1 || 1);
            
            for (let seatIdx = 0; seatIdx < seatsPerRow; seatIdx++) {
              const seatNumber = (section.seatStartNumber || 1) + seatIdx;
              const angle = startAngle + seatIdx * angleStep;
              const position = calculateArcPosition(
                arcData.centerX,
                arcData.centerY,
                radius,
                angle
              );
              
              const seatLabel = `${rowLabel}${seatNumber}`;
              
              newSeats.push({
                id: uuidv4(),
                row: rowLabel,
                number: seatNumber.toString(),
                label: seatLabel,
                x: position.x,
                y: position.y,
                status: 'available',
                type: 'regular',
                ticketTypeId: currentTypeId,
                sectionId: section.id,
                rotation: angle + 90, // Seat faces away from center
              });
            }
          }
        } else {
          // Generate seats for rectangular section
          const rowCount = section.rows || 5;
          const seatsPerRow = section.seatsPerRow || 10;
          const seatSpacing = section.seatSpacing || 30;
          const rowSpacing = section.rowSpacing || 35;
          
          // Calculate the starting position
          const startX = section.width / 2 - (seatsPerRow * seatSpacing) / 2 + seatSpacing / 2;
          const startY = section.height / 2 - (rowCount * rowSpacing) / 2 + rowSpacing / 2;
          
          for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
            const rowLabel = generateRowLabel(rowIdx, section.rowStartLabel || 'A');
            
            for (let seatIdx = 0; seatIdx < seatsPerRow; seatIdx++) {
              const seatNumber = (section.seatStartNumber || 1) + seatIdx;
              const seatLabel = `${rowLabel}${seatNumber}`;
              
              // Get seat position relative to section
              const relativeX = startX + seatIdx * seatSpacing;
              const relativeY = startY + rowIdx * rowSpacing;
              
              // Transform position to account for section rotation
              let x = relativeX;
              let y = relativeY;
              
              // Apply section rotation if needed
              if (section.rotation) {
                const rad = (section.rotation * Math.PI) / 180;
                const cosR = Math.cos(rad);
                const sinR = Math.sin(rad);
                
                // Translate position relative to section center
                const relToCenter = {
                  x: relativeX - section.width / 2,
                  y: relativeY - section.height / 2
                };
                
                // Rotate point
                const rotated = {
                  x: relToCenter.x * cosR - relToCenter.y * sinR,
                  y: relToCenter.x * sinR + relToCenter.y * cosR
                };
                
                // Translate back to section space
                x = rotated.x + section.width / 2;
                y = rotated.y + section.height / 2;
              }
              
              // Add section position to get absolute position
              x += section.x;
              y += section.y;
              
              newSeats.push({
                id: uuidv4(),
                row: rowLabel,
                number: seatNumber.toString(),
                label: seatLabel,
                x,
                y,
                status: 'available',
                type: 'regular',
                ticketTypeId: currentTypeId,
                sectionId: section.id,
                rotation: section.rotation || 0, // Inherit section rotation
              });
            }
          }
        }
        
        set({ seats: [...seatsToKeep, ...newSeats] });
      },
      
      assignTicketTypeToSelectedSeats: (ticketTypeId) => {
        set((state) => ({
          seats: state.seats.map((seat) => 
            state.selectedSeats.includes(seat.id)
              ? { ...seat, ticketTypeId: ticketTypeId }
              : seat
          )
        }));
      },
      
      deleteSelectedItems: () => {
        const { selectedSeats, selectedSectionId } = get();
        
        if (selectedSectionId) {
          get().deleteSection(selectedSectionId);
        }
        
        if (selectedSeats.length > 0) {
          set((state) => ({
            seats: state.seats.filter(seat => !selectedSeats.includes(seat.id)),
            selectedSeats: []
          }));
        }
      },
      
      initializeFromData: (data) => {
        try {
          // Initialize layout if available
          if (data && data.layout) {
            set({ layout: { ...DEFAULT_LAYOUT, ...data.layout } });
          }
          
          // Initialize sections if available
          if (data && data.sections && Array.isArray(data.sections)) {
            set({ sections: data.sections });
          }
          
          // Initialize seats if available
          if (data && data.seats && Array.isArray(data.seats)) {
            set({ seats: data.seats });
          }
          
          // Initialize ticket types if available
          if (data && data.ticketTypes && Array.isArray(data.ticketTypes)) {
            set({ ticketTypes: data.ticketTypes });
          }
        } catch (error) {
          console.error('Error initializing seat map data:', error);
        }
      },
      
      resetSeatMap: () => {
        set({
          seats: [],
          sections: [],
          layout: DEFAULT_LAYOUT,
          selectedSeats: [],
          selectedSectionId: null,
          editorMode: 'view',
          activeTool: null
        });
      },
      
      setSelectedTicketType: (typeId) => {
        set({ selectedTicketType: typeId });
      }
    }),
    {
      name: 'seat-map-storage'
    }
  )
);

export default useSeatMapStore; 