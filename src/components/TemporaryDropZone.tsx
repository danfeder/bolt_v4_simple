import React, { useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider
} from '@mui/material';
import { ItemTypes, DragItem } from './DraggableClassItem';
import DraggableClassItem from './DraggableClassItem';
import { Class, Day, Period } from '../models/types';

interface TemporaryDropZoneProps {
  tempClasses: Array<{
    classObj: Class;
    classId: string;
  }>;
  onDrop: (item: DragItem) => void;
  onDragStart?: (classId: string) => void;
  onDragEnd?: (classId: string) => void;
}

const TemporaryDropZone: React.FC<TemporaryDropZoneProps> = ({
  tempClasses,
  onDrop,
  onDragStart,
  onDragEnd
}) => {
  const dropRef = useRef(null);
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.CLASS,
    drop: (item) => {
      onDrop(item as DragItem);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }), [onDrop]);

  // Connect the drop ref
  useEffect(() => {
    drop(dropRef.current);
  }, [drop]);

  // Handle class drag start
  const handleDragStart = (classId: string) => {
    if (onDragStart) onDragStart(classId);
  };

  // Handle class drag end
  const handleDragEnd = (classId: string) => {
    if (onDragEnd) onDragEnd(classId);
  };

  return (
    <Paper 
      elevation={3} 
      ref={dropRef}
      sx={{
        p: 2,
        mb: 3,
        minHeight: '200px',
        backgroundColor: isOver ? 'rgba(63, 81, 181, 0.1)' : 'white',
        transition: 'background-color 0.3s ease',
        border: isOver ? '2px dashed #3f51b5' : '1px solid rgba(0, 0, 0, 0.12)'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Temporary Storage
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Drag classes here to temporarily remove them from the schedule. You can drag them back to the schedule later.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ 
        mt: 2, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 2
      }}>
        {tempClasses.length > 0 ? (
          tempClasses.map(({ classObj, classId }) => (
            <Box 
              key={classId} 
              sx={{ 
                height: '100px',
                borderRadius: '4px'
              }}
            >
              <DraggableClassItem
                classObj={classObj}
                classId={classId}
                day={Day.UNASSIGNED}
                period={0 as Period}
                onDragStart={() => handleDragStart(classId)}
                onDragEnd={() => handleDragEnd(classId)}
              />
            </Box>
          ))
        ) : (
          <Box sx={{ 
            p: 2, 
            textAlign: 'center', 
            color: 'text.secondary',
            gridColumn: '1 / -1'
          }}>
            <Typography variant="body2">
              No classes in temporary storage
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TemporaryDropZone;
