import React, { useContext, useState, useRef } from 'react';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, Paper, alpha } from '@mui/material'; // Added alpha
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import { ConnectionContext } from '../contexts/ConnectionContext';
import MongoCodeEditor from '../../../components/MongoCodeEditor';
import { parseMongoQuery } from '../../utils/queryParser'; // Import the new utility

const QueryEditor = ({ query, onUpdateQuery, onQueryResult }) => {
  const { executeQuery, activeConnection, activeDatabase, activeCollection } = useContext(ConnectionContext);
  const [queryType, setQueryType] = useState('find');
  const [error, setError] = useState(null);
  const editorRef = useRef(null);

  const handleRunQuery = async () => {
    if (!activeConnection || !activeDatabase || !activeCollection) {
      setError('Please connect to a database and select a collection first');
      return;
    }

    try {
      let queryToExecute = query;
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection.text) {
          queryToExecute = selection.text;
        }
      }

      let parsedQuery;
      try {
        parsedQuery = parseMongoQuery(queryToExecute, queryType);
      } catch (e) {
        // The error from parseMongoQuery now includes "Invalid JSON for {queryType} query: "
        setError(e.message); 
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
            sx={{ 
              color: 'text.primary', 
              '.MuiSvgIcon-root': { color: 'text.secondary' },
              '&.MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'text.secondary' },
                '&:hover fieldset': { borderColor: 'primary.main' },
              }
            }}
            MenuProps={{
              PaperProps: {
                sx: { bgcolor: 'background.paper' },
              },
            }}
          >
            <MenuItem value="find" sx={{ color: 'text.primary' }}>Find</MenuItem>
            <MenuItem value="findOne" sx={{ color: 'text.primary' }}>Find One</MenuItem>
            <MenuItem value="count" sx={{ color: 'text.primary' }}>Count</MenuItem>
            <MenuItem value="aggregate" sx={{ color: 'text.primary' }}>Aggregate</MenuItem>
            <MenuItem value="distinct" sx={{ color: 'text.primary' }}>Distinct</MenuItem>
            <MenuItem value="insert" sx={{ color: 'text.primary' }}>Insert</MenuItem>
            <MenuItem value="update" sx={{ color: 'text.primary' }}>Update</MenuItem>
            <MenuItem value="delete" sx={{ color: 'text.primary' }}>Delete</MenuItem>
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          color="primary" // Uses theme.palette.primary.main for background (#00FFFF)
          startIcon={<PlayArrowOutlinedIcon />}
          onClick={handleRunQuery}
          sx={{ 
            color: 'background.default', // background.default is #0A0F1A
            transition: (theme) => theme.transitions.create(['background-color', 'transform'], { 
              duration: theme.transitions.duration.short,
            }),
            '&:hover': { 
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.85), // Slightly darken primary
              transform: 'scale(1.03)',
            },
          }}
        >
          Run Query
        </Button>
      </Box>
      
      <Paper variant="outlined" sx={{ mb: 2, bgcolor: 'background.paper', borderColor: 'divider' }}>
        <MongoCodeEditor 
          ref={editorRef}
          value={query || ''}
          onChange={onUpdateQuery}
          placeholder={getPlaceholderQuery()}
          height="200px"
          // MongoCodeEditor's internal theme (syntax highlighting, gutter, etc.)
          // needs to be configured for a dark theme that matches the futuristic palette.
          // This might involve passing theme props to it (if available) or
          // updating its internal CodeMirror (or other editor) theme setup.
        />
      </Paper>
      
      {error && (
        <Paper 
          sx={{ 
            p: 2, 
            bgcolor: 'error.main', // Use error.main from theme
            color: 'common.white', // Ensure high contrast text
            mt: 2 
          }}
        >
          {error}
        </Paper>
      )}
    </Box>
  );
};

export default QueryEditor;
