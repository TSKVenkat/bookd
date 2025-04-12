'use client';

import React, { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Seat } from '@/store/seatMapStore';
import type { EditorMode } from '@/store/seatMapStore';

// Dynamic imports with SSR disabled
const Circle = dynamic(() => import('react-konva').then(mod => mod.Circle), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => mod.Group), { ssr: false });
const Text = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });

interface KonvaSeatProps {
  seat: Seat;
  isSelected: boolean;
  seatSize: number;
  ticketType?: { id: string; name: string; price: number; color?: string };
  editorMode?: EditorMode;
  readOnly?: boolean;
  onSelect?: () => void;
  onShowTooltip: (position: {x: number, y: number}) => void;
  onHideTooltip: () => void;
}

const KonvaSeat: React.FC<KonvaSeatProps> = ({
  seat,
  isSelected,
  seatSize,
  ticketType,
  editorMode = 'view',
  readOnly = false,
  onSelect,
  onShowTooltip,
  onHideTooltip
}) => {
  // Calculate seat appearance based on status
  const seatAppearance = useMemo(() => {
    let opacity = 0.7;
    let strokeWidth = isSelected ? 2 : 1;
    let strokeColor = isSelected ? '#ef4444' : '#64748b';
    
    switch (seat.status) {
      case 'available':
        opacity = 0.7;
        break;
      case 'selected':
        opacity = 1;
        break;
      case 'booked':
      case 'unavailable':
        opacity = 0.3;
        break;
      default:
        opacity = 0.7;
    }
    
    return {
      opacity,
      strokeWidth,
      strokeColor
    };
  }, [seat.status, isSelected]);
  
  // Event handlers
  const handleClick = useCallback(() => {
    // Handle interaction based on editor mode
    if (readOnly && editorMode !== 'view') return;
    
    if (onSelect) {
      onSelect();
    } else {
      // Actions would be handled by the store via custom event
      const event = new CustomEvent('seat-map:seat-click', {
        detail: { seatId: seat.id, mode: editorMode }
      });
      window.dispatchEvent(event);
    }
  }, [seat.id, editorMode, readOnly, onSelect]);
  
  const handleMouseOver = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const position = stage?.getPointerPosition();
    
    if (position) {
      onShowTooltip(position);
    }
  }, [onShowTooltip]);
  
  // Determine if we should show the seat label
  const showLabel = useMemo(() => {
    return seatSize >= 20; // Only show labels when seats are large enough
  }, [seatSize]);
  
  return (
    <Group
      id={`seat-${seat.id}`}
      x={seat.x}
      y={seat.y}
      rotation={seat.rotation || 0}
      onClick={handleClick}
      onTap={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={onHideTooltip}
      draggable={editorMode === 'edit' && !readOnly}
      onDragEnd={(e) => {
        // Update position when dragging ends
        const event = new CustomEvent('seat-map:seat-move', {
          detail: { 
            seatId: seat.id,
            position: { x: e.target.x(), y: e.target.y() }
          }
        });
        window.dispatchEvent(event);
      }}
    >
      {/* Main seat circle */}
      <Circle
        radius={seatSize / 2}
        fill={ticketType?.color || '#9ca3af'}
        opacity={seatAppearance.opacity}
        stroke={seatAppearance.strokeColor}
        strokeWidth={seatAppearance.strokeWidth}
        perfectDrawEnabled={false}
        listening={true}
        shadowEnabled={isSelected}
        shadowColor="#3b82f6"
        shadowBlur={5}
        shadowOpacity={0.5}
      />
      
      {/* Seat label (only shown when zoomed in enough) */}
      {showLabel && (
        <Text
          text={seat.label || `${seat.row || ''}${seat.number || ''}`}
          fontSize={seatSize / 3}
          fill="#ffffff"
          align="center"
          verticalAlign="middle"
          width={seatSize}
          height={seatSize}
          offsetX={seatSize / 2}
          offsetY={seatSize / 2}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      
      {/* Status indicator (shown for non-available seats) */}
      {seat.status !== 'available' && seat.status !== 'selected' && (
        <Circle
          radius={seatSize / 8}
          fill={seat.status === 'booked' ? '#ef4444' : '#9ca3af'}
          x={seatSize / 3}
          y={-seatSize / 3}
          perfectDrawEnabled={false}
          listening={false}
        />
      )}
    </Group>
  );
};

export default KonvaSeat; 