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
  Chip,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Stack
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
const SingleResultDisplay = ({ results, onPageChange, pageable = false }) => {
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const handleChangeViewMode = (event, newValue) => {
    setViewMode(newValue);
  };
  
  // Check if results is an array or has pagination metadata
  const isArray = Array.isArray(results);
  const isPaginated = results && results.metadata && Array.isArray(results.documents);
  
  // Total count of documents
  let count = 0;
  let totalPages = 0;
  let documents = [];
  
  if (isPaginated) {
    count = results.metadata.totalCount;
    documents = results.documents;
    totalPages = Math.ceil(count / pageSize);
  } else if (isArray) {
    count = results.length;
    documents = results;
    totalPages = Math.ceil(count / pageSize);
  } else {
    documents = results ? [results] : [];
    count = documents.length;
  }
  
  // For both table and JSON view, paginate the documents if needed
  const paginatedDocuments = isArray && pageable && !isPaginated
    ? documents.slice((page - 1) * pageSize, page * pageSize)
    : documents;
  
  // Get fields for table view (from first item if array or from object if single result)
  const fields = paginatedDocuments.length > 0 
    ? Object.keys(paginatedDocuments[0] || {}) 
    : Object.keys(results || {});
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    
    // If we have a callback and this is not local pagination
    if (onPageChange && isPaginated) {
      onPageChange(value, pageSize);
    }
  };
  
  // Handle page size change
  const handlePageSizeChange = (event) => {
    const newPageSize = parseInt(event.target.value);
    setPageSize(newPageSize);
    setPage(1); // Reset to first page
    
    // If we have a callback and this is not local pagination
    if (onPageChange && isPaginated) {
      onPageChange(1, newPageSize);
    }
  };
  
  // Show pagination if we have an array with more than one page of items
  const showPagination = (isArray || isPaginated) && count > pageSize;
  
  // Prepare the data to display in JSON view
  const jsonViewData = isPaginated 
    ? { ...results, documents: paginatedDocuments } // Keep metadata but use paginated documents
    : (isArray ? paginatedDocuments : documents);
  
  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', px: 2 }}>
        <Tabs value={viewMode} onChange={handleChangeViewMode}>
          <Tab value="json" label="JSON" />
          {(isArray || isPaginated || typeof results === 'object') && <Tab value="table" label="Table" />}
        </Tabs>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ alignSelf: 'center', pr: 2 }}>
          {isArray || isPaginated ? `${count} documents` : 'Result'}
        </Typography>
      </Box>
      
      <Box sx={{ p: 2 }}>
        {viewMode === 'json' && (
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            <SimpleJSONViewer data={jsonViewData} />
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
                {paginatedDocuments.map((row, index) => (
                  <ExpandableTableRow key={index} row={row} fields={fields} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {showPagination && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="page-size-select-label">Page Size</InputLabel>
              <Select
                labelId="page-size-select-label"
                value={pageSize}
                label="Page Size"
                onChange={handlePageSizeChange}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
              showFirstButton 
              showLastButton
            />
            
            <Typography variant="body2" color="text.secondary">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, count)} of {count}
            </Typography>
          </Box>
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
const ResultsDisplay = ({ results, onPageChange }) => {
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
        <SingleResultDisplay 
          results={results} 
          onPageChange={onPageChange}
          pageable={true}
        />
      )}
    </Paper>
  );
};

export default ResultsDisplay;