import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  Collapse,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  Typography,
  alpha
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import JSONTree from 'react-json-tree';

// Default theme for JSONTree, can be overridden by prop if needed in future
const defaultJsonTreeTheme = {
  scheme: 'futuristic-dark-nested', // Slightly different name for clarity if needed
  author: 'theme-agent-nested',
  base00: '#10141F', // Matching the main JSON view's expanded section
  base01: '#1A202C',
  base02: '#A0A0A0',
  base03: '#A0A0A0',
  base04: '#E0E0E0',
  base05: '#E0E0E0',
  base06: '#FFFFFF',
  base07: '#FFFFFF',
  base08: '#9F00FF', 
  base09: '#00FFFF', 
  base0A: '#34C759', 
  base0B: '#A6E22E', 
  base0C: '#00FFFF', 
  base0D: '#E0E0E0', 
  base0E: '#9F00FF', 
  base0F: '#FF3B30', 
};

const jsonValueRenderer = (raw, value) => {
  if (typeof value === 'number') return <span style={{ color: '#34C759' }}>{raw}</span>;
  if (typeof value === 'string') return <span style={{ color: '#00FFFF' }}>{raw}</span>;
  if (typeof value === 'boolean' || value === null) return <span style={{ color: '#9F00FF' }}>{raw}</span>;
  return raw;
};

const jsonLabelRenderer = ([key]) => <span style={{ color: '#E0E0E0' }}>{key}:</span>;


const ExpandableTableRow = ({ row, fields, jsonTreeTheme = defaultJsonTreeTheme }) => {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  
  const MAX_CELL_WIDTH = 150;
  const MAX_CHARS = 50;
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  const formatCellValue = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return '';
    if (typeof value === 'object') {
      return Array.isArray(value) ? `Array(${value.length})` : 'Object';
    }
    const strValue = String(value);
    return truncateText(strValue, MAX_CHARS);
  };
  
  const handleContextMenu = (event, field, value) => {
    event.preventDefault();
    if (value === null || typeof value !== 'object') {
      setContextMenu({
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
      setSelectedField(field);
    }
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setSelectedField(null);
  };
  
  const handleViewFieldJson = () => {
    const fieldValue = row[selectedField];
    const event = new CustomEvent('view-field-json', {
      detail: { field: selectedField, value: fieldValue, source: row }
    });
    window.dispatchEvent(event);
    handleCloseContextMenu();
  };
  
  const handleCopyValue = () => {
    const value = row[selectedField];
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    navigator.clipboard.writeText(stringValue);
    handleCloseContextMenu();
  };
  
  const handleCopyKeyValue = () => {
    const value = row[selectedField];
    let formattedValue;
    if (value === null) {
      formattedValue = 'null';
    } else if (value === undefined) {
      formattedValue = 'undefined';
    } else if (typeof value === 'string') {
      formattedValue = `"${value}"`;
    } else {
      formattedValue = String(value);
    }
    navigator.clipboard.writeText(`"${selectedField}": ${formattedValue}`);
    handleCloseContextMenu();
  };

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05) } }}>
        <TableCell padding="checkbox" sx={{ borderColor: 'divider' }}>
          <Tooltip title="View as JSON">
            <IconButton 
              size="small" 
              onClick={toggleExpand} 
              sx={(theme) => ({ 
                color: theme.palette.text.secondary,
                transition: theme.transitions.create(['color'], { duration: theme.transitions.duration.short }),
                '&:hover': {
                  color: theme.palette.primary.main,
                }
              })}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
        {fields.map((field) => {
          const value = row[field];
          return (
            <TableCell 
              key={field}
              onContextMenu={(e) => handleContextMenu(e, field, value)}
              sx={{ 
                maxWidth: MAX_CELL_WIDTH,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'default',
                color: 'text.primary',
                borderColor: 'divider',
              }}
            >
              {formatCellValue(value)}
            </TableCell>
          );
        })}
      </TableRow>
      
      {expanded && (
        <TableRow>
          <TableCell colSpan={fields.length + 1} sx={{ p: 0, borderBottom: 0, borderColor: 'divider' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: jsonTreeTheme.base00 /* Use theme from prop */ }}>
                <JSONTree
                  data={row}
                  hideRoot
                  theme={jsonTreeTheme}
                  style={{ fontSize: '0.8em' }}
                  valueRenderer={jsonValueRenderer} // Use local/imported renderer
                  labelRenderer={jsonLabelRenderer} // Use local/imported renderer
                />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
      
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: { bgcolor: 'background.paper', border: (theme) => `1px solid ${theme.palette.divider}` },
        }}
      >
        <MenuItem onClick={handleViewFieldJson} sx={{ '&:hover': { bgcolor: alpha('#00FFFF', 0.1) }}}>
          <Typography variant="body2" color="text.primary">View JSON for this field</Typography>
        </MenuItem>
        <Divider sx={{ bgcolor: 'divider' }} />
        <MenuItem onClick={handleCopyValue} sx={{ '&:hover': { bgcolor: alpha('#00FFFF', 0.1) }}}>
          <Typography variant="body2" color="text.primary">Copy value</Typography>
        </MenuItem>
        <MenuItem onClick={handleCopyKeyValue} sx={{ '&:hover': { bgcolor: alpha('#00FFFF', 0.1) }}}>
          <Typography variant="body2" color="text.primary">Copy as JSON key-value</Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExpandableTableRow;
