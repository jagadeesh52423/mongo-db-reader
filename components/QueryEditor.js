import React, { useContext, useState } from 'react';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, Paper, TextField } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { ConnectionContext } from '../contexts/ConnectionContext';

const QueryEditor = ({ query, onUpdateQuery, onQueryResult }) => {
  const { executeQuery, activeConnection, activeDatabase, activeCollection } = useContext(ConnectionContext);
  const [queryType, setQueryType] = useState('find');
  const [error, setError] = useState(null);

  const handleRunQuery = async () => {
    if (!activeConnection || !activeDatabase || !activeCollection) {
      setError('Please connect to a database and select a collection first');
      return;
    }

    try {
      // Parse the query string to JSON
      let parsedQuery;
      try {
        // Handle different query formats based on type
        if (queryType === 'find' || queryType === 'findOne' || queryType === 'count' || queryType === 'delete') {
          parsedQuery = query ? JSON.parse(query) : {};
        } else if (queryType === 'update') {
          parsedQuery = query ? JSON.parse(query) : { filter: {}, update: { $set: {} } };
        } else if (queryType === 'aggregate') {
          parsedQuery = query ? JSON.parse(query) : [];
        } else if (queryType === 'distinct') {
          parsedQuery = query ? JSON.parse(query) : { field: '', filter: {} };
        } else if (queryType === 'insert') {
          parsedQuery = query ? JSON.parse(query) : {};
        }
      } catch (e) {
        setError('Invalid JSON: ' + e.message);
        return;
      }

      const result = await executeQuery(parsedQuery, queryType);
      if (result.success) {
        onQueryResult(result.data);
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getPlaceholderQuery = () => {
    switch (queryType) {
      case 'find':
        return '{\n  "name": "John"\n}';
      case 'findOne':
        return '{\n  "_id": "your-id-here"\n}';
      case 'count':
        return '{\n  "status": "active"\n}';
      case 'aggregate':
        return '[\n  { "$match": { "status": "active" } },\n  { "$group": { "_id": "$category", "count": { "$sum": 1 } } }\n]';
      case 'distinct':
        return '{\n  "field": "category",\n  "filter": { "status": "active" }\n}';
      case 'insert':
        return '{\n  "name": "New Document",\n  "status": "active",\n  "date": new Date()\n}';
      case 'update':
        return '{\n  "filter": { "_id": "your-id-here" },\n  "update": { "$set": { "status": "inactive" } }\n}';
      case 'delete':
        return '{\n  "_id": "your-id-here"\n}';
      default:
        return '{}';
    }
  };

  const handleQueryTypeChange = (e) => {
    setQueryType(e.target.value);
    // Set placeholder query example when changing query type
    if (!query) {
      onUpdateQuery(getPlaceholderQuery());
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', mb: 2 }}>
        <FormControl sx={{ minWidth: 150, mr: 2 }}>
          <InputLabel id="query-type-label">Query Type</InputLabel>
          <Select
            labelId="query-type-label"
            id="query-type"
            value={queryType}
            label="Query Type"
            onChange={handleQueryTypeChange}
          >
            <MenuItem value="find">Find</MenuItem>
            <MenuItem value="findOne">Find One</MenuItem>
            <MenuItem value="count">Count</MenuItem>
            <MenuItem value="aggregate">Aggregate</MenuItem>
            <MenuItem value="distinct">Distinct</MenuItem>
            <MenuItem value="insert">Insert</MenuItem>
            <MenuItem value="update">Update</MenuItem>
            <MenuItem value="delete">Delete</MenuItem>
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PlayArrowIcon />}
          onClick={handleRunQuery}
        >
          Run Query
        </Button>
      </Box>
      
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <TextField
          multiline
          fullWidth
          minRows={6}
          maxRows={20}
          value={query || ''}
          onChange={(e) => onUpdateQuery(e.target.value)}
          placeholder={getPlaceholderQuery()}
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