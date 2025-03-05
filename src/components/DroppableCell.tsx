import React, { useState, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Box, Typography, Tooltip } from '@mui/material';
import { ItemTypes, DragItem } from './DraggableClassItem';
import { TimeSlot } from '../models/types';

interface DroppableCellProps {
  timeSlot: TimeSlot;
  isEmpty: boolean;
  isValidDropTarget: (item: DragItem, timeSlot: TimeSlot) => boolean;
  children?: React.ReactNode;
  className?: string;
  onDrop: (item: DragItem, timeSlot: TimeSlot) => void;
  onHover?: (item: DragItem, timeSlot: TimeSlot) => void;
  onValidationChange?: (isValid: boolean, reason?: string) => void;
  validationResult?: { isValid: boolean; reason?: string; conflictDetails?: any };
}

const DroppableCell: React.FC<DroppableCellProps> = ({
  timeSlot,
  isEmpty,
  isValidDropTarget,
  children,
  className,
  onDrop,
  onHover,
  onValidationChange,
  validationResult
}) => {
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  // Create a ref for the drop target
  const dropRef = useRef(null);

  // Reset state when not dragging
  useEffect(() => {
    if (!dragItem) {
      setTooltipOpen(false);
      if (onValidationChange) {
        onValidationChange(true);
      }
    }
  }, [dragItem, onValidationChange]);

  // Setup drop target
  const [{ isOverCurrent }, drop] = useDrop(() => ({
    accept: ItemTypes.CLASS,
    drop: (item: DragItem) => {
      onDrop(item, timeSlot);
      return undefined;
    },
    hover: (item) => {
      const draggedItem = item as DragItem;
      setDragItem(draggedItem);

      if (onHover) {
        onHover(draggedItem, timeSlot);
      }
    },
    collect: (monitor) => ({
      isOverCurrent: !!monitor.isOver({ shallow: true })
    })
  }), [timeSlot, onDrop, onHover]);

  // Connect the drop ref
  useEffect(() => {
    drop(dropRef.current);
  }, [drop]);

  // Update validation feedback
  useEffect(() => {
    if (dragItem && isOverCurrent) {
      const isValid = validationResult ? validationResult.isValid : isValidDropTarget(dragItem, timeSlot);
      let reason = validationResult?.reason || '';

      if (validationResult?.conflictDetails) {
        const { type, conflictingClass, conflictDescription } = validationResult.conflictDetails;

        if (type === 'OCCUPIED' && conflictingClass) {
          reason = `This slot already has ${conflictingClass} assigned.`;
        } else if (type === 'CLASS_CONFLICT' && conflictDescription) {
          reason = conflictDescription;
        }
      }

      // Update tooltip content based on validation
      setTooltipContent(reason || (isValid ? 'Drop to assign class here' : 'Invalid drop target'));
      setTooltipOpen(isOverCurrent && !!reason);

      // Notify parent of validation status change
      if (onValidationChange) {
        onValidationChange(isValid, reason);
      }
    } else {
      setTooltipOpen(false);
    }
  }, [dragItem, isOverCurrent, isValidDropTarget, timeSlot, validationResult, onValidationChange]);

  // Determine background color based on validation state
  const getBackgroundColor = () => {
    if (isOverCurrent && dragItem) {
      const isValid = validationResult ? validationResult.isValid : isValidDropTarget(dragItem, timeSlot);
      return isValid
        ? 'rgba(0, 255, 0, 0.2)' // Valid drop - green tint
        : 'rgba(255, 0, 0, 0.2)'; // Invalid drop - red tint
    }
    return isEmpty ? 'background.paper' : undefined;
  };

  return (
    <Tooltip
      open={tooltipOpen}
      title={tooltipContent}
      arrow
      placement="top"
    >
      <Box
        className={className}
        sx={{
          height: '100%',
          width: '100%',
          padding: 1,
          backgroundColor: getBackgroundColor(),
          transition: 'background-color 0.2s ease',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
        ref={dropRef}
      >
        {children ? children : isEmpty && (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{
              textAlign: 'center',
              fontSize: '0.7rem',
              userSelect: 'none'
            }}
          >
            Empty
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default DroppableCell;
