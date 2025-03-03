import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Box, Typography, Tooltip } from '@mui/material';
import { ItemTypes, DragItem } from './DraggableClassItem';
import { Day, Period, Class } from '../models/types';
import { getDropTooltip, validateClassMove } from '../utils/dragDropUtils';

interface DroppableCellProps {
  day: Day;
  period: Period;
  children?: React.ReactNode;
  onDrop: (item: DragItem, day: Day, period: Period) => void;
  isValidDropTarget: (item: DragItem, day: Day, period: Period) => boolean;
  isEmpty: boolean;
  classes?: Class[];
  schedule?: any;
}

const DroppableCell: React.FC<DroppableCellProps> = ({
  day,
  period,
  children,
  onDrop,
  isValidDropTarget,
  isEmpty,
  classes = [],
  schedule = null
}) => {
  const [isOver, setIsOver] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    reason?: string;
    conflictDetails?: {
      type: 'OCCUPIED' | 'CLASS_CONFLICT';
      conflictingClass?: string;
      conflictDescription?: string;
    }
  } | null>(null);

  const [{ isOverCurrent }, drop] = useDrop(() => ({
    accept: ItemTypes.CLASS,
    drop: (item: DragItem) => {
      onDrop(item, day, period);
    },
    canDrop: (item: DragItem) => isValidDropTarget(item, day, period),
    collect: (monitor) => ({
      isOverCurrent: !!monitor.isOver({ shallow: true })
    }),
    hover: (item, monitor) => {
      const dragItem = item as DragItem;
      setIsOver(monitor.isOver({ shallow: true }));
      setDragItem(dragItem);
      
      // If we have schedule and classes data, get detailed validation info
      if (schedule && classes.length > 0 && dragItem.classId) {
        try {
          const result = validateClassMove(
            dragItem.classId,
            day,
            period,
            schedule,
            classes
          );
          setValidationResult(result);
        } catch (error) {
          // Fallback to simple validation
          setValidationResult({
            isValid: isValidDropTarget(dragItem, day, period)
          });
        }
      } else {
        // Fallback to simple validation
        setValidationResult({
          isValid: isValidDropTarget(dragItem, day, period)
        });
      }
      
      setTooltipOpen(true);
    }
  }), [day, period, onDrop, isValidDropTarget, schedule, classes]);

  // Reset hover state when drag ends
  React.useEffect(() => {
    if (!isOverCurrent) {
      setTooltipOpen(false);
      setValidationResult(null);
    }
  }, [isOverCurrent]);

  // Determine cell styling based on drop state
  const getBackgroundColor = () => {
    if (isOverCurrent && dragItem) {
      const isValid = validationResult ? validationResult.isValid : isValidDropTarget(dragItem, day, period);
      return isValid
        ? 'rgba(0, 255, 0, 0.2)' // Valid drop - green tint
        : 'rgba(255, 0, 0, 0.2)'; // Invalid drop - red tint
    }
    return isEmpty ? 'background.paper' : undefined;
  };

  // Get border style
  const getBorderStyle = () => {
    if (isOverCurrent && dragItem) {
      const isValid = validationResult ? validationResult.isValid : isValidDropTarget(dragItem, day, period);
      return isValid
        ? '2px dashed #4caf50' // Valid drop - green border
        : '2px dashed #f44336'; // Invalid drop - red border
    }
    return '1px solid transparent';
  };

  // Get tooltip message
  const getTooltipMessage = (): string => {
    if (!dragItem) return '';
    
    if (validationResult) {
      return getDropTooltip(
        validationResult.isValid, 
        validationResult.reason,
        validationResult.conflictDetails
      );
    }
    
    // Fallback to basic tooltip
    const isValid = isValidDropTarget(dragItem, day, period);
    return getDropTooltip(isValid);
  };

  return (
    <Tooltip
      title={getTooltipMessage()}
      open={tooltipOpen && isOverCurrent}
      arrow
      placement="top"
    >
      <Box
        ref={drop}
        sx={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: getBackgroundColor(),
          borderRadius: 1,
          p: 1,
          transition: 'all 0.2s ease-in-out',
          border: getBorderStyle(),
          '&:hover': {
            boxShadow: isEmpty ? '0 0 0 1px rgba(0, 0, 0, 0.1)' : 'none',
          }
        }}
        className={`drop-target ${isOverCurrent && dragItem ? 
          (validationResult?.isValid || isValidDropTarget(dragItem, day, period) ? 'valid-target' : 'invalid-target') : ''}`}
      >
        {children || (
          <Typography variant="body2" color="text.secondary">
            No Class
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default DroppableCell;
