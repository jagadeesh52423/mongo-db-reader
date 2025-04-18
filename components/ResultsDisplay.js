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
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

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

// Simple component to format MongoDB shell queries with basic syntax highlighting
const MongoQueryDisplay = ({ query }) => {
  // First unescape any HTML entities already in the query
  const unescapeHtml = (text) => {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  };
  
  // Then escape HTML for safe display
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Pre-process the query to handle both escaped and unescaped versions
  const processedQuery = escapeHtml(unescapeHtml(query));

  return (
    <Box 
      component="pre" 
      sx={{ 
        fontFamily: 'monospace', 
        fontSize: '14px',
        whiteSpace: 'pre-wrap',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '4px',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        overflowX: 'auto',
        color: '#24292e',
        margin: 0
      }}
      dangerouslySetInnerHTML={{ __html: processedQuery }}
    />
  );
};

// Results display for a single query result
const SingleResultDisplay = ({ results }) => {
  const [viewMode, setViewMode] = useState('json');
  
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
    <Box>
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
    </Box>
  );
};

// Component for multi-query results display
const MultiQueryResultDisplay = ({ results }) => {
  const [expandedPanel, setExpandedPanel] = useState(0);

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : -1);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ px: 2, py: 1 }}>
        Multiple Query Results
      </Typography>
      <Divider />
      
      {results.map((result, index) => (
        <Accordion 
          key={index}
          expanded={expandedPanel === index}
          onChange={handlePanelChange(index)}
          TransitionProps={{ unmountOnExit: true }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              bgcolor: result.success ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
              '&:hover': { 
                bgcolor: result.success ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)'
              },
              color: result.success ? 'success.dark' : 'error.dark'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {result.success 
                ? <CheckCircleIcon color="success" sx={{ mr: 1 }} /> 
                : <ErrorIcon color="error" sx={{ mr: 1 }} />
              }
              <Typography color="inherit" fontWeight="medium">
                Query {result.queryNumber}: {result.success ? 'Success' : 'Failed'}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Chip 
                label={result.success 
                  ? (Array.isArray(result.result) 
                    ? `${result.result.length} documents` 
                    : typeof result.result === 'object' 
                      ? 'Object' 
                      : result.result)
                  : 'Error'
                }
                size="small"
                color={result.success ? "success" : "error"}
                variant="outlined"
                sx={{ fontWeight: 'medium' }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Query:</Typography>
              <Box sx={{ mb: 2 }}>
                <MongoQueryDisplay query={result.query} />
              </Box>
              
              {result.success ? (
                <Box>
                  <Typography variant="subtitle2">Result:</Typography>
                  <Paper variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                    <SingleResultDisplay results={result.result} />
                  </Paper>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2">Error:</Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(211, 47, 47, 0.05)', 
                      color: 'error.dark',
                      border: '1px solid',
                      borderColor: 'error.light'
                    }}
                  >
                    {result.error}
                  </Paper>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
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

// Main ResultsDisplay component
const ResultsDisplay = ({ results }) => {
  if (!results) {
    return (
      <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Typography variant="body1" color="text.secondary" align="center">
          Run a query to see results here
        </Typography>
      </Paper>
    );
  }
  
  // Check if this is a multi-query result
  const isMultiQuery = results && results.multiQuery && Array.isArray(results.results);
  
  return (
    <Paper variant="outlined" sx={{ bgcolor: 'background.paper', flexGrow: 1, overflow: 'auto' }}>
      {isMultiQuery ? (
        <MultiQueryResultDisplay results={results.results} />
      ) : (
        <SingleResultDisplay results={results} />
      )}
    </Paper>
  );
};

export default ResultsDisplay;