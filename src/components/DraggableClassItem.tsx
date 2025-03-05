import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent, Typography, Box, Tooltip, Fade } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';
import { Class } from '../models/types';

// Define item types for drag and drop
export const ItemTypes = {
  CLASS: 'class',
};

// Define the structure of a draggable item
export interface DragItem {
  type: string;
  classId: string;
  originalTimeSlot: {
    day: string;
    period: number;
  };
}

interface DraggableClassItemProps {
  classObj: Class;
  classId: string;
  day: string;
  period: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const DraggableClassItem: React.FC<DraggableClassItemProps> = ({
  classObj,
  classId,
  day,
  period,
  onDragStart,
  onDragEnd
}) => {
  const [showDragIndicator, setShowDragIndicator] = useState(false);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CLASS,
    item: (): DragItem => {
      if (onDragStart) onDragStart();
      return { 
        type: ItemTypes.CLASS,
        classId, 
        originalTimeSlot: { day, period } 
      };
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
    end: (_item, monitor) => {
      if (onDragEnd) onDragEnd();
    }
  }), [classId, day, period, onDragStart, onDragEnd]);

  // Get a color based on the class name for visual distinction
  const getClassColor = () => {
    // Simple hash function to generate a color based on the class name
    const hash = Array.from(classObj.name).reduce(
      (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0
    );
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 90%)`;
  };

  return (
    <Tooltip
      title={
        <React.Fragment>
          <Typography color="inherit" variant="subtitle2">
            {classObj.name}
          </Typography>
          <Typography variant="body2">
            {`Category: ${classObj.category}`}
          </Typography>
          <Typography variant="body2">
            {`Duration: ${classObj.durationMinutes} minutes`}
          </Typography>
        </React.Fragment>
      }
      arrow
      placement="top"
    >
      <Card
        ref={drag}
        sx={{
          height: '100%',
          width: '100%',
          cursor: 'grab',
          opacity: isDragging ? 0.4 : 1,
          backgroundColor: getClassColor(),
          border: '1px solid rgba(0, 0, 0, 0.12)',
          position: 'relative',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
            '& .drag-indicator': {
              opacity: 1
            }
          },
          transform: isDragging ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={() => setShowDragIndicator(true)}
        onMouseLeave={() => setShowDragIndicator(false)}
      >
        <Fade in={showDragIndicator}>
          <Box
            className="drag-indicator"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: 0,
              transition: 'opacity 0.2s ease'
            }}
          >
            <DragIndicator fontSize="small" sx={{ color: 'text.secondary' }} />
          </Box>
        </Fade>
        
        <CardContent sx={{ 
          p: 1, 
          '&:last-child': { pb: 1 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <Typography variant="subtitle2" noWrap>
            {classObj.name}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" noWrap>
            {classObj.category}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" noWrap>
            {classObj.durationMinutes} min
          </Typography>
        </CardContent>
      </Card>
    </Tooltip>
  );
};

export default DraggableClassItem;
