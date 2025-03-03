import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Box, Typography, Tooltip } from '@mui/material';
import { ItemTypes, DragItem } from './DraggableClassItem';
import { Day, Period, Class } from '../models/types';
import { getDropTooltip } from '../utils/dragDropUtils';

interface DroppableCellProps {
  day: Day;
  period: Period;
  children?: React.ReactNode;
  onDrop: (item: DragItem, day: Day, period: Period) => void;
  isValidDropTarget: (item: DragItem, day: Day, period: Period) => boolean;
  isEmpty: boolean;
}

const DroppableCell: React.FC<DroppableCellProps> = ({
  day,
  period,
  children,
  onDrop,
  isValidDropTarget,
  isEmpty
}) => {
  const [isOver, setIsOver] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

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
      setIsOver(monitor.isOver({ shallow: true }));
      setDragItem(item as DragItem);
      setTooltipOpen(true);
    }
  }), [day, period, onDrop, isValidDropTarget]);

  // Reset hover state when drag ends
  React.useEffect(() => {
    if (!isOverCurrent) {
      setTooltipOpen(false);
    }
  }, [isOverCurrent]);

  // Determine cell styling based on drop state
  const getBackgroundColor = () => {
    if (isOverCurrent && dragItem) {
      return isValidDropTarget(dragItem, day, period)
        ? 'rgba(0, 255, 0, 0.2)' // Valid drop - green tint
        : 'rgba(255, 0, 0, 0.2)'; // Invalid drop - red tint
    }
    return isEmpty ? 'background.paper' : undefined;
  };

  // Get border style
  const getBorderStyle = () => {
    if (isOverCurrent && dragItem) {
      return isValidDropTarget(dragItem, day, period)
        ? '2px dashed #4caf50' // Valid drop - green border
        : '2px dashed #f44336'; // Invalid drop - red border
    }
    return '1px solid transparent';
  };

  // Get tooltip message
  const getTooltipMessage = (): string => {
    if (!dragItem) return '';
    
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
          (isValidDropTarget(dragItem, day, period) ? 'valid-target' : 'invalid-target') : ''}`}
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
