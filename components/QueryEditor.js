import React, { useContext, useState, useRef, useEffect } from 'react';
import { Box, Button, Paper, Typography, Tooltip, ButtonGroup, FormControl, Select, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ConnectionContext } from '../contexts/ConnectionContext';
import MongoHelpDrawer from './MongoHelpDrawer';
import MongoCodeEditor from './MongoCodeEditor';

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

  // Find the connection object based on connectionId
  const connection = connections.find(conn => conn._id === connectionId);

  // Toggle help drawer
  const toggleHelpDrawer = () => {
    setHelpDrawerOpen(!helpDrawerOpen);
  };

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

  // Add event listener for build-query events from ResultsDisplay
  useEffect(() => {
    const handleBuildQuery = (event) => {
      // Only proceed if we have valid query details
      if (!event.detail) return;
      
      const { field, value, operator, label } = event.detail;
      
      if (!field || !operator) return;
      
      // Generate the appropriate query based on the operator and value type
      let queryFragment;
      
      // Format the value based on its type
      let formattedValue;
      if (value === null) {
        formattedValue = 'null';
      } else if (value === undefined) {
        formattedValue = 'undefined';
      } else if (typeof value === 'string') {
        // For strings, apply proper quoting
        formattedValue = `"${value.replace(/"/g, '\\"')}"`;
      } else if (typeof value === 'object' && value instanceof Date) {
        // Handle date objects
        formattedValue = `ISODate("${value.toISOString()}")`;
      } else if (typeof value === 'object') {
        // For objects, convert to string representation
        formattedValue = JSON.stringify(value);
      } else {
        // For numbers, booleans, etc.
        formattedValue = String(value);
      }
      
      // Build the query fragment based on the operator
      switch (operator) {
        case '$eq':
          queryFragment = `"${field}": ${formattedValue}`;
          break;
        case '$ne':
          queryFragment = `"${field}": { "$ne": ${formattedValue} }`;
          break;
        case '$gt':
          queryFragment = `"${field}": { "$gt": ${formattedValue} }`;
          break;
        case '$gte':
          queryFragment = `"${field}": { "$gte": ${formattedValue} }`;
          break;
        case '$lt':
          queryFragment = `"${field}": { "$lt": ${formattedValue} }`;
          break;
        case '$lte':
          queryFragment = `"${field}": { "$lte": ${formattedValue} }`;
          break;
        case '$in':
          queryFragment = `"${field}": { "$in": [${formattedValue}] }`;
          break;
        case '$nin':
          queryFragment = `"${field}": { "$nin": [${formattedValue}] }`;
          break;
        case '$regex':
          // Plain contains regex
          queryFragment = `"${field}": { "$regex": "${value}", "$options": "i" }`;
          break;
        case '$regex^':
          // Starts with regex
          queryFragment = `"${field}": { "$regex": "^${value}", "$options": "i" }`;
          break;
        case '$regex$':
          // Ends with regex
          queryFragment = `"${field}": { "$regex": "${value}$", "$options": "i" }`;
          break;
        case 'null':
          queryFragment = `"${field}": null`;
          break;
        case 'notNull':
          queryFragment = `"${field}": { "$ne": null }`;
          break;
        case 'true':
          queryFragment = `"${field}": true`;
          break;
        case 'false':
          queryFragment = `"${field}": false`;
          break;
        default:
          queryFragment = `"${field}": ${formattedValue}`;
      }
      
      // Copy the query fragment to clipboard instead of inserting it directly
      navigator.clipboard.writeText(queryFragment)
        .then(() => {
          console.log('Query copied to clipboard:', queryFragment);
          // You could set a temporary state here to show a success message
          // Example: setClipboardMessage('Query copied to clipboard!');
          
          // Optional: If you want to show a temporary notification
          if (setError) {
            setError('Query copied to clipboard: ' + queryFragment);
            // Clear the message after a few seconds
            setTimeout(() => setError(null), 3000);
          }
        })
        .catch(err => {
          console.error('Failed to copy query to clipboard:', err);
          if (setError) {
            setError('Failed to copy query to clipboard');
          }
        });
    };
    
    // Add global event listener for build-query events
    window.addEventListener('build-query', handleBuildQuery);
    
    return () => {
      window.removeEventListener('build-query', handleBuildQuery);
    };
  }, [onUpdateQuery]);

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
      
      // First, identify the base query using a simpler approach
      // Use regex to find "db.collection.operation(...)"
      const dbOpRegex = /db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\([^)]*\)/;
      const baseMatch = dbOpRegex.exec(queryStr);
      
      if (!baseMatch) {
        throw new Error('Invalid MongoDB query format. Use: db.collection.operation(parameters)');
      }
      
      const baseQuery = baseMatch[0];
      let remainingStr = queryStr.substring(baseMatch.index + baseQuery.length);
      
      // Now parse cursor operations one by one, handling nested functions properly
      while (remainingStr.trim().startsWith('.')) {
        // Extract the cursor method name
        const methodMatch = /^\.\s*([a-zA-Z0-9_]+)\s*\(/.exec(remainingStr);
        if (!methodMatch) break;
        
        const methodName = methodMatch[1];
        remainingStr = remainingStr.substring(methodMatch[0].length);
        
        // Now extract the arguments by tracking parentheses
        let args = '';
        let depth = 1; // We're already inside the first opening parenthesis
        let i = 0;
        
        while (i < remainingStr.length && depth > 0) {
          if (remainingStr[i] === '(') depth++;
          else if (remainingStr[i] === ')') depth--;
          
          if (depth > 0) {
            args += remainingStr[i];
          }
          i++;
        }
        
        // Add this cursor operation
        cursorOperations.push({
          method: methodName,
          args: args
        });
        
        // Move past the closing parenthesis
        remainingStr = remainingStr.substring(i);
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
      const parsedBaseMatch = baseQuery.match(regex);
      
      if (!parsedBaseMatch) {
        throw new Error('Invalid MongoDB query format. Use: db.collection.operation(parameters)');
      }
      
      const [, collection, operation, paramsStr] = parsedBaseMatch;
      
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
          case 'forEach':
            if (['find', 'aggregate'].includes(apiOperation)) {
              try {
                // Extract the function body from the forEach argument
                const functionBody = cursorOp.args.trim();
                
                // Parse the function to get the parameter name and body
                // Improved regex that's more robust for different function formats
                const functionMatch = /function\s*\(([^)]*)\)\s*{([\s\S]*)}/i.exec(functionBody);
                
                if (functionMatch) {
                  const paramName = functionMatch[1].trim();
                  const fnBody = functionMatch[2].trim();
                  
                  // Store the forEach function details
                  options.forEach = {
                    paramName,
                    body: fnBody
                  };
                  
                  // Since forEach is a terminal operation, we need to tell the backend
                  options.processingMode = 'forEach';
                } else {
                  // Try a more lenient approach to parse the function
                  // This handles cases where the function might be malformed in the cursor operation extraction
                  const fullFunctionStr = `function(${cursorOp.args}`;
                  const openBraceIdx = fullFunctionStr.indexOf('{');
                  
                  if (openBraceIdx > -1) {
                    // Extract parameter name from between parentheses and opening brace
                    const paramStr = fullFunctionStr.substring(9, openBraceIdx).trim();
                    const paramName = paramStr.replace(/[()]/g, '').trim();
                    
                    // Try to find the closing brace by counting opening and closing braces
                    let braceCount = 1;
                    let closeBraceIdx = -1;
                    
                    for (let i = openBraceIdx + 1; i < fullFunctionStr.length; i++) {
                      if (fullFunctionStr[i] === '{') braceCount++;
                      if (fullFunctionStr[i] === '}') braceCount--;
                      
                      if (braceCount === 0) {
                        closeBraceIdx = i;
                        break;
                      }
                    }
                    
                    if (closeBraceIdx > -1) {
                      const fnBody = fullFunctionStr.substring(openBraceIdx + 1, closeBraceIdx).trim();
                      
                      options.forEach = {
                        paramName,
                        body: fnBody
                      };
                      
                      options.processingMode = 'forEach';
                    } else {
                      console.warn('Could not find closing brace in forEach function');
                    }
                  } else {
                    console.warn('Invalid forEach function format:', functionBody);
                  }
                }
              } catch (e) {
                console.warn('Error parsing forEach function:', e);
              }
            }
            break;
          case 'map':
            if (['find', 'aggregate'].includes(apiOperation)) {
              try {
                // Extract the function body from the map argument
                const functionBody = cursorOp.args.trim();
                
                // Parse the function to get the parameter name and body
                const functionMatch = /function\s*\(([^)]*)\)\s*{([\s\S]*)}/i.exec(functionBody);
                
                if (functionMatch) {
                  const paramName = functionMatch[1].trim();
                  const fnBody = functionMatch[2].trim();
                  
                  // Store the map function details
                  options.map = {
                    paramName,
                    body: fnBody
                  };
                  
                  // Tell the backend this is a map operation
                  options.processingMode = 'map';
                } else {
                  console.warn('Invalid map function format:', functionBody);
                }
              } catch (e) {
                console.warn('Error parsing map function:', e);
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
          case 'allowDiskUse':
            if (['find', 'aggregate'].includes(apiOperation)) {
              options.allowDiskUse = cursorOp.args ? cursorOp.args.trim() === 'true' : true;
            }
            break;
          case 'batchSize':
            if (['find', 'aggregate'].includes(apiOperation)) {
              try {
                options.batchSize = parseInt(cursorOp.args);
              } catch (e) {
                console.warn('Invalid batchSize value:', cursorOp.args);
              }
            }
            break;
          case 'collation':
            if (['find', 'findOne', 'aggregate', 'count'].includes(apiOperation)) {
              try {
                const collationStr = cursorOp.args.replace(/(\w+):/g, '"$1":');
                options.collation = JSON.parse(collationStr);
              } catch (e) {
                console.warn('Invalid collation value:', cursorOp.args);
              }
            }
            break;
          case 'readConcern':
            if (['find', 'findOne', 'aggregate', 'count'].includes(apiOperation)) {
              options.readConcern = { level: cursorOp.args.replace(/['"]/g, '') };
            }
            break;
          case 'readPref':
            if (['find', 'findOne', 'aggregate', 'count'].includes(apiOperation)) {
              options.readPreference = cursorOp.args.replace(/['"]/g, '');
            }
            break;
          case 'noCursorTimeout':
            if (['find', 'aggregate'].includes(apiOperation)) {
              options.noCursorTimeout = cursorOp.args ? cursorOp.args.trim() === 'true' : true;
            }
            break;
          case 'returnKey':
            if (['find', 'aggregate'].includes(apiOperation)) {
              options.returnKey = cursorOp.args ? cursorOp.args.trim() === 'true' : true;
            }
            break;
          case 'showRecordId':
            if (['find', 'aggregate'].includes(apiOperation)) {
              options.showRecordId = cursorOp.args ? cursorOp.args.trim() === 'true' : true;
            }
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
    if (!editorRef.current) return null;

    // Check if there's a selection
    const selection = editorRef.current.getSelection();
    if (selection.text) {
      return selection.text;
    }

    // Otherwise, find the query where the cursor is
    const fullText = editorRef.current.getText();
    const cursorPosition = editorRef.current.getCursorPosition();
    const queries = splitQueries(fullText);
    
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
    return queries[0] || fullText;
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
        <MongoCodeEditor
          ref={editorRef}
          value={query || ''}
          onChange={onUpdateQuery}
          placeholder={getExampleQueries()}
          height="200px"
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