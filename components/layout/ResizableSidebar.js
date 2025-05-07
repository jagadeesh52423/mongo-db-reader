import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Drawer, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Sidebar from './Sidebar';

// Minimum and maximum width for the sidebar
const MIN_DRAWER_WIDTH = 60;
const MAX_DRAWER_WIDTH = 400;
const DEFAULT_DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 60;

/**
 * A resizable sidebar component with collapse/expand functionality
 */
const ResizableSidebar = ({ mobileOpen, handleDrawerToggle }) => {
  // Track if the sidebar is collapsed
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Track current width of sidebar
  const [width, setWidth] = useState(DEFAULT_DRAWER_WIDTH);
  
  // Store previous width before collapse
  const prevWidthRef = useRef(DEFAULT_DRAWER_WIDTH);
  
  // For resize drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef(null);
  
  // Toggle collapse state
  const toggleCollapse = () => {
    if (isCollapsed) {
      // Expand to previous width
      setWidth(prevWidthRef.current);
    } else {
      // Save current width before collapsing
      prevWidthRef.current = width;
      // Collapse
      setWidth(COLLAPSED_WIDTH);
    }
    setIsCollapsed(!isCollapsed);
  };
  
  // Handle drag start
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Resize when dragging
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newWidth = e.clientX;
        // Enforce min/max constraints
        if (newWidth >= MIN_DRAWER_WIDTH && newWidth <= MAX_DRAWER_WIDTH) {
          setWidth(newWidth);
          setIsCollapsed(false);
        }
      }
    };
    
    // Stop drag operation
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);
  
  // Save width to localStorage
  useEffect(() => {
    // Don't save collapsed state width
    if (!isCollapsed && width !== COLLAPSED_WIDTH) {
      localStorage.setItem('sidebarWidth', width.toString());
    }
  }, [width, isCollapsed]);
  
  // Load width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (!isNaN(parsedWidth) && parsedWidth >= MIN_DRAWER_WIDTH && parsedWidth <= MAX_DRAWER_WIDTH) {
        setWidth(parsedWidth);
        prevWidthRef.current = parsedWidth;
      }
    }
  }, []);
  
  return (
    <>
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: width,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: width,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: 1,
            overflowX: 'hidden',
            transition: isCollapsed || isDragging ? 'none' : 'width 0.2s ease',
          },
        }}
        open
      >
        <Box sx={{ position: 'relative', height: '100%' }}>
          {/* Sidebar Content */}
          <Sidebar 
            mobileOpen={mobileOpen} 
            handleDrawerToggle={handleDrawerToggle}
            isCollapsed={isCollapsed} 
          />
          
          {/* Collapse/Expand Button */}
          <Tooltip title={isCollapsed ? "Expand" : "Collapse"} placement="right">
            <IconButton
              onClick={toggleCollapse}
              size="small"
              sx={{
                position: 'absolute',
                right: -10,
                top: 15,
                backgroundColor: theme => theme.palette.background.paper,
                border: theme => `1px solid ${theme.palette.divider}`,
                zIndex: 10,
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: theme => theme.palette.action.hover,
                },
              }}
            >
              {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          {/* Drag handle */}
          {!isCollapsed && (
            <Box
              ref={dragHandleRef}
              onMouseDown={handleDragStart}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '5px',
                height: '100%',
                cursor: 'col-resize',
                zIndex: 10,
                '&:hover': {
                  backgroundColor: theme => theme.palette.primary.main + '40', // Add transparency
                },
                ...(isDragging && {
                  backgroundColor: theme => theme.palette.primary.main + '40',
                }),
              }}
            />
          )}
        </Box>
      </Drawer>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DEFAULT_DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isCollapsed={false} />
      </Drawer>
    </>
  );
};

export default ResizableSidebar;