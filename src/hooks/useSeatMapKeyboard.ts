import { useEffect, useCallback } from 'react';
import { useSeatMapStore } from '@/store/seatMapStore';

interface SeatMapKeyboardOptions {
  disabledWhen?: () => boolean;
  enabledInInputs?: boolean;
}

export function useSeatMapKeyboard({
  disabledWhen = () => false,
  enabledInInputs = false
}: SeatMapKeyboardOptions = {}) {
  const { 
    editorMode, 
    setEditorMode,
    activeTool,
    setActiveTool,
    selectedSeats,
    selectedSectionId,
    seats,
    sections,
    deleteSeat,
    deleteSection,
    clearSelection,
    deleteSelectedItems
  } = useSeatMapStore();
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if disabled
    if (disabledWhen()) return;
    
    // Don't capture keyboard events when typing in input fields unless explicitly enabled
    if (!enabledInInputs && (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    )) {
      return;
    }
    
    // Check for modifier keys
    const isModifierActive = e.ctrlKey || e.metaKey;
    
    // Handle key presses
    switch (e.key) {
      // Mode switching
      case 'v':
        if (!isModifierActive) {
          e.preventDefault();
          setEditorMode('view');
        }
        break;
        
      case 'd':
        if (!isModifierActive) {
          e.preventDefault();
          setEditorMode('draw');
          setActiveTool('seat');
        }
        break;
        
      case 'e':
        if (!isModifierActive) {
          e.preventDefault();
          setEditorMode('edit');
        }
        break;
        
      // Drawing tools
      case '1':
        if (editorMode === 'draw' && !isModifierActive) {
          e.preventDefault();
          setActiveTool('seat');
        }
        break;
        
      case '2':
        if (editorMode === 'draw' && !isModifierActive) {
          e.preventDefault();
          setActiveTool('section');
        }
        break;
        
      case '3':
        if (editorMode === 'draw' && !isModifierActive) {
          e.preventDefault();
          setActiveTool('arc-section');
        }
        break;
        
      // Delete operations
      case 'Delete':
      case 'Backspace':
        if (!isModifierActive) {
          e.preventDefault();
          deleteSelectedItems();
        }
        break;
        
      // Navigation and selection
      case 'Escape':
        e.preventDefault();
        clearSelection();
        
        // Also clear active tool in draw mode
        if (editorMode === 'draw') {
          setActiveTool(null);
        }
        break;
        
      // Select all
      case 'a':
        if (isModifierActive && editorMode !== 'draw') {
          e.preventDefault();
          // Select all seats
          const allSeatIds = seats.map(seat => seat.id);
          useSeatMapStore.getState().selectedSeats = allSeatIds;
        }
        break;
        
      // Zoom controls
      case '=':
      case '+':
        if (isModifierActive) {
          e.preventDefault();
          // We can't directly call zoomIn here because it's part of useZoomAndPan
          // Instead, dispatch a custom event that the component can listen for
          window.dispatchEvent(new CustomEvent('seat-map:zoom-in'));
        }
        break;
        
      case '-':
        if (isModifierActive) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('seat-map:zoom-out'));
        }
        break;
        
      case '0':
        if (isModifierActive) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('seat-map:reset-zoom'));
        }
        break;
    }
  }, [
    disabledWhen,
    enabledInInputs,
    editorMode,
    setEditorMode,
    activeTool,
    setActiveTool,
    selectedSeats,
    selectedSectionId,
    seats,
    sections,
    deleteSeat,
    deleteSection,
    clearSelection,
    deleteSelectedItems
  ]);
  
  // Set up the event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // Set up event listeners for zoom controls
  useEffect(() => {
    const zoomInHandler = () => {
      useSeatMapStore.getState().setScale?.(useSeatMapStore.getState().scale * 1.1);
    };
    
    const zoomOutHandler = () => {
      useSeatMapStore.getState().setScale?.(useSeatMapStore.getState().scale * 0.9);
    };
    
    const resetZoomHandler = () => {
      useSeatMapStore.getState().setScale?.(1);
    };
    
    window.addEventListener('seat-map:zoom-in', zoomInHandler);
    window.addEventListener('seat-map:zoom-out', zoomOutHandler);
    window.addEventListener('seat-map:reset-zoom', resetZoomHandler);
    
    return () => {
      window.removeEventListener('seat-map:zoom-in', zoomInHandler);
      window.removeEventListener('seat-map:zoom-out', zoomOutHandler);
      window.removeEventListener('seat-map:reset-zoom', resetZoomHandler);
    };
  }, []);
  
  return {
    handleKeyDown
  };
} 