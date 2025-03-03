import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Box, Typography, Paper, Divider, Collapse, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess, DeleteOutline } from '@mui/icons-material';
import { ItemTypes, DragItem } from './DraggableClassItem';
import DraggableClassItem from './DraggableClassItem';
import { Class } from '../models/types';

interface TemporaryDropZoneProps {
  onDrop: (item: DragItem) => void;
  storedClasses: {
    classId: string;
    classObj: Class;
    originalTimeSlot: {
      day: string;
      period: number;
    };
  }[];
  onDragFromTemp: (classId: string) => void;
  onRemoveFromTemp?: (classId: string) => void;
}

const TemporaryDropZone: React.FC<TemporaryDropZoneProps> = ({
  onDrop,
  storedClasses,
  onDragFromTemp,
  onRemoveFromTemp
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isOver, setIsOver] = useState(false);

  const [{ isOverCurrent }, drop] = useDrop(() => ({
    accept: ItemTypes.CLASS,
    drop: (item: DragItem) => {
      onDrop(item);
      return undefined;
    },
    collect: (monitor) => ({
      isOverCurrent: !!monitor.isOver(),
    }),
    hover: (item, monitor) => {
      setIsOver(monitor.isOver());
    }
  }), [onDrop]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRemoveClass = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag events
    if (onRemoveFromTemp) {
      onRemoveFromTemp(classId);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mb: 2,
        minHeight: isExpanded ? '100px' : 'auto',
        border: isOverCurrent ? '2px dashed #2196f3' : '1px solid #e0e0e0',
        borderRadius: 2,
        backgroundColor: isOverCurrent ? 'rgba(33, 150, 243, 0.1)' : undefined,
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      className={`temporary-storage ${isOverCurrent ? 'active' : ''}`}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: isExpanded ? 1 : 0
        }}
      >
        <Typography variant="h6">
          Temporary Storage Zone {storedClasses.length > 0 && `(${storedClasses.length})`}
        </Typography>
        <IconButton onClick={handleToggleExpand} size="small">
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={isExpanded}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag classes here to temporarily remove them from the schedule. You can drag them back to any valid time slot.
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box
          ref={drop}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            minHeight: '60px',
            p: 1,
            border: '1px dashed #ccc',
            borderRadius: 1,
            backgroundColor: isOverCurrent ? 'rgba(33, 150, 243, 0.1)' : '#f9f9f9'
          }}
        >
          {storedClasses.length === 0 ? (
            <Box 
              sx={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                p: 2,
                color: 'text.disabled'
              }}
            >
              <Typography variant="body2">No classes in temporary storage</Typography>
            </Box>
          ) : (
            storedClasses.map(({ classId, classObj, originalTimeSlot }) => (
              <Box 
                key={classId} 
                sx={{ 
                  width: '120px', 
                  height: '80px',
                  m: 0.5,
                  position: 'relative'
                }}
              >
                <IconButton 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: -8, 
                    right: -8, 
                    zIndex: 2,
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    }
                  }}
                  onClick={(e) => handleRemoveClass(classId, e)}
                >
                  <DeleteOutline fontSize="small" color="error" />
                </IconButton>
                <DraggableClassItem
                  classObj={classObj}
                  classId={classId}
                  day={originalTimeSlot.day}
                  period={originalTimeSlot.period}
                />
              </Box>
            ))
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default TemporaryDropZone;
