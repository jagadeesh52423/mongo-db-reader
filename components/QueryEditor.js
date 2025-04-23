import React, { useContext, useState, useRef, useEffect } from 'react';
import { Box, Button, Paper, TextField, Typography, Tooltip, ButtonGroup, FormControl, Select, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ConnectionContext } from '../contexts/ConnectionContext';
import MongoHelpDrawer from './MongoHelpDrawer';

const QueryEditor = ({ 
  id,
  query, 
  onUpdateQuery, 
  onQueryResult, 
  connectionId,
  database,
  pagination = { page: 1, pageSize: 20 }
}) => {
  const { executeQuery, connections } = useContext(ConnectionContext);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const [helpDrawerOpen, setHelpDrawerOpen] = useState(false);

  // Toggle help drawer
  const toggleHelpDrawer = () => {
    setHelpDrawerOpen(!helpDrawerOpen);
  };

  // Find the connection object based on connectionId
  const connection = connections.find(conn => conn._id === connectionId);

  // Listen for external trigger to execute query (for pagination)
  useEffect(() => {
    const handleExecuteQuery = (event) => {
      const { pagination } = event.detail || {};
      if (pagination) {
        handleRunCurrentQueryWithPagination(pagination);
      }
    };

    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('execute-query', handleExecuteQuery);
      
      return () => {
        element.removeEventListener('execute-query', handleExecuteQuery);
      };
    }
  }, [id, query, connectionId, database]);

  // Example queries for different types that users can reference
  const getExampleQueries = () => {
    return [
      `db.users.find({ name: "John" })`,
      `db.products.insertOne({ name: "New Product", price: 29.99 })`,
      `db.orders.updateOne({ _id: ObjectId("123") }, { $set: { status: "shipped" } })`,
      `db.customers.deleteOne({ _id: ObjectId("456") })`,
      `db.sales.aggregate([{ $match: { date: { $gte: new Date("2025-01-01") } } }, { $group: { _id: "$region", total: { $sum: "$amount" } } }])`,
      `db.employees.countDocuments({ active: true })`,
      `db.products.distinct("category", { inStock: true })`
    ].join(';\n\n');
  };

  // Parse MongoDB shell syntax query
  const parseMongoQuery = (queryStr) => {
    try {
      // Remove any comments
      queryStr = queryStr.replace(/\/\/.*$/gm, '').trim();
      
      // Track cursor operations
      const cursorOperations = [];
      
      // Use a regex to find cursor operations chained to a query
      const cursorMethodRegex = /\.(addOption|allowDiskUse|allowPartialResults|batchSize|close|isClosed|collation|comment|count|explain|forEach|hasNext|hint|isExhausted|itcount|limit|map|max|maxAwaitTimeMS|maxTimeMS|min|next|noCursorTimeout|objsLeftInBatch|pretty|readConcern|readPref|returnKey|showRecordId|size|skip|sort|tailable|toArray|tryNext)\(([^)]*)\)/g;
      
      // Find all cursor operations
      let lastIndex = 0;
      let match;
      let baseQuery = queryStr;
      
      while ((match = cursorMethodRegex.exec(queryStr)) !== null) {
        const fullMatch = match[0];
        const cursorMethod = match[1];
        const cursorArgs = match[2];
        
        // Store the cursor operation
        cursorOperations.push({
          method: cursorMethod,
          args: cursorArgs
        });
        
        // Track where this match ends for later extraction of base query
        lastIndex = match.index + fullMatch.length;
      }
      
      // If we found cursor operations, extract the base query
      if (cursorOperations.length > 0) {
        // The base query is everything up to the first cursor operation
        const firstOpIndex = queryStr.indexOf(`.${cursorOperations[0].method}`);
        baseQuery = queryStr.substring(0, firstOpIndex);
      }
      
      // Look for sort operator after the main query
      let sortOptions = null;
      let sortOp = cursorOperations.find(op => op.method === 'sort');
      
      if (sortOp) {
        try {
          // Parse the sort options
          const sortStr = sortOp.args
            .replace(/(\w+):/g, '"$1":'); // Convert keys to quoted strings for JSON parsing
          sortOptions = JSON.parse(sortStr);
        } catch (e) {
          throw new Error(`Error parsing sort parameters: ${e.message}`);
        }
      }
      
      // Match the MongoDB shell pattern: db.collection.operation(parameters)
      const regex = /db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/s;
      const baseMatch = baseQuery.match(regex);
      
      if (!baseMatch) {
        throw new Error('Invalid MongoDB query format. Use: db.collection.operation(parameters)');
      }
      
      const [, collection, operation, paramsStr] = baseMatch;
      
      // Determine the effective operation based on cursor operations
      let effectiveOperation = operation;
      
      // Handle special cursor operations that change the operation type
      if (operation === 'find') {
        // Check for specific cursor methods that change operation behavior
        const countOp = cursorOperations.find(op => op.method === 'count');
        const sizeOp = cursorOperations.find(op => op.method === 'size');
        const itcountOp = cursorOperations.find(op => op.method === 'itcount');
        
        if (countOp) {
          effectiveOperation = 'countDocuments';
        } else if (sizeOp || itcountOp) {
          effectiveOperation = 'count';
        }
      }
      
      // Try to parse the parameters as JSON
      let params;
      try {
        // Special handling for date strings before JSON parsing
        // Step 1: Replace common MongoDB functions
        let preparedStr = paramsStr
          .replace(/ObjectId\(['"](.*)['"]\)/g, '{"$oid":"$1"}')
          .replace(/ISODate\(['"](.*)['"]\)/g, '{"$date":"$1"}')
          .replace(/new Date\(['"](.*)['"]\)/g, '{"$date":"$1"}');
          
        // Step 2: Process unquoted property names to proper JSON
        preparedStr = preparedStr.replace(/(\w+):/g, '"$1":');
        
        // Step 3: Add special handling for date strings with spaces
        // Temporarily replace date strings that have spaces with placeholders
        const dateStringMatches = [];
        let dateMatchCount = 0;
        
        // Further improved regex to reliably catch date strings with spaces
        const dateRegex = /"(\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{1,2}:\d{1,2}(?:\.\d+)?)?|(?:\d{1,2}\/){2}\d{4}(?:\s+\d{1,2}:\d{1,2}:\d{1,2}(?:\.\d+)?)?|(?:\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?)"/g;
        
        // First pass - identify and mark date strings
        let dateMatches = [];
        let match;
        while ((match = dateRegex.exec(preparedStr)) !== null) {
          dateMatches.push({
            fullMatch: match[0],
            dateString: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
        
        // Sort matches by starting position in reverse order to avoid shifting indices
        dateMatches.sort((a, b) => b.startIndex - a.startIndex);
        
        // Second pass - replace date strings with placeholders
        for (const dateMatch of dateMatches) {
          const placeholder = `"__DATE_PLACEHOLDER_${dateMatchCount}__"`;
          dateStringMatches[dateMatchCount] = dateMatch.fullMatch;
          preparedStr = preparedStr.substring(0, dateMatch.startIndex) + 
                        placeholder + 
                        preparedStr.substring(dateMatch.endIndex);
          dateMatchCount++;
        }
        
        // Now parse the JSON with placeholders
        params = JSON.parse(`[${preparedStr}]`);
        
        // Replace the placeholders with actual date strings
        const restorePlaceholders = (obj) => {
          if (typeof obj !== 'object' || obj === null) return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(item => restorePlaceholders(item));
          }
          
          const result = {};
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.startsWith('__DATE_PLACEHOLDER_') && value.endsWith('__')) {
              const index = parseInt(value.replace('__DATE_PLACEHOLDER_', '').replace('__', ''));
              // Remove the quotes from the original date string (they were added for the regex)
              result[key] = dateStringMatches[index].slice(1, -1);
            } else if (typeof value === 'object' && value !== null) {
              result[key] = restorePlaceholders(value);
            } else {
              result[key] = value;
            }
          }
          return result;
        };
        
        params = params.map(item => restorePlaceholders(item));
      } catch (e) {
        // Fallback for complex queries that can't be parsed simply
        throw new Error(`Error parsing query parameters: ${e.message}. Use valid MongoDB syntax.`);
      }
      
      // Map MongoDB shell operations to our API operations
      const operationMap = {
        'find': 'find',
        'findOne': 'findOne',
        'insertOne': 'insert',
        'insertMany': 'insert',
        'updateOne': 'update',
        'updateMany': 'update',
        'deleteOne': 'delete',
        'deleteMany': 'delete',
        'countDocuments': 'count',
        'count': 'count',
        'aggregate': 'aggregate',
        'distinct': 'distinct'
      };
      
      const apiOperation = operationMap[effectiveOperation];
      if (!apiOperation) {
        throw new Error(`Unsupported operation: ${effectiveOperation}`);
      }
      
      // Format the parameters based on the operation type
      let queryData;
      switch (apiOperation) {
        case 'find':
        case 'findOne':
        case 'count':
          queryData = params[0] || {};
          break;
        case 'insert':
          queryData = operation === 'insertMany' ? params[0] : params[0];
          break;
        case 'update':
          queryData = {
            filter: params[0] || {},
            update: params[1] || { $set: {} }
          };
          break;
        case 'delete':
          queryData = params[0] || {};
          break;
        case 'aggregate':
          queryData = params[0] || [];
          break;
        case 'distinct':
          queryData = {
            field: params[0] || '',
            filter: params[1] || {}
          };
          break;
        default:
          throw new Error(`Unsupported operation mapping: ${apiOperation}`);
      }
      
      // Process additional cursor operations and add to options
      const options = operation.endsWith('Many') ? { many: true } : {};
      
      // Add cursor options based on the cursor operations
      for (const cursorOp of cursorOperations) {
        switch (cursorOp.method) {
          case 'sort':
            if (sortOptions && ['find', 'findOne', 'aggregate'].includes(apiOperation)) {
              options.sort = sortOptions;
            }
            break;
          case 'limit':
            if (['find', 'findOne', 'aggregate'].includes(apiOperation)) {
              try {
                options.limit = parseInt(cursorOp.args);
              } catch (e) {
                console.warn('Invalid limit value:', cursorOp.args);
              }
            }
            break;
          case 'skip':
            if (['find', 'findOne', 'aggregate'].includes(apiOperation)) {
              try {
                options.skip = parseInt(cursorOp.args);
              } catch (e) {
                console.warn('Invalid skip value:', cursorOp.args);
              }
            }
            break;
          case 'hint':
            if (['find', 'findOne', 'aggregate', 'count'].includes(apiOperation)) {
              try {
                const hintStr = cursorOp.args.replace(/(\w+):/g, '"$1":');
                options.hint = JSON.parse(hintStr);
              } catch (e) {
                console.warn('Invalid hint value:', cursorOp.args);
              }
            }
            break;
          case 'comment':
            if (['find', 'findOne', 'aggregate', 'count'].includes(apiOperation)) {
              try {
                // Remove quotes if they exist
                let comment = cursorOp.args.trim();
                if ((comment.startsWith('"') && comment.endsWith('"')) || 
                    (comment.startsWith("'") && comment.endsWith("'"))) {
                  comment = comment.substring(1, comment.length - 1);
                }
                options.comment = comment;
              } catch (e) {
                console.warn('Invalid comment value:', cursorOp.args);
              }
            }
            break;
          case 'maxTimeMS':
            if (['find', 'findOne', 'aggregate', 'count'].includes(apiOperation)) {
              try {
                options.maxTimeMS = parseInt(cursorOp.args);
              } catch (e) {
                console.warn('Invalid maxTimeMS value:', cursorOp.args);
              }
            }
            break;
          case 'pretty':
            options.pretty = true;
            break;
          // Add more cursor operations as needed
        }
      }
      
      return {
        collection,
        type: apiOperation,
        data: queryData,
        options: options,
        cursorOperations: cursorOperations
      };
    } catch (e) {
      throw new Error(`Error parsing MongoDB query: ${e.message}`);
    }
  };

  // Split text into individual query strings
  const splitQueries = (text) => {
    // Split by semicolons but ignore semicolons inside strings or parentheses
    let queries = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let parenCount = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Handle string boundaries
      if ((char === '"' || char === "'") && (i === 0 || text[i-1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      // Handle parentheses
      if (!inString) {
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
      }
      
      // Handle semicolons
      if (char === ';' && !inString && parenCount === 0) {
        if (current.trim()) {
          queries.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last part if not empty
    if (current.trim()) {
      queries.push(current.trim());
    }
    
    return queries;
  };

  // Get the current query where the cursor is or the selected text
  const getCurrentOrSelectedQuery = () => {
    const textArea = editorRef.current;
    if (!textArea) return null;

    // If there's a selection, use that
    if (textArea.selectionStart !== textArea.selectionEnd) {
      return query.substring(textArea.selectionStart, textArea.selectionEnd);
    }

    // Otherwise, find the query where the cursor is
    const cursorPosition = textArea.selectionStart;
    const queries = splitQueries(query);
    
    let startPos = 0;
    for (const q of queries) {
      const endPos = startPos + q.length;
      // Add 1 for the semicolon
      if (cursorPosition >= startPos && cursorPosition <= endPos + 1) {
        return q;
      }
      // Add 2 for semicolon and newline
      startPos = endPos + 2;
    }

    // If we can't determine, return the first query
    return queries[0] || query;
  };

  // Execute a single query with pagination support
  const executeSingleQuery = async (queryString, paginationParams = null) => {
    try {
      const parsedQuery = parseMongoQuery(queryString);
      
      // Add pagination options for find and aggregate operations
      const options = {
        ...parsedQuery.options,
        collection: parsedQuery.collection,
        connectionId: connectionId,
        database: database
      };
      
      // Add pagination parameters if provided and operation supports it
      if (paginationParams && ['find', 'aggregate'].includes(parsedQuery.type)) {
        options.pagination = {
          page: paginationParams.page || pagination.page,
          pageSize: paginationParams.pageSize || pagination.pageSize
        };
      }
      
      // Execute the query with the specified operation type
      const result = await executeQuery(
        parsedQuery.data,
        parsedQuery.type, 
        options
      );
      
      return {
        query: queryString,
        type: parsedQuery.type,
        collection: parsedQuery.collection,
        ...(result.success 
          ? { result: result.data, success: true } 
          : { error: result.message, success: false })
      };
    } catch (e) {
      return {
        query: queryString,
        error: e.message,
        success: false
      };
    }
  };

  // Run the selected query or the one where the cursor is with pagination
  const handleRunCurrentQueryWithPagination = async (paginationParams = null) => {
    if (!connection || !database) {
      setError('Please connect to a database first');
      return;
    }

    const selectedText = getCurrentOrSelectedQuery();
    if (!selectedText) {
      setError('No query found at cursor position');
      return;
    }

    try {
      const result = await executeSingleQuery(selectedText, paginationParams);
      
      if (result.success) {
        onQueryResult(result.result);
        setError(null);
      } else {
        setError(result.error);
        onQueryResult(null);
      }
    } catch (err) {
      setError(err.message);
      onQueryResult(null);
    }
  };

  // Run the selected query or the one where the cursor is
  const handleRunCurrentQuery = () => {
    handleRunCurrentQueryWithPagination();
  };

  // Run all queries in the editor
  const handleRunAllQueries = async () => {
    if (!connection || !database) {
      setError('Please connect to a database first');
      return;
    }

    const queryStrings = splitQueries(query);
    if (queryStrings.length === 0) {
      setError('No queries found');
      return;
    }

    try {
      const allResults = [];
      let hasError = false;

      for (let i = 0; i < queryStrings.length; i++) {
        const result = await executeSingleQuery(queryStrings[i]);
        allResults.push({
          queryNumber: i + 1,
          ...result
        });
        
        if (!result.success) {
          hasError = true;
        }
      }

      onQueryResult({
        multiQuery: true,
        results: allResults
      });

      if (hasError) {
        setError('One or more queries failed. Check the results for details.');
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ mb: 3 }} id={id}>
      <Box sx={{ display: 'flex', mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            Connection: <strong>{connection?.name || 'None'}</strong> {database && <>| <strong>{database}</strong></>}
            {pagination && pagination.page > 1 && <> | Page: <strong>{pagination.page}</strong></>}
          </Typography>
          <Tooltip title="MongoDB Query Help">
            <IconButton onClick={toggleHelpDrawer} size="small" color="primary" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <ButtonGroup variant="contained" color="primary" size="small">
          <Tooltip title="Run the query where your cursor is or your selected text">
            <Button 
              startIcon={<PlayArrowIcon />}
              onClick={handleRunCurrentQuery}
            >
              Run Current
            </Button>
          </Tooltip>
          <Tooltip title="Run all queries (separated by semicolons)">
            <Button 
              startIcon={<PlayCircleOutlineIcon />}
              onClick={handleRunAllQueries}
            >
              Run All
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Box>
      
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <TextField
          inputRef={editorRef}
          multiline
          fullWidth
          minRows={8}
          maxRows={20}
          value={query || ''}
          onChange={(e) => onUpdateQuery(e.target.value)}
          placeholder={query ? '' : getExampleQueries()}
          variant="outlined"
          InputProps={{
            style: { fontFamily: 'monospace', fontSize: '14px' }
          }}
        />
      </Paper>
      
      {error && (
        <Paper 
          sx={{ 
            p: 2, 
            bgcolor: 'error.dark',
            color: 'error.contrastText'
          }}
        >
          {error}
        </Paper>
      )}
      
      {/* MongoDB Help Drawer */}
      <MongoHelpDrawer 
        open={helpDrawerOpen}
        onClose={() => setHelpDrawerOpen(false)}
      />
    </Box>
  );
};

export default QueryEditor;