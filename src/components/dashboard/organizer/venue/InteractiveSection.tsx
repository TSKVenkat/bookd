import React, { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Section, useSeatMapStore } from '@/store/seatMapStore';

interface SectionProps {
  section: Section;
  isSelected: boolean;
  scale: number;
  showLabel?: boolean;
}

const InteractiveSection: React.FC<SectionProps> = ({
  section,
  isSelected,
  scale,
  showLabel = true
}) => {
  const { 
    selectSection, 
    updateSection,
    editorMode,
    isDragging,
    generateSeatsForSection,
    ticketTypes
  } = useSeatMapStore();
  
  const handleSectionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectSection(section.id);
  }, [section.id, selectSection]);
  
  const handleDragEnd = useCallback((info: any) => {
    // Only allow dragging in edit mode
    if (editorMode === 'edit') {
      const { x, y } = info.point;
      updateSection({ ...section, x, y });
    }
  }, [section, updateSection, editorMode]);
  
  // Create styles for the section
  const getSectionStyle = () => {
    const baseStyle = {
      x: section.x,
      y: section.y,
      width: section.width * scale,
      height: section.height * scale,
      rotate: section.rotation || 0,
      zIndex: isSelected ? 5 : 1,
    };
    
    if (section.isArc && section.arcData) {
      // For arc sections, create different styles
      return {
        ...baseStyle,
        borderRadius: '50%',
        background: `radial-gradient(circle at center, ${section.color}22 0%, ${section.color}44 70%, ${section.color}66 100%)`,
        boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
        rotate: 0, // Arc sections don't rotate the same way
      };
    }
    
    return {
      ...baseStyle,
      backgroundColor: `${section.color}22`, // Using hex alpha for transparency
      boxShadow: isSelected 
        ? `0 0 0 2px rgba(59, 130, 246, 0.5), inset 0 0 0 1px ${section.color}44`
        : `inset 0 0 0 1px ${section.color}44`,
    };
  };
  
  // Determine if we should render an arc or a rectangle
  const isArc = section.isArc && section.arcData;
  
  // Get cursor style based on editor mode
  const getCursorStyle = () => {
    if (editorMode === 'delete') return 'cursor-not-allowed';
    if (editorMode === 'edit') return 'cursor-move';
    return 'cursor-pointer';
  };
  
  // Calculate total seats in this section
  const totalSeats = (section.rows || 0) * (section.seatsPerRow || 0);
  
  // Get price range if we have ticketTypes
  const getPriceRange = () => {
    if (!ticketTypes || ticketTypes.length === 0) return null;
    
    // For demonstration, just return the price of first ticket type
    // In a real implementation, you might want to check the prices of tickets in this section
    const defaultType = ticketTypes[0];
    if (defaultType && defaultType.price) {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0 
      }).format(defaultType.price);
    }
    
    return null;
  };
  
  return (
    <motion.div
      className={`absolute ${getCursorStyle()} group`}
      style={getSectionStyle()}
      onClick={handleSectionClick}
      drag={editorMode === 'edit'}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        boxShadow: isSelected 
          ? `0 0 0 2px rgba(59, 130, 246, 0.5), inset 0 0 0 1px ${section.color}88` 
          : `inset 0 0 0 1px ${section.color}44`
      }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      role="region"
      aria-label={`Section ${section.name}`}
    >
      {/* Section label - enhanced with background color and better positioning */}
      {showLabel && (
        <div 
          className={`
            absolute top-0 left-0 bg-white bg-opacity-90 
            px-2 py-1 rounded-br text-xs font-semibold z-10
            border-l-4 shadow-sm transition-all duration-300
            ${scale < 0.7 ? 'opacity-50 scale-75' : 'opacity-100'}
            ${isSelected ? 'bg-blue-50' : ''}
          `}
          style={{
            borderLeftColor: section.color,
            transform: `scale(${Math.min(1, scale + 0.3)})`,
            transformOrigin: 'top left'
          }}
        >
          <div className="flex items-center gap-1">
            <span>{section.name}</span>
            {getPriceRange() && (
              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                {getPriceRange()}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* For arc sections, render an enhanced SVG overlay to better visualize the arc */}
      {isArc && section.arcData && (
        <svg
          className="absolute top-0 left-0 w-full h-full"
          viewBox={`0 0 ${section.width} ${section.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <mask id={`arcMask-${section.id}`}>
              <rect width="100%" height="100%" fill="white" />
              <path
                d={`
                  M ${section.arcData.centerX - section.x + section.arcData.outerRadius * Math.cos(section.arcData.startAngle * Math.PI / 180)},
                    ${section.arcData.centerY - section.y + section.arcData.outerRadius * Math.sin(section.arcData.startAngle * Math.PI / 180)}
                  A ${section.arcData.outerRadius},${section.arcData.outerRadius} 0 
                    ${section.arcData.endAngle - section.arcData.startAngle > 180 ? '1' : '0'} 1 
                    ${section.arcData.centerX - section.x + section.arcData.outerRadius * Math.cos(section.arcData.endAngle * Math.PI / 180)},
                    ${section.arcData.centerY - section.y + section.arcData.outerRadius * Math.sin(section.arcData.endAngle * Math.PI / 180)}
                  L ${section.arcData.centerX - section.x + section.arcData.innerRadius * Math.cos(section.arcData.endAngle * Math.PI / 180)},
                    ${section.arcData.centerY - section.y + section.arcData.innerRadius * Math.sin(section.arcData.endAngle * Math.PI / 180)}
                  A ${section.arcData.innerRadius},${section.arcData.innerRadius} 0 
                    ${section.arcData.endAngle - section.arcData.startAngle > 180 ? '1' : '0'} 0 
                    ${section.arcData.centerX - section.x + section.arcData.innerRadius * Math.cos(section.arcData.startAngle * Math.PI / 180)},
                    ${section.arcData.centerY - section.y + section.arcData.innerRadius * Math.sin(section.arcData.startAngle * Math.PI / 180)}
                  Z
                `}
                fill="black"
              />
            </mask>
          </defs>
          
          {/* Semi-transparent fill */}
          <rect
            width="100%"
            height="100%"
            fill={section.color}
            opacity={isSelected ? 0.4 : 0.25}
            mask={`url(#arcMask-${section.id})`}
          />
          
          {/* Grid lines for visualization */}
          {isSelected && (
            <g mask={`url(#arcMask-${section.id})`}>
              {/* Radial lines */}
              {Array.from({ length: section.seatsPerRow || 10 }).map((_, i) => {
                const angle = section.arcData.startAngle + 
                  (i * (section.arcData.endAngle - section.arcData.startAngle) / ((section.seatsPerRow || 10) - 1));
                return (
                  <line 
                    key={`radial-${i}`}
                    x1={section.arcData.centerX - section.x + section.arcData.innerRadius * Math.cos(angle * Math.PI / 180)}
                    y1={section.arcData.centerY - section.y + section.arcData.innerRadius * Math.sin(angle * Math.PI / 180)}
                    x2={section.arcData.centerX - section.x + section.arcData.outerRadius * Math.cos(angle * Math.PI / 180)}
                    y2={section.arcData.centerY - section.y + section.arcData.outerRadius * Math.sin(angle * Math.PI / 180)}
                    stroke={section.color}
                    strokeWidth="1"
                    opacity="0.3"
                  />
                );
              })}
              
              {/* Concentric arcs */}
              {Array.from({ length: section.rows || 5 }).map((_, i) => {
                const radius = section.arcData.innerRadius + 
                  (i * (section.arcData.outerRadius - section.arcData.innerRadius) / ((section.rows || 5) - 1));
                return (
                  <path
                    key={`arc-${i}`}
                    d={`
                      M ${section.arcData.centerX - section.x + radius * Math.cos(section.arcData.startAngle * Math.PI / 180)},
                        ${section.arcData.centerY - section.y + radius * Math.sin(section.arcData.startAngle * Math.PI / 180)}
                      A ${radius},${radius} 0 
                        ${section.arcData.endAngle - section.arcData.startAngle > 180 ? '1' : '0'} 1 
                        ${section.arcData.centerX - section.x + radius * Math.cos(section.arcData.endAngle * Math.PI / 180)},
                        ${section.arcData.centerY - section.y + radius * Math.sin(section.arcData.endAngle * Math.PI / 180)}
                    `}
                    stroke={section.color}
                    strokeWidth="1"
                    fill="none"
                    opacity="0.3"
                  />
                );
              })}
            </g>
          )}
          
          {/* Outer stroke for better visibility */}
          <path
            d={`
              M ${section.arcData.centerX - section.x + section.arcData.outerRadius * Math.cos(section.arcData.startAngle * Math.PI / 180)},
                ${section.arcData.centerY - section.y + section.arcData.outerRadius * Math.sin(section.arcData.startAngle * Math.PI / 180)}
              A ${section.arcData.outerRadius},${section.arcData.outerRadius} 0 
                ${section.arcData.endAngle - section.arcData.startAngle > 180 ? '1' : '0'} 1 
                ${section.arcData.centerX - section.x + section.arcData.outerRadius * Math.cos(section.arcData.endAngle * Math.PI / 180)},
                ${section.arcData.centerY - section.y + section.arcData.outerRadius * Math.sin(section.arcData.endAngle * Math.PI / 180)}
              L ${section.arcData.centerX - section.x + section.arcData.innerRadius * Math.cos(section.arcData.endAngle * Math.PI / 180)},
                ${section.arcData.centerY - section.y + section.arcData.innerRadius * Math.sin(section.arcData.endAngle * Math.PI / 180)}
              A ${section.arcData.innerRadius},${section.arcData.innerRadius} 0 
                ${section.arcData.endAngle - section.arcData.startAngle > 180 ? '1' : '0'} 0 
                ${section.arcData.centerX - section.x + section.arcData.innerRadius * Math.cos(section.arcData.startAngle * Math.PI / 180)},
                ${section.arcData.centerY - section.y + section.arcData.innerRadius * Math.sin(section.arcData.startAngle * Math.PI / 180)}
              Z
            `}
            stroke={section.color}
            strokeWidth={isSelected ? "2" : "1"}
            fill="none"
            opacity={isSelected ? "0.8" : "0.5"}
          />
        </svg>
      )}
      
      {/* Enhanced section details tooltip */}
      <div className={`
        absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 
        z-50 pointer-events-none bottom-0 right-0 mb-2 mr-2
        ${isSelected ? 'bg-blue-50 border-blue-100' : 'bg-white'}
        shadow-lg rounded p-2 text-xs border
      `}>
        <div className="font-bold">{section.name}</div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="text-gray-500">Rows:</div>
          <div className="font-medium">{section.rows || 0}</div>
          <div className="text-gray-500">Seats per row:</div>
          <div className="font-medium">{section.seatsPerRow || 0}</div>
          <div className="text-gray-500">Total seats:</div>
          <div className="font-medium">{totalSeats}</div>
        </div>
        
        {/* Quick actions shown only in editor mode */}
        {editorMode === 'edit' && isSelected && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (ticketTypes && ticketTypes.length > 0) {
                  generateSeatsForSection(section.id, ticketTypes[0].id);
                }
              }}
              className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded hover:bg-blue-200"
            >
              Generate Seats
            </button>
          </div>
        )}
      </div>
      
      {/* Grid visualization for regular sections */}
      {!isArc && isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Vertical grid lines */}
            {Array.from({ length: (section.seatsPerRow || 0) + 1 }).map((_, i) => (
              <line 
                key={`vertical-${i}`}
                x1={`${(i / (section.seatsPerRow || 1)) * 100}%`}
                y1="0"
                x2={`${(i / (section.seatsPerRow || 1)) * 100}%`}
                y2="100%"
                stroke={section.color}
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
            
            {/* Horizontal grid lines */}
            {Array.from({ length: (section.rows || 0) + 1 }).map((_, i) => (
              <line 
                key={`horizontal-${i}`}
                x1="0"
                y1={`${(i / (section.rows || 1)) * 100}%`}
                x2="100%"
                y2={`${(i / (section.rows || 1)) * 100}%`}
                stroke={section.color}
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
          </svg>
        </div>
      )}
    </motion.div>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(InteractiveSection); 