'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface TicketType {
  id: string;
  name: string;
  price: number;
  color: string;
}

interface ArcSectionData {
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  totalSeats: number;
  rows: number;
}

interface Section {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
  rows: number;
  seatsPerRow: number;
  rowStartLabel: string;
  seatStartNumber: number;
  arcData?: ArcSectionData;
}

interface ArcSectionEditorProps {
  section: Section;
  ticketTypes: TicketType[];
  selectedTicketType: TicketType | null;
  onUpdate: (section: Section) => void;
  onGenerateSeats: (sectionId: string) => void;
}

// Function to calculate position on an arc based on center, radius and angle
const calculateArcPosition = (centerX: number, centerY: number, radius: number, angleDegrees: number) => {
  // Convert angle from degrees to radians
  const angleRadians = (angleDegrees * Math.PI) / 180;
  
  // Calculate x and y coordinates
  const x = centerX + radius * Math.cos(angleRadians);
  const y = centerY + radius * Math.sin(angleRadians);
  
  return { x, y };
};

const ArcSectionEditor: React.FC<ArcSectionEditorProps> = ({
  section,
  ticketTypes,
  selectedTicketType,
  onUpdate,
  onGenerateSeats
}) => {
  const [arcData, setArcData] = useState<ArcSectionData>(
    section.arcData || {
      centerX: 400,
      centerY: 400,
      innerRadius: 100,
      outerRadius: 200,
      startAngle: 210,
      endAngle: 330,
      totalSeats: 60,
      rows: 5
    }
  );
  
  // Update local state when section changes
  useEffect(() => {
    if (section.arcData) {
      setArcData(section.arcData);
    }
  }, [section]);
  
  // Handle changes to arc parameters
  const handleArcChange = (key: keyof ArcSectionData, value: number) => {
    const updatedArcData = { ...arcData, [key]: value };
    
    // Update local state
    setArcData(updatedArcData);
    
    // Update section
    onUpdate({
      ...section,
      arcData: updatedArcData,
      // Update bounding box
      x: updatedArcData.centerX - updatedArcData.outerRadius,
      y: updatedArcData.centerY - updatedArcData.outerRadius,
      width: updatedArcData.outerRadius * 2,
      height: updatedArcData.outerRadius * 2
    });
  };
  
  // Handle row and seat count changes
  const handleSectionChange = (key: string, value: number | string) => {
    // Update the section directly
    const updatedSection = { ...section };
    
    if (key === 'rows') {
      updatedSection.rows = typeof value === 'number' ? value : parseInt(value as string);
      
      // Also update arc data
      if (updatedSection.arcData) {
        updatedSection.arcData.rows = updatedSection.rows;
      }
    } else if (key === 'seatsPerRow') {
      updatedSection.seatsPerRow = typeof value === 'number' ? value : parseInt(value as string);
      
      // Also update arc data total seats as an approximation
      if (updatedSection.arcData && updatedSection.rows) {
        updatedSection.arcData.totalSeats = updatedSection.seatsPerRow * updatedSection.rows;
      }
    } else if (typeof value === 'string') {
      (updatedSection as any)[key] = value;
    } else {
      (updatedSection as any)[key] = value;
    }
    
    onUpdate(updatedSection);
  };
  
  // Handle color change
  const handleColorChange = (color: string) => {
    onUpdate({
      ...section,
      color
    });
  };
  
  // Calculate row and seat distribution
  const calculateSeats = () => {
    if (!arcData) return [];
    
    const { innerRadius, outerRadius, startAngle, endAngle, rows } = arcData;
    const radiusStep = (outerRadius - innerRadius) / (rows - 1 || 1);
    const seatsPerRow = section.seatsPerRow || 10;
    const seats = [];
    
    // Calculate seats for preview
    for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
      const radius = innerRadius + rowIdx * radiusStep;
      const rowSeats = [];
      
      // Angle between seats
      const angleStep = (endAngle - startAngle) / (seatsPerRow - 1 || 1);
      
      for (let seatIdx = 0; seatIdx < seatsPerRow; seatIdx++) {
        const angle = startAngle + seatIdx * angleStep;
        const position = calculateArcPosition(arcData.centerX, arcData.centerY, radius, angle);
        rowSeats.push(position);
      }
      
      seats.push(rowSeats);
    }
    
    return seats;
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Section Name"
          value={section.name}
          onChange={(e) => handleSectionChange('name', e.target.value)}
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Section Color</label>
          <ColorPicker
            color={section.color || '#94a3b8'}
            onChange={handleColorChange}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Inner Radius (px)"
          type="number"
          min={50}
          max={arcData.outerRadius - 20}
          value={arcData.innerRadius}
          onChange={(e) => handleArcChange('innerRadius', parseInt(e.target.value))}
        />
        
        <Input
          label="Outer Radius (px)"
          type="number"
          min={arcData.innerRadius + 20}
          max={500}
          value={arcData.outerRadius}
          onChange={(e) => handleArcChange('outerRadius', parseInt(e.target.value))}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Start Angle (°)"
          type="number"
          min={0}
          max={arcData.endAngle - 10}
          value={arcData.startAngle}
          onChange={(e) => handleArcChange('startAngle', parseInt(e.target.value))}
        />
        
        <Input
          label="End Angle (°)"
          type="number"
          min={arcData.startAngle + 10}
          max={360}
          value={arcData.endAngle}
          onChange={(e) => handleArcChange('endAngle', parseInt(e.target.value))}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Number of Rows"
          type="number"
          min={1}
          max={20}
          value={section.rows || 5}
          onChange={(e) => handleSectionChange('rows', parseInt(e.target.value))}
        />
        
        <Input
          label="Seats Per Row"
          type="number"
          min={1}
          max={50}
          value={section.seatsPerRow || 10}
          onChange={(e) => handleSectionChange('seatsPerRow', parseInt(e.target.value))}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Row Start Label"
          value={section.rowStartLabel || 'A'}
          onChange={(e) => handleSectionChange('rowStartLabel', e.target.value)}
        />
        
        <Input
          label="First Seat Number"
          type="number"
          min={1}
          value={section.seatStartNumber || 1}
          onChange={(e) => handleSectionChange('seatStartNumber', parseInt(e.target.value))}
        />
      </div>
      
      {/* Arc Visualization */}
      <div className="mt-4 border rounded-md p-3 bg-gray-50">
        <h4 className="text-sm font-medium mb-2">Arc Section Preview</h4>
        <div className="relative w-full h-60 bg-white border rounded overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
            {/* Center point */}
            <circle 
              cx={arcData.centerX} 
              cy={arcData.centerY} 
              r="4" 
              fill="#3b82f6" 
            />
            
            {/* Radius lines */}
            <line 
              x1={arcData.centerX} 
              y1={arcData.centerY} 
              x2={arcData.centerX + arcData.outerRadius * Math.cos(arcData.startAngle * Math.PI / 180)} 
              y2={arcData.centerY + arcData.outerRadius * Math.sin(arcData.startAngle * Math.PI / 180)} 
              stroke="#3b82f6" 
              strokeWidth="1" 
              strokeDasharray="4,4" 
            />
            <line 
              x1={arcData.centerX} 
              y1={arcData.centerY} 
              x2={arcData.centerX + arcData.outerRadius * Math.cos(arcData.endAngle * Math.PI / 180)} 
              y2={arcData.centerY + arcData.outerRadius * Math.sin(arcData.endAngle * Math.PI / 180)} 
              stroke="#3b82f6" 
              strokeWidth="1" 
              strokeDasharray="4,4" 
            />
            
            {/* Arc path */}
            <path
              d={`
                M ${arcData.centerX + arcData.outerRadius * Math.cos(arcData.startAngle * Math.PI / 180)},${arcData.centerY + arcData.outerRadius * Math.sin(arcData.startAngle * Math.PI / 180)}
                A ${arcData.outerRadius},${arcData.outerRadius} 0 ${Math.abs(arcData.endAngle - arcData.startAngle) > 180 ? 1 : 0},1 ${arcData.centerX + arcData.outerRadius * Math.cos(arcData.endAngle * Math.PI / 180)},${arcData.centerY + arcData.outerRadius * Math.sin(arcData.endAngle * Math.PI / 180)}
                L ${arcData.centerX + arcData.innerRadius * Math.cos(arcData.endAngle * Math.PI / 180)},${arcData.centerY + arcData.innerRadius * Math.sin(arcData.endAngle * Math.PI / 180)}
                A ${arcData.innerRadius},${arcData.innerRadius} 0 ${Math.abs(arcData.endAngle - arcData.startAngle) > 180 ? 1 : 0},0 ${arcData.centerX + arcData.innerRadius * Math.cos(arcData.startAngle * Math.PI / 180)},${arcData.centerY + arcData.innerRadius * Math.sin(arcData.startAngle * Math.PI / 180)}
                Z
              `}
              fill={section.color || '#94a3b8'}
              opacity="0.5"
              stroke="#64748b"
              strokeWidth="1"
            />
            
            {/* Seat preview */}
            {calculateSeats().map((row, rowIdx) => (
              <g key={`row-${rowIdx}`}>
                {row.map((seat, seatIdx) => (
                  <circle
                    key={`seat-${rowIdx}-${seatIdx}`}
                    cx={seat.x}
                    cy={seat.y}
                    r="3"
                    fill="#3b82f6"
                    opacity="0.7"
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>
      
      <Button
        onClick={() => onGenerateSeats(section.id)}
        disabled={!selectedTicketType}
        className="w-full"
      >
        Generate Seats for Section
      </Button>
    </div>
  );
};

export default ArcSectionEditor; 