import React, { useState } from 'react';
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
  Collapse
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Fallback simple JSON viewer component as default
const SimpleJSONViewer = ({ data }) => (
  <pre style={{ 
    fontFamily: 'monospace', 
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto'
  }}>
    {JSON.stringify(data, null, 2)}
  </pre>
);

// Use directly without dynamic import for now to debug the issue
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
            <SimpleJSONViewer data={results} />
          </Box>
        )}
        
        {viewMode === 'table' && fields.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="results table">
              <TableHead>
                <TableRow>
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
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Check if any field contains an object/array that would need expansion
  const hasComplexFields = fields.some(field => 
    row[field] !== null && 
    typeof row[field] === 'object'
  );
  
  return (
    <>
      <TableRow>
        {fields.map((field) => {
          const value = row[field];
          const isComplex = value !== null && typeof value === 'object';
          
          return (
            <TableCell key={field}>
              {isComplex ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {Array.isArray(value) ? `Array(${value.length})` : 'Object'}
                  </Typography>
                  {hasComplexFields && (
                    <IconButton size="small" onClick={toggleExpand}>
                      {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                </Box>
              ) : (
                value !== undefined ? String(value) : ''
              )}
            </TableCell>
          );
        })}
      </TableRow>
      
      {hasComplexFields && expanded && (
        <TableRow>
          <TableCell colSpan={fields.length} sx={{ p: 0, borderBottom: 0 }}>
            <Collapse in={expanded}>
              <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                <SimpleJSONViewer data={row} />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default ResultsDisplay;