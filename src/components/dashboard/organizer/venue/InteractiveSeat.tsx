import React, { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Seat, useSeatMapStore } from '@/store/seatMapStore';

interface SeatProps {
  seat: Seat;
  isSelected: boolean;
  scale: number;
  seatSize?: number;
  showLabel?: boolean;
  showNumber?: boolean;
  isEditorMode?: boolean;
}

// Enhanced color selection function with better contrast
const getSeatColor = (seat: Seat, isSelected: boolean, ticketType?: { color: string }) => {
  // Status colors override everything else for clarity
  if (seat.status === 'booked') {
    return '#d1d5db'; // Gray for booked (more realistic)
  } else if (seat.status === 'unavailable') {
    return '#9ca3af'; // Dark gray for unavailable
  } else if (isSelected) {
    return '#10b981'; // Green for selected
  }
  
  // Use ticket type color if available
  if (ticketType && ticketType.color) {
    return ticketType.color;
  }
  
  // Base colors for different seat types with better visibility
  const typeColors = {
    regular: '#6366f1', // Indigo
    vip: '#8b5cf6',     // Violet
    accessible: '#0ea5e9', // Sky
    balcony: '#f59e0b'   // Amber
  };
  
  return typeColors[seat.type] || typeColors.regular;
};

const InteractiveSeat: React.FC<SeatProps> = ({
  seat,
  isSelected,
  scale,
  seatSize = 25,
  showLabel = true,
  showNumber = true,
  isEditorMode = false
}) => {
  const { 
    toggleSeatSelection, 
    updateSeat, 
    editorMode, 
    isDragging,
    ticketTypes
  } = useSeatMapStore();
  
  // Find the ticket type for this seat
  const ticketType = seat.typeId ? 
    ticketTypes.find(type => type.id === seat.typeId) : 
    undefined;
  
  const handleSeatClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (editorMode === 'delete') {
      // In delete mode, mark the seat as unavailable
      updateSeat({ ...seat, status: 'unavailable' });
      return;
    }
    
    if (editorMode === 'edit' && !isDragging) {
      // In edit mode, select the seat but don't toggle its selection
      toggleSeatSelection(seat.id);
      return;
    }
    
    // In view mode, toggle seat selection if it's available
    if (seat.status !== 'booked' && seat.status !== 'unavailable') {
      toggleSeatSelection(seat.id);
    }
  }, [seat, toggleSeatSelection, updateSeat, editorMode, isDragging]);
  
  const handleDragEnd = useCallback((info: any) => {
    // Only allow dragging in edit mode
    if (editorMode === 'edit') {
      const { x, y } = info.point;
      updateSeat({ ...seat, x, y });
    }
  }, [seat, updateSeat, editorMode]);
  
  // Determine cursor style based on seat status and editor mode
  const getCursorStyle = () => {
    if (editorMode === 'delete') return 'cursor-not-allowed';
    if (editorMode === 'edit') return 'cursor-move';
    return seat.status === 'booked' || seat.status === 'unavailable' 
      ? 'cursor-not-allowed' 
      : 'cursor-pointer';
  };
  
  // Calculate scaled dimensions
  const scaledSize = seatSize * scale;
  
  // ARIA attributes for accessibility
  const ariaAttributes = {
    role: 'button',
    'aria-label': `Seat ${seat.row}${seat.number}, ${seat.status} ${ticketType ? `(${ticketType.name})` : ''}`,
    'aria-pressed': isSelected,
    'aria-disabled': seat.status === 'booked' || seat.status === 'unavailable',
    tabIndex: seat.status === 'booked' || seat.status === 'unavailable' ? -1 : 0
  };
  
  // Generate price label if available
  const priceLabel = ticketType ? 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(ticketType.price) : 
    '';
  
  return (
    <motion.div
      className={`absolute select-none ${getCursorStyle()} group`}
      style={{
        x: seat.x,
        y: seat.y,
        width: scaledSize,
        height: scaledSize,
        rotate: seat.rotation || 0,
        transformOrigin: 'center center',
        zIndex: isSelected ? 20 : 10
      }}
      whileHover={{ 
        scale: editorMode === 'view' ? 1.1 : 1,
        zIndex: 30
      }}
      drag={editorMode === 'edit'}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onClick={handleSeatClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: seat.status === 'booked' ? 0.7 : 1, 
        scale: 1,
      }}
      transition={{ 
        duration: 0.2,
        backgroundColor: { duration: 0.3 }
      }}
      {...ariaAttributes}
    >
      {/* Enhanced seat appearance with shadow */}
      <div 
        className={`
          flex items-center justify-center w-full h-full rounded-md border-2
          ${isSelected ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'border-transparent'}
          ${seat.status === 'booked' ? 'line-through' : ''}
          transition-all duration-200 shadow-sm
        `}
        style={{
          backgroundColor: getSeatColor(seat, isSelected, ticketType)
        }}
      >
        {showNumber && scaledSize > 20 && (
          <span 
            className={`
              text-xs text-white font-bold drop-shadow-sm
              ${seat.status === 'booked' ? 'line-through opacity-50' : ''}
            `}
          >
            {showLabel ? `${seat.row}${seat.number}` : seat.number}
          </span>
        )}
      </div>
      
      {/* Status indicator overlay */}
      {seat.status === 'booked' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-full h-full opacity-70 text-gray-800" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </div>
      )}
      
      {/* Accessible seat icon if applicable */}
      {seat.type === 'accessible' && scaledSize > 18 && (
        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
          <div className="bg-white rounded-full p-0.5 shadow-sm">
            <svg 
              viewBox="0 0 24 24" 
              className="w-3 h-3 fill-current text-blue-500"
            >
              <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 11h-5v9h-2v-9H8v-2h2V9c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v2h2v2z" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Enhanced tooltip for seat info */}
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none bottom-full left-1/2 transform -translate-x-1/2 mb-2">
        <div className="bg-gray-900 text-white text-xs rounded p-2 shadow-lg min-w-max flex flex-col items-center">
          <div className="font-bold">{seat.row}{seat.number}</div>
          {ticketType && (
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="text-[10px] uppercase tracking-wide opacity-70">{ticketType.name}</div>
              <div className="font-medium">{priceLabel}</div>
            </div>
          )}
          <div className="mt-1 capitalize text-[10px] px-1.5 py-0.5 rounded-full bg-opacity-30"
               style={{ 
                 backgroundColor: seat.status === 'available' ? 'rgba(16, 185, 129, 0.3)' : 
                                  seat.status === 'booked' ? 'rgba(239, 68, 68, 0.3)' : 
                                  'rgba(209, 213, 219, 0.3)' 
               }}>
            {seat.status}
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1 left-1/2 transform -translate-x-1/2"></div>
        </div>
      </div>
    </motion.div>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(InteractiveSeat); 