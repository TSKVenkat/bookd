import { useState, useCallback, RefObject, MouseEvent, TouchEvent, WheelEvent, useRef, useEffect } from 'react';

interface ZoomAndPanOptions {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  initialScale?: number;
  initialOffset?: { x: number; y: number };
  boundaryPadding?: number;
  wheelZoomEnabled?: boolean;
  pinchZoomEnabled?: boolean;
  zoomTowardsPointer?: boolean;
}

interface ZoomAndPanState {
  scale: number;
  offset: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
}

export function useZoomAndPan(
  containerRef: RefObject<HTMLDivElement>,
  options: ZoomAndPanOptions = {}
) {
  const {
    minScale = 0.1,
    maxScale = 3,
    scaleStep = 0.1,
    initialScale = 1,
    initialOffset = { x: 0, y: 0 },
    boundaryPadding = 0,
    wheelZoomEnabled = true,
    pinchZoomEnabled = true,
    zoomTowardsPointer = true
  } = options;

  // State for zoom and pan
  const [state, setState] = useState<ZoomAndPanState>({
    scale: initialScale,
    offset: initialOffset,
    isDragging: false,
    dragStart: null
  });

  // Refs for tracking touch events
  const touchesRef = useRef<React.Touch[]>([]);
  const lastDistanceRef = useRef<number | null>(null);
  const hasUserInteractedRef = useRef(false);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Get midpoint between two touch points
  const getMidpoint = useCallback((touch1: Touch, touch2: Touch): { x: number, y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Calculate container bounds
  const getContainerBounds = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
  }, [containerRef]);

  // Function to adjust offset to keep content within bounds when zooming out
  const adjustOffsetToBounds = useCallback((
    newOffset: { x: number, y: number },
    newScale: number
  ): { x: number, y: number } => {
    if (!containerRef.current) return newOffset;
    
    const bounds = getContainerBounds();
    if (!bounds) return newOffset;
    
    // Let content move freely when zoomed in
    if (newScale > 1) return newOffset;
    
    // Calculate allowed movement range
    const maxMoveX = (bounds.width * (1 - newScale)) / 2 + boundaryPadding;
    const maxMoveY = (bounds.height * (1 - newScale)) / 2 + boundaryPadding;
    
    return {
      x: Math.min(Math.max(newOffset.x, -maxMoveX), maxMoveX),
      y: Math.min(Math.max(newOffset.y, -maxMoveY), maxMoveY)
    };
  }, [boundaryPadding, getContainerBounds, containerRef]);

  // Zoom function with pointer-relative zooming support
  const zoom = useCallback((
    newScale: number, 
    pointerX?: number, 
    pointerY?: number
  ) => {
    setState(prev => {
      // Clamp scale to min/max
      newScale = Math.max(minScale, Math.min(maxScale, newScale));
      
      let newOffset = { ...prev.offset };
      
      // If pointer position is provided and zoomTowardsPointer is enabled,
      // adjust offset to zoom toward that position
      if (pointerX !== undefined && pointerY !== undefined && zoomTowardsPointer) {
        const bounds = getContainerBounds();
        if (bounds) {
          // Convert pointer position to container-relative
          const containerX = pointerX - bounds.left;
          const containerY = pointerY - bounds.top;
          
          // Calculate scale change ratio
          const scaleRatio = newScale / prev.scale;
          
          // Adjust offset to zoom toward pointer position
          newOffset = {
            x: containerX - (containerX - prev.offset.x) * scaleRatio,
            y: containerY - (containerY - prev.offset.y) * scaleRatio
          };
        }
      }
      
      // Adjust offset to keep content within bounds
      newOffset = adjustOffsetToBounds(newOffset, newScale);
      
      return {
        ...prev,
        scale: newScale,
        offset: newOffset
      };
    });
  }, [minScale, maxScale, zoomTowardsPointer, getContainerBounds, adjustOffsetToBounds]);

  // Zoom in function
  const zoomIn = useCallback(() => {
    zoom(state.scale + scaleStep);
  }, [state.scale, scaleStep, zoom]);

  // Zoom out function
  const zoomOut = useCallback(() => {
    zoom(state.scale - scaleStep);
  }, [state.scale, scaleStep, zoom]);

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setState({
      scale: initialScale,
      offset: initialOffset,
      isDragging: false,
      dragStart: null
    });
  }, [initialScale, initialOffset]);

  // Set scale to specific value
  const setScale = useCallback((scale: number) => {
    zoom(scale);
  }, [zoom]);

  // Zoom to fit content
  const zoomToFit = useCallback((
    contentWidth: number, 
    contentHeight: number, 
    padding = 20
  ) => {
    if (!containerRef.current) return;
    
    const bounds = getContainerBounds();
    if (!bounds) return;
    
    // Calculate scale to fit content
    const scaleX = (bounds.width - padding * 2) / contentWidth;
    const scaleY = (bounds.height - padding * 2) / contentHeight;
    const newScale = Math.min(scaleX, scaleY, maxScale);
    
    setState({
      scale: newScale,
      offset: { x: 0, y: 0 },
      isDragging: false,
      dragStart: null
    });
  }, [maxScale, getContainerBounds, containerRef]);

  // Handle mouse wheel zooming
  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (!wheelZoomEnabled) return;
      
      e.preventDefault();
      hasUserInteractedRef.current = true;
      
      // Calculate zoom delta (smaller steps for smoother zoom)
      const delta = -Math.sign(e.deltaY) * scaleStep * 0.7;
      const newScale = state.scale + delta;
      
      // Zoom toward mouse position
      zoom(newScale, e.clientX, e.clientY);
    },
    [state.scale, scaleStep, zoom, wheelZoomEnabled]
  );

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Only left mouse button (0) or middle mouse button (1)
      if (e.button !== 0 && e.button !== 1) return;
      
      e.preventDefault();
      hasUserInteractedRef.current = true;
      
      setState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x: e.clientX - prev.offset.x, y: e.clientY - prev.offset.y }
      }));
    },
    []
  );

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!state.isDragging || !state.dragStart) return;
      
      const newOffset = {
        x: e.clientX - state.dragStart.x,
        y: e.clientY - state.dragStart.y
      };
      
      // Adjust offset to keep content within bounds
      const adjustedOffset = adjustOffsetToBounds(newOffset, state.scale);
      
      setState(prev => ({
        ...prev,
        offset: adjustedOffset
      }));
    },
    [state.isDragging, state.dragStart, state.scale, adjustOffsetToBounds]
  );

  // Handle mouse up for panning
  const handleMouseUp = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  // Handle mouse leave for panning
  const handleMouseLeave = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  // Handle touch start for touch interactions
  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      hasUserInteractedRef.current = true;
      
      // Store the touch points
      const touches = Array.from(e.touches);
      touchesRef.current = touches;
      
      if (touches.length === 1) {
        // Single touch for panning
        setState(prev => ({
          ...prev,
          isDragging: true,
          dragStart: { 
            x: touches[0].clientX - prev.offset.x, 
            y: touches[0].clientY - prev.offset.y 
          }
        }));
      } else if (touches.length === 2 && pinchZoomEnabled) {
        // Set up for pinch zooming
        lastDistanceRef.current = getDistance(touches[0], touches[1]);
      }
    },
    [getDistance, pinchZoomEnabled]
  );

  // Handle touch move for touch interactions
  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default to avoid page scrolling
      
      const touches = Array.from(e.touches);
      
      if (touches.length === 1 && state.isDragging && state.dragStart) {
        // Single touch panning
        const newOffset = {
          x: touches[0].clientX - state.dragStart.x,
          y: touches[0].clientY - state.dragStart.y
        };
        
        // Adjust offset to keep content within bounds
        const adjustedOffset = adjustOffsetToBounds(newOffset, state.scale);
        
        setState(prev => ({
          ...prev,
          offset: adjustedOffset
        }));
      } else if (touches.length === 2 && pinchZoomEnabled) {
        // Pinch zooming
        const currentDistance = getDistance(touches[0], touches[1]);
        
        if (lastDistanceRef.current !== null) {
          const midpoint = getMidpoint(touches[0], touches[1]);
          const distanceChange = currentDistance - lastDistanceRef.current;
          const scaleFactor = 1 + (distanceChange / 200); // Adjust sensitivity
          
          zoom(state.scale * scaleFactor, midpoint.x, midpoint.y);
        }
        
        lastDistanceRef.current = currentDistance;
      }
      
      touchesRef.current = touches;
    },
    [
      state.isDragging, 
      state.dragStart, 
      state.scale, 
      zoom, 
      getDistance, 
      getMidpoint, 
      adjustOffsetToBounds,
      pinchZoomEnabled
    ]
  );

  // Handle touch end for touch interactions
  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const touches = Array.from(e.touches);
      
      if (touches.length === 0) {
        // All touches ended
        setState(prev => ({
          ...prev,
          isDragging: false
        }));
        lastDistanceRef.current = null;
      } else if (touches.length === 1) {
        // If we still have one touch, update for panning
        setState(prev => ({
          ...prev,
          dragStart: { 
            x: touches[0].clientX - prev.offset.x, 
            y: touches[0].clientY - prev.offset.y 
          }
        }));
        lastDistanceRef.current = null;
      }
      
      touchesRef.current = touches;
    },
    []
  );

  // Check if the content is outside of the visible area and center it
  const ensureVisible = useCallback((
    contentX: number, 
    contentY: number, 
    animated = true
  ) => {
    if (!containerRef.current) return;
    
    const bounds = getContainerBounds();
    if (!bounds) return;
    
    // Calculate the position in the current scaled and offset coordinate system
    const viewportX = contentX * state.scale + state.offset.x;
    const viewportY = contentY * state.scale + state.offset.y;
    
    // Check if the point is outside of the visible area
    const isOutsideX = viewportX < 0 || viewportX > bounds.width;
    const isOutsideY = viewportY < 0 || viewportY > bounds.height;
    
    if (!isOutsideX && !isOutsideY) return; // No need to adjust
    
    // Calculate new offsets to center the point
    const newOffsetX = bounds.width / 2 - contentX * state.scale;
    const newOffsetY = bounds.height / 2 - contentY * state.scale;
    
    // Apply the new offsets
    if (animated) {
      // Apply with animation using CSS transitions
      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 0.3s ease-out';
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.transition = '';
          }
        }, 300);
      }
    }
    
    setState(prev => ({
      ...prev,
      offset: { x: newOffsetX, y: newOffsetY }
    }));
  }, [state.scale, state.offset, getContainerBounds, containerRef]);

  // Cleanup event listeners when component unmounts
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (state.isDragging) {
        setState(prev => ({
          ...prev,
          isDragging: false
        }));
      }
    };
    
    window.addEventListener('mouseup', handleWindowMouseUp);
    
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [state.isDragging]);

  return {
    scale: state.scale,
    offset: state.offset,
    isDragging: state.isDragging,
    zoomIn,
    zoomOut,
    resetView,
    setScale,
    zoomToFit,
    ensureVisible,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    hasUserInteracted: hasUserInteractedRef.current
  };
} 