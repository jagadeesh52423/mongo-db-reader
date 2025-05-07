import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  Collapse,
  Menu,
  MenuItem,
  Tooltip,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import JSONTree from 'react-json-tree';

const ResultsDisplay = ({ results }) => {
  const [viewMode, setViewMode] = useState('json');
  
  if (!results) {
    return (
      <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Typography variant="body1" color="text.secondary" align="center">
          Run a query to see results here
        </Typography>
      </Paper>
    );
  }
  
  const handleChangeViewMode = (event, newValue) => {
    setViewMode(newValue);
  };
  
  // Check if results is an array
  const isArray = Array.isArray(results);
  // Count of items if it's an array
  const count = isArray ? results.length : 1;
  
  // Get fields for table view (from first item if array or from object if single result)
  const fields = isArray && results.length > 0 
    ? Object.keys(results[0] || {}) 
    : Object.keys(results || {});
  
  return (
    <Paper variant="outlined" sx={{ bgcolor: 'background.paper', flexGrow: 1, overflow: 'auto' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', px: 2 }}>
        <Tabs value={viewMode} onChange={handleChangeViewMode}>
          <Tab value="json" label="JSON" />
          {(isArray || typeof results === 'object') && <Tab value="table" label="Table" />}
        </Tabs>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ alignSelf: 'center', pr: 2 }}>
          {isArray ? `${count} documents` : 'Result'}
        </Typography>
      </Box>
      
      <Box sx={{ p: 2 }}>
        {viewMode === 'json' && (
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            <JSONTree 
              data={results} 
              theme={{
                scheme: 'monokai',
                base00: '#272822',
                base01: '#383830',
                base02: '#49483e',
                base03: '#75715e',
                base04: '#a59f85',
                base05: '#f8f8f2',
                base06: '#f5f4f1',
                base07: '#f9f8f5',
                base08: '#f92672',
                base09: '#fd971f',
                base0A: '#f4bf75',
                base0B: '#a6e22e',
                base0C: '#a1efe4',
                base0D: '#66d9ef',
                base0E: '#ae81ff',
                base0F: '#cc6633'
              }}
              shouldExpandNode={() => true}
            />
          </Box>
        )}
        
        {viewMode === 'table' && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="results table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 40 }}></TableCell>
                  {fields.map((field) => (
                    <TableCell key={field}>{field}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isArray ? (
                  results.map((row, index) => (
                    <ExpandableTableRow key={index} row={row} fields={fields} />
                  ))
                ) : (
                  <ExpandableTableRow row={results} fields={fields} />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
};

// Component for table rows that can expand to show nested objects
const ExpandableTableRow = ({ row, fields }) => {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  
  // Maximum width for cell content in pixels
  const MAX_CELL_WIDTH = 150;
  // Maximum characters to show before truncating
  const MAX_CHARS = 50;
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Check if any field contains an object/array that would need expansion
  const hasComplexFields = fields.some(field => 
    row[field] !== null && 
    typeof row[field] === 'object'
  );
  
  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Format a value for display in table cell
  const formatCellValue = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return '';
    
    if (typeof value === 'object') {
      return Array.isArray(value) 
        ? `Array(${value.length})` 
        : 'Object';
    }
    
    const strValue = String(value);
    return truncateText(strValue, MAX_CHARS);
  };
  
  // Determine the data type of a value
  const getFieldType = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const type = typeof value;
    
    // Check if it's a date string
    if (type === 'string') {
      // ISO date format
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
      
      // Standard date formats YYYY-MM-DD or YYYY/MM/DD
      const standardDatePattern = /^\d{4}[-/](0?[1-9]|1[012])[-/](0?[1-9]|[12][0-9]|3[01])$/;
      
      if (isoDatePattern.test(value) || standardDatePattern.test(value)) {
        return 'date';
      }
      return 'string';
    }
    
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    
    return type;
  };
  
  // Handle right-click on a cell
  const handleContextMenu = (event, field, value) => {
    event.preventDefault();
    
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
    setSelectedField(field);
    setSelectedValue(value);
  };
  
  // Close the context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setSelectedField(null);
    setSelectedValue(null);
  };
  
  // View only this field's value in JSON view
  const handleViewFieldJson = () => {
    const fieldValue = row[selectedField];
    console.log(`Field: ${selectedField}, Value:`, fieldValue);
    
    // Create and trigger a custom event to show this value
    const event = new CustomEvent('view-field-json', {
      detail: { 
        field: selectedField, 
        value: fieldValue,
        source: row
      }
    });
    window.dispatchEvent(event);
    
    handleCloseContextMenu();
  };
  
  // Copy field value to clipboard
  const handleCopyValue = () => {
    const value = row[selectedField];
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    navigator.clipboard.writeText(stringValue);
    handleCloseContextMenu();
  };
  
  // Copy field as JSON key-value pair
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

  // Handle query option selection
  const handleQueryOption = (option) => {
    console.log(`Query option selected: ${option.label} (${option.value}) for field: ${selectedField}, value: ${selectedValue}`);
    
    // Create and trigger a custom event for query building
    const event = new CustomEvent('build-query', {
      detail: { 
        field: selectedField, 
        value: selectedValue,
        operator: option.value,
        label: option.label
      }
    });
    window.dispatchEvent(event);
    
    handleCloseContextMenu();
  };

  return (
    <>
      <TableRow>
        <TableCell padding="checkbox">
          <Tooltip title="View as JSON">
            <IconButton size="small" onClick={toggleExpand}>
              <VisibilityIcon fontSize="small" />
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
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
              }}
            >
              {formatCellValue(value)}
            </TableCell>
          );
        })}
      </TableRow>
      
      {expanded && (
        <TableRow>
          <TableCell colSpan={fields.length + 1} sx={{ p: 0, borderBottom: 0 }}>
            <Collapse in={expanded}>
              <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                <JSONTree 
                  data={row} 
                  hideRoot 
                  theme={{
                    scheme: 'monokai',
                    base00: '#272822',
                    base01: '#383830',
                    base02: '#49483e',
                    base03: '#75715e',
                    base04: '#a59f85',
                    base05: '#f8f8f2',
                    base06: '#f5f4f1',
                    base07: '#f9f8f5',
                    base08: '#f92672',
                    base09: '#fd971f',
                    base0A: '#f4bf75',
                    base0B: '#a6e22e',
                    base0C: '#a1efe4',
                    base0D: '#66d9ef',
                    base0E: '#ae81ff',
                    base0F: '#cc6633'
                  }}
                />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
      
      {/* Context menu for right-click on cells */}
      {contextMenu && (
        <Menu
          open={true}
          onClose={handleCloseContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
        >
          <MenuItem onClick={handleViewFieldJson}>
            <Typography variant="body2">View JSON for this field</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleCopyValue}>
            <Typography variant="body2">Copy value</Typography>
          </MenuItem>
          <MenuItem onClick={handleCopyKeyValue}>
            <Typography variant="body2">Copy as JSON key-value</Typography>
          </MenuItem>
          
          {/* Query Options */}
          <Divider />
          <MenuItem disabled>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Query Options</Typography>
          </MenuItem>
          
          {getQueryOptionsForType(getFieldType(selectedValue)).map((option) => (
            <MenuItem 
              key={option.value} 
              onClick={() => handleQueryOption(option)}
              sx={{ pl: 3 }}
            >
              <Typography variant="body2">{option.label}</Typography>
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
};

// Function to get query options based on field type
const getQueryOptionsForType = (fieldType) => {
  if (fieldType === 'string') {
    return [
      { label: 'Equals', value: '$eq' },
      { label: 'Not Equals', value: '$ne' },
      { label: 'Contains', value: '$regex' },
      { label: 'Starts With', value: '$regex^' },
      { label: 'Ends With', value: '$regex$' },
    ];
  } else if (fieldType === 'number') {
    return [
      { label: 'Equals', value: '$eq' },
      { label: 'Not Equals', value: '$ne' },
      { label: 'Greater Than', value: '$gt' },
      { label: 'Greater Than or Equals', value: '$gte' },
      { label: 'Less Than', value: '$lt' },
      { label: 'Less Than or Equals', value: '$lte' },
    ];
  } else if (fieldType === 'date') {
    return [
      { label: 'Equals', value: '$eq' },
      { label: 'Not Equals', value: '$ne' },
      { label: 'After', value: '$gt' },
      { label: 'After or On', value: '$gte' },
      { label: 'Before', value: '$lt' },
      { label: 'Before or On', value: '$lte' },
    ];
  } else if (fieldType === 'boolean') {
    return [
      { label: 'Is True', value: 'true' },
      { label: 'Is False', value: 'false' },
    ];
  } else if (fieldType === 'null') {
    return [
      { label: 'Is Null', value: 'null' },
      { label: 'Is Not Null', value: 'notNull' },
    ];
  } else {
    // Default options for other types
    return [
      { label: 'Equals', value: '$eq' },
      { label: 'Not Equals', value: '$ne' },
    ];
  }
};

// Component to show a single field's JSON value in a modal
// This could be added later and triggered by the custom event we're dispatching

export default ResultsDisplay;
