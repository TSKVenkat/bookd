'use client';

import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Section, EditorMode } from '@/store/seatMapStore';

// Dynamic imports with SSR disabled
const Group = dynamic(() => import('react-konva').then(mod => mod.Group), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => mod.Rect), { ssr: false });
const Text = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });
const Path = dynamic(() => import('react-konva').then(mod => mod.Path), { ssr: false });

interface KonvaSectionProps {
  section: Section;
  isSelected: boolean;
  editorMode?: EditorMode;
  readOnly?: boolean;
  onSelect?: () => void;
}

const KonvaSection: React.FC<KonvaSectionProps> = ({
  section,
  isSelected,
  editorMode = 'view',
  readOnly = false,
  onSelect
}) => {
  // Handle section click
  const handleClick = useCallback(() => {
    if (readOnly && editorMode !== 'view') return;
    
    if (onSelect) {
      onSelect();
    } else {
      // Actions would be handled by the store via custom event
      const event = new CustomEvent('seat-map:section-click', {
        detail: { sectionId: section.id, mode: editorMode }
      });
      window.dispatchEvent(event);
    }
  }, [section.id, editorMode, readOnly, onSelect]);
  
  // Handle section drag end
  const handleDragEnd = useCallback((e: any) => {
    if (editorMode !== 'edit' || readOnly) return;
    
    const event = new CustomEvent('seat-map:section-move', {
      detail: { 
        sectionId: section.id,
        position: { x: e.target.x(), y: e.target.y() }
      }
    });
    window.dispatchEvent(event);
  }, [section.id, editorMode, readOnly]);
  
  // Generate path for arc section if needed
  const getArcPath = () => {
    if (!section.isArc || !section.arcData) return null;
    
    const { centerX, centerY, innerRadius, outerRadius, startAngle, endAngle } = section.arcData;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = Math.abs(endRad - startRad) > Math.PI ? 1 : 0;
    
    // Calculate points for the path
    const outerStartX = centerX + outerRadius * Math.cos(startRad);
    const outerStartY = centerY + outerRadius * Math.sin(startRad);
    const outerEndX = centerX + outerRadius * Math.cos(endRad);
    const outerEndY = centerY + outerRadius * Math.sin(endRad);
    const innerStartX = centerX + innerRadius * Math.cos(startRad);
    const innerStartY = centerY + innerRadius * Math.sin(startRad);
    const innerEndX = centerX + innerRadius * Math.cos(endRad);
    const innerEndY = centerY + innerRadius * Math.sin(endRad);
    
    // Create SVG path for arc
    const path = `
      M ${outerStartX} ${outerStartY}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}
      Z
    `;
    
    return path;
  };
  
  return (
    <Group
      id={`section-${section.id}`}
      x={section.x}
      y={section.y}
      draggable={editorMode === 'edit' && !readOnly}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
    >
      {section.isArc && section.arcData ? (
        // Arc section
        <Path
          data={getArcPath()}
          fill={section.color || '#94a3b8'}
          opacity={0.3}
          stroke={isSelected ? '#3b82f6' : '#64748b'}
          strokeWidth={isSelected ? 2 : 1}
          perfectDrawEnabled={false}
          shadowEnabled={isSelected}
          shadowColor="#3b82f6"
          shadowBlur={10}
          shadowOpacity={0.3}
        />
      ) : (
        // Regular rectangular section
        <Rect
          width={section.width}
          height={section.height}
          fill={section.color || '#94a3b8'}
          opacity={0.3}
          stroke={isSelected ? '#3b82f6' : '#64748b'}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={5}
          rotation={section.rotation || 0}
          offsetX={section.width / 2}
          offsetY={section.height / 2}
          x={section.width / 2}
          y={section.height / 2}
          perfectDrawEnabled={false}
          shadowEnabled={isSelected}
          shadowColor="#3b82f6"
          shadowBlur={10}
          shadowOpacity={0.3}
        />
      )}
      
      {/* Section label */}
      <Text
        text={section.name || 'Section'}
        fontSize={16}
        fill="#1e293b"
        align="center"
        verticalAlign="middle"
        width={section.width}
        height={section.height}
        offsetX={section.width / 2}
        offsetY={section.height / 2}
        x={section.width / 2}
        y={section.height / 2}
        rotation={section.rotation || 0}
        perfectDrawEnabled={false}
        listening={false}
      />
      
      {/* Handles for resize/rotate if selected and in edit mode */}
      {isSelected && editorMode === 'edit' && !readOnly && (
        <>
          {/* Corner resize handles */}
          {[
            { x: 0, y: 0 },
            { x: section.width, y: 0 },
            { x: section.width, y: section.height },
            { x: 0, y: section.height }
          ].map((pos, index) => (
            <Rect
              key={`handle-${index}`}
              x={pos.x - 5}
              y={pos.y - 5}
              width={10}
              height={10}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={1}
              cornerRadius={2}
              draggable={true}
              onDragMove={(e) => {
                e.cancelBubble = true; // Prevent parent dragging
                // Logic for resizing would be triggered via custom event
                const event = new CustomEvent('seat-map:section-resize', {
                  detail: { 
                    sectionId: section.id,
                    handleIndex: index,
                    position: { x: e.target.x() + 5, y: e.target.y() + 5 }
                  }
                });
                window.dispatchEvent(event);
              }}
            />
          ))}
          
          {/* Rotation handle */}
          <Group x={section.width / 2} y={-20}>
            <Rect
              width={20}
              height={20}
              offsetX={10}
              offsetY={10}
              fill="#3b82f6"
              cornerRadius={10}
              draggable={true}
              onDragMove={(e) => {
                e.cancelBubble = true; // Prevent parent dragging
                
                // Calculate rotation based on center of section and handle position
                const cx = section.width / 2;
                const cy = section.height / 2;
                const dx = e.target.x() - cx;
                const dy = e.target.y() + 20 - cy;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                
                // Trigger rotation event
                const event = new CustomEvent('seat-map:section-rotate', {
                  detail: { 
                    sectionId: section.id,
                    angle
                  }
                });
                window.dispatchEvent(event);
              }}
            />
            <Text
              text="↻"
              fontSize={14}
              fill="#ffffff"
              align="center"
              verticalAlign="middle"
              width={20}
              height={20}
              offsetX={10}
              offsetY={10}
              listening={false}
            />
          </Group>
        </>
      )}
    </Group>
  );
};

export default KonvaSection; 