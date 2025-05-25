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
  TableRow
} from '@mui/material';
import JSONTree from 'react-json-tree';
import ExpandableTableRow from './ExpandableTableRow';

// Define the JSONTree theme, valueRenderer, and labelRenderer
// These were previously in ResultsDisplay.js and are specific to this presentation.
const mainJsonTreeTheme = {
  scheme: 'futuristic-dark',
  author: 'theme-agent',
  base00: '#10141F', 
  base01: '#1A202C', 
  base02: '#A0A0A0', 
  base03: '#A0A0A0', 
  base04: '#E0E0E0', 
  base05: '#E0E0E0', 
  base06: '#FFFFFF', 
  base07: '#FFFFFF', 
  base08: '#9F00FF', 
  base09: '#00FFFF', 
  base0A: '#34C759', 
  base0B: '#A6E22E', 
  base0C: '#00FFFF', 
  base0D: '#E0E0E0', 
  base0E: '#9F00FF', 
  base0F: '#FF3B30', 
};

const mainJsonValueRenderer = (raw, value) => {
  if (typeof value === 'number') return <span style={{ color: '#34C759' }}>{raw}</span>;
  if (typeof value === 'string') return <span style={{ color: '#00FFFF' }}>{raw}</span>;
  if (typeof value === 'boolean' || value === null) return <span style={{ color: '#9F00FF' }}>{raw}</span>;
  return raw;
};

const mainJsonLabelRenderer = ([key]) => <span style={{ color: '#E0E0E0' }}>{key}:</span>;

const SingleResultDisplay = ({ results }) => {
  const [viewMode, setViewMode] = useState('json');
  
  const handleChangeViewMode = (event, newValue) => {
    setViewMode(newValue);
  };
  
  const isArray = Array.isArray(results);
  const count = isArray ? results.length : 1;
  
  const fields = isArray && results.length > 0 
    ? Object.keys(results[0] || {}) 
    : Object.keys(results || {});
  
  return (
    <Paper variant="outlined" sx={{ bgcolor: 'background.paper', flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', px: 2, flexShrink: 0 }}>
        <Tabs value={viewMode} onChange={handleChangeViewMode}>
          <Tab value="json" label="JSON" />
          {(isArray || typeof results === 'object') && <Tab value="table" label="Table" />}
        </Tabs>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ alignSelf: 'center', pr: 2 }}>
          {isArray ? `${count} documents` : 'Result'}
        </Typography>
      </Box>
      
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
        {viewMode === 'json' && (
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            <JSONTree 
              data={results}
              theme={mainJsonTreeTheme}
              style={{
                backgroundColor: mainJsonTreeTheme.base00, 
                fontSize: '0.9em',
              }}
              valueRenderer={mainJsonValueRenderer}
              labelRenderer={mainJsonLabelRenderer}
              shouldExpandNode={() => true} 
            />
          </Box>
        )}
        
        {viewMode === 'table' && (
          <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider' }}>
            <Table size="small" aria-label="results table">
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 40, borderColor: 'divider' }}></TableCell>
                  {fields.map((field) => (
                    <TableCell key={field} sx={{ color: 'text.primary', borderColor: 'divider' }}>{field}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isArray ? (
                  results.map((row, index) => (
                    <ExpandableTableRow key={index} row={row} fields={fields} jsonTreeTheme={mainJsonTreeTheme} />
                  ))
                ) : (
                  <ExpandableTableRow row={results} fields={fields} jsonTreeTheme={mainJsonTreeTheme} />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
};

export default SingleResultDisplay;
