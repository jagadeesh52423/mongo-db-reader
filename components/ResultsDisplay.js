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
  Stack,
  Menu
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
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  
  // Create a ref to the query editor that will be updated
  const queryEditorRef = useRef(null);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Check if any field contains an object/array that would need expansion
  const hasComplexFields = fields.some(field => 
    row[field] !== null && 
    typeof row[field] === 'object'
  );
  
  // Determine the data type of a value
  const getFieldType = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const type = typeof value;
    
    // Check if it's a date string (expanded pattern matching)
    if (type === 'string') {
      // ISO date format
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
      
      // Standard date formats YYYY-MM-DD or YYYY/MM/DD
      const standardDatePattern = /^\d{4}[-/](0?[1-9]|1[012])[-/](0?[1-9]|[12][0-9]|3[01])$/;
      
      // MongoDB timestamp format YYYY/MM/DD HH:MM:SS.mmm
      const mongoTimestampPattern = /^\d{4}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
      
      // Another common format MM/DD/YYYY
      const americanDatePattern = /^(0?[1-9]|1[012])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
      
      if (isoDatePattern.test(value) || 
          standardDatePattern.test(value) || 
          mongoTimestampPattern.test(value) ||
          americanDatePattern.test(value)) {
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
    // Prevent the default context menu
    event.preventDefault();
    
    // Only show context menu for non-complex values
    if (value === null || typeof value !== 'object') {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
      setSelectedField(field);
      setSelectedValue(value);
    }
  };
  
  // Close the context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setSelectedField(null);
    setSelectedValue(null);
  };
  
  // Helper function to copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Copied to clipboard successfully');
      })
      .catch(err => {
        console.error('Error copying to clipboard: ', err);
      });
  };
  
  // Handle copy value
  const handleCopyValue = () => {
    const value = row[selectedField];
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    copyToClipboard(stringValue);
    handleCloseContextMenu();
  };
  
  // Handle copy record (entire row)
  const handleCopyRecord = () => {
    copyToClipboard(JSON.stringify(row, null, 2));
    handleCloseContextMenu();
  };
  
  // Handle copy field (key:value)
  const handleCopyField = () => {
    const value = row[selectedField];
    
    let formattedValue = '';
    if (value === null) {
      formattedValue = 'null';
    } else if (value === undefined) {
      formattedValue = 'undefined';
    } else if (typeof value === 'string') {
      formattedValue = `"${value}"`;
    } else {
      formattedValue = String(value);
    }
    
    // Format as JSON key-value pair
    copyToClipboard(`"${selectedField}": ${formattedValue}`);
    handleCloseContextMenu();
  };
  
  // Format the value appropriately for MongoDB query syntax
  const formatValueForQuery = (value, operator) => {
    const fieldType = getFieldType(value);
    
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (fieldType === 'string') {
      // Handle regex operators specially
      if (operator === '$regex') {
        return `"${value}"`;
      } else if (operator === '$regex^') {
        return `"^${value}"`;
      } else if (operator === '$regex$') {
        return `"${value}$"`;
      } else {
        return `"${value}"`;
      }
    } else if (fieldType === 'date') {
      // Format as date for MongoDB
      return `"${value}"`;
    } else {
      // Numbers and booleans don't need quotes
      return String(value);
    }
  };
  
  // Handle query option selection
  const handleQueryOption = (option) => {
    const value = row[selectedField];
    const formattedValue = formatValueForQuery(value, option.value);
    let querySnippet = '';
    
    // Map the option to the appropriate MongoDB query syntax without enclosing braces
    switch (option.value) {
      case '$eq':
        querySnippet = `"${selectedField}": ${formattedValue}`;
        break;
      case '$ne':
        querySnippet = `"${selectedField}": { "$ne": ${formattedValue} }`;
        break;
      case '$gt':
        querySnippet = `"${selectedField}": { "$gt": ${formattedValue} }`;
        break;
      case '$gte':
        querySnippet = `"${selectedField}": { "$gte": ${formattedValue} }`;
        break;
      case '$lt':
        querySnippet = `"${selectedField}": { "$lt": ${formattedValue} }`;
        break;
      case '$lte':
        querySnippet = `"${selectedField}": { "$lte": ${formattedValue} }`;
        break;
      case '$in':
        querySnippet = `"${selectedField}": { "$in": [${formattedValue}] }`;
        break;
      case '$nin':
        querySnippet = `"${selectedField}": { "$nin": [${formattedValue}] }`;
        break;
      case '$regex':
        querySnippet = `"${selectedField}": { "$regex": ${formattedValue}, "$options": "i" }`;
        break;
      case '$regex^':
        querySnippet = `"${selectedField}": { "$regex": "^${value}", "$options": "i" }`;
        break;
      case '$regex$':
        querySnippet = `"${selectedField}": { "$regex": "${value}$", "$options": "i" }`;
        break;
      case 'null':
        querySnippet = `"${selectedField}": null`;
        break;
      case 'notNull':
        querySnippet = `"${selectedField}": { "$ne": null }`;
        break;
      case 'true':
        querySnippet = `"${selectedField}": true`;
        break;
      case 'false':
        querySnippet = `"${selectedField}": false`;
        break;
      default:
        querySnippet = `"${selectedField}": ${formattedValue}`;
    }
    
    // Copy the query snippet to clipboard
    copyToClipboard(querySnippet);
    
    // Create a custom event to suggest this query in the editor
    const event = new CustomEvent('suggest-query', {
      detail: { 
        query: querySnippet,
        field: selectedField,
        operator: option.value,
        value: value
      }
    });
    window.dispatchEvent(event);
    
    handleCloseContextMenu();
  };
  
  return (
    <>
      <TableRow>
        {fields.map((field) => {
          const value = row[field];
          const isComplex = value !== null && typeof value === 'object';
          
          return (
            <TableCell 
              key={field}
              onContextMenu={(e) => handleContextMenu(e, field, value)}
              sx={{ 
                cursor: isComplex ? 'default' : 'pointer',
                '&:hover': { 
                  backgroundColor: isComplex ? 'inherit' : 'rgba(0, 0, 0, 0.04)' 
                }
              }}
            >
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
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'inline-block', 
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  {value !== undefined ? String(value) : ''}
                </Box>
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
      
      {contextMenu && (
        <TableCellContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onCopyValue={handleCopyValue}
          onCopyRecord={handleCopyRecord}
          onCopyField={handleCopyField}
          onQueryOption={handleQueryOption}
          fieldType={getFieldType(selectedValue)}
        />
      )}
    </>
  );
};

// Component for context menu on table cells
const TableCellContextMenu = ({ x, y, onClose, onCopyValue, onCopyRecord, onCopyField, onQueryOption, fieldType }) => {
  // Position the menu at the mouse position
  const menuPosition = {
    left: x,
    top: y
  };

  // Define query options based on field type
  const getQueryOptions = () => {
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
        { label: 'In List', value: '$in' },
        { label: 'Not In List', value: '$nin' },
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

  const queryOptions = getQueryOptions();

  // Handle query option selection
  const handleQueryOption = (option) => {
    onQueryOption(option);
    onClose();
  };

  return (
    <Menu
      open={true}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={menuPosition}
    >
      <MenuItem onClick={onCopyValue}>
        <Typography variant="body2">Copy Value</Typography>
      </MenuItem>
      <MenuItem onClick={onCopyRecord}>
        <Typography variant="body2">Copy Record</Typography>
      </MenuItem>
      <MenuItem onClick={onCopyField}>
        <Typography variant="body2">Copy Field</Typography>
      </MenuItem>
      
      {/* Query Options Submenu */}
      <Divider />
      <MenuItem>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Query Options</Typography>
      </MenuItem>
      {queryOptions.map((option) => (
        <MenuItem 
          key={option.value} 
          onClick={() => handleQueryOption(option)}
          sx={{ pl: 3 }}
        >
          <Typography variant="body2">{option.label}</Typography>
        </MenuItem>
      ))}
    </Menu>
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
  
  // Handle numeric results (like count operations)
  if (typeof results === 'number') {
    return (
      <Paper variant="outlined" sx={{ bgcolor: 'background.paper', flexGrow: 1, overflow: 'auto', p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', px: 2, pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            Count Result
          </Typography>
        </Box>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {results}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Handle forEach processing results
  if (results && results.forEach && Array.isArray(results.forEach)) {
    return (
      <Paper variant="outlined" sx={{ bgcolor: 'background.paper', flexGrow: 1, overflow: 'auto', p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', px: 2, pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            forEach Results
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {results.forEach.map((item, index) => (
            <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              {item.error ? (
                <Typography color="error">{item.error}</Typography>
              ) : (
                <Typography component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}>
                  {item.printed}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }
  
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