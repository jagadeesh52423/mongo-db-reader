import React, { useContext, useState, useRef, useEffect } from 'react';
import { Box, Button, Paper, TextField, Typography, Tooltip, ButtonGroup, FormControl, Select } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { ConnectionContext } from '../contexts/ConnectionContext';

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
      
      // Match the MongoDB shell pattern: db.collection.operation(parameters)
      const regex = /db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/s;
      const match = queryStr.match(regex);
      
      if (!match) {
        throw new Error('Invalid MongoDB query format. Use: db.collection.operation(parameters)');
      }
      
      const [, collection, operation, paramsStr] = match;
      
      // Try to parse the parameters as JSON
      // This is more complex in real-world scenarios with ObjectId, dates, etc.
      // For now, a simplified approach using eval with safety checks
      let params;
      try {
        // Replace ObjectId, ISODate, etc. with placeholder functions
        const preparedStr = paramsStr
          .replace(/ObjectId\(['"](.*)['"]\)/g, '{"$oid":"$1"}')
          .replace(/new Date\(['"](.*)['"]\)/g, '{"$date":"$1"}')
          .replace(/(\w+):/g, '"$1":'); // Convert keys to quoted strings for JSON parsing
        
        params = JSON.parse(`[${preparedStr}]`);
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
      
      const apiOperation = operationMap[operation];
      if (!apiOperation) {
        throw new Error(`Unsupported operation: ${operation}`);
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
      
      return {
        collection,
        type: apiOperation,
        data: queryData,
        options: operation.endsWith('Many') ? { many: true } : {}
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
    </Box>
  );
};

export default QueryEditor;