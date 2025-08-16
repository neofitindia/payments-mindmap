import { useState, useCallback, useMemo } from 'react';
import { recipientService } from '../services';
import { Point, convertScreenToSVGCoordinates, calculatePanDelta, applyPanOffset, hasPositionChanged } from '../utils/svgHelpers';
import { executeAsyncOperation } from '../utils/asyncHelpers';

interface PositioningState {
  recipientPositions: Record<string, Point>;
  isDragging: boolean;
  draggedRecipientId: string | null;
  isPanning: boolean;
  panOffset: Point;
  lastPanPoint: Point;
}

const initialPositioningState: PositioningState = {
  recipientPositions: {},
  isDragging: false,
  draggedRecipientId: null,
  isPanning: false,
  panOffset: { x: 0, y: 0 },
  lastPanPoint: { x: 0, y: 0 }
};

export const usePositioning = () => {
  const [positioningState, setPositioningState] = useState<PositioningState>(initialPositioningState);

  const loadPositions = useCallback((recipients: Array<{ id: string; position: Point }>) => {
    if (recipients.length === 0) return;
    
    const positions: Record<string, Point> = {};
    recipients.forEach(recipient => {
      if (recipient.position?.x !== undefined && recipient.position?.y !== undefined) {
        positions[recipient.id] = recipient.position;
      }
    });
    
    setPositioningState(prev => {
      const hasChanges = hasPositionChanged(prev.recipientPositions, positions);
      return hasChanges ? { ...prev, recipientPositions: positions } : prev;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, recipientId?: string) => {
    e.preventDefault();
    
    if (recipientId) {
      setPositioningState(prev => ({
        ...prev,
        isDragging: true,
        draggedRecipientId: recipientId
      }));
    } else {
      setPositioningState(prev => ({
        ...prev,
        isPanning: true,
        lastPanPoint: { x: e.clientX, y: e.clientY }
      }));
    }
  }, []);

  // Debounced mouse move to improve performance during dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { isDragging, draggedRecipientId, isPanning, lastPanPoint, panOffset } = positioningState;
    
    if (isDragging && draggedRecipientId) {
      const svgElement = e.currentTarget as SVGSVGElement;
      const svgPosition = convertScreenToSVGCoordinates({
        clientX: e.clientX,
        clientY: e.clientY,
        svgElement,
        panOffset
      });
      
      setPositioningState(prev => ({
        ...prev,
        recipientPositions: {
          ...prev.recipientPositions,
          [draggedRecipientId]: svgPosition
        }
      }));
    } else if (isPanning) {
      const currentPoint = { x: e.clientX, y: e.clientY };
      const delta = calculatePanDelta(currentPoint, lastPanPoint);
      const newPanOffset = applyPanOffset(panOffset, delta);
      
      setPositioningState(prev => ({
        ...prev,
        panOffset: newPanOffset,
        lastPanPoint: currentPoint
      }));
    }
  }, [positioningState]);

  const saveRecipientPosition = useCallback(async (recipientId: string, position: Point) => {
    return executeAsyncOperation(
      async () => {
        const recipientsResult = await recipientService.getAllRecipients();
        if (!recipientsResult.success || !recipientsResult.data) {
          throw new Error('Failed to load recipients');
        }
        
        const dbRecipient = recipientsResult.data.find(r => r.id === recipientId);
        if (!dbRecipient) {
          throw new Error('Recipient not found');
        }
        
        const updatedRecipient = {
          ...dbRecipient,
          positionX: position.x,
          positionY: position.y,
          updatedAt: new Date().toISOString()
        };
        
        return await recipientService.updateRecipient(updatedRecipient);
      },
      { errorMessage: 'Failed to save recipient position' }
    );
  }, []);
  
  const handleMouseUp = useCallback(async () => {
    const { isDragging, draggedRecipientId, recipientPositions } = positioningState;
    
    if (isDragging && draggedRecipientId) {
      const position = recipientPositions[draggedRecipientId];
      if (position) {
        await saveRecipientPosition(draggedRecipientId, position);
      }
    }
    
    setPositioningState(prev => ({
      ...prev,
      isPanning: false,
      isDragging: false,
      draggedRecipientId: null
    }));
  }, [positioningState, saveRecipientPosition]);

  // Memoized derived state to prevent unnecessary re-renders
  const isInteracting = useMemo(() => 
    positioningState.isDragging || positioningState.isPanning, 
    [positioningState.isDragging, positioningState.isPanning]
  );
  
  const currentDragPosition = useMemo(() => 
    positioningState.draggedRecipientId ? 
      positioningState.recipientPositions[positioningState.draggedRecipientId] : 
      null,
    [positioningState.draggedRecipientId, positioningState.recipientPositions]
  );
  
  // Memoized setter function
  const setRecipientPositions = useCallback((positions: Record<string, Point>) => 
    setPositioningState(prev => ({ ...prev, recipientPositions: positions })), []);

  return {
    ...positioningState,
    isInteracting,
    currentDragPosition,
    loadPositions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    setRecipientPositions
  };
};