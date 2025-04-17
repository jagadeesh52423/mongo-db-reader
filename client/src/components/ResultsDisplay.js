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
    </>
  );
};

export default ResultsDisplay;
