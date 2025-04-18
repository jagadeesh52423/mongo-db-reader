import React, { useContext } from 'react';
import { Box, Alert, Button, Typography, Link } from '@mui/material';
import { ConnectionContext } from '../contexts/ConnectionContext';

const ServerStatusBar = () => {
  const { serverStatus, retryConnection, error } = useContext(ConnectionContext);

  if (serverStatus === 'connected') {
    return null;
  }

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Alert 
        severity="error" 
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={retryConnection}
            disabled={serverStatus === 'checking'}
          >
            Retry
          </Button>
        }
      >
        <Typography variant="body1">
          {serverStatus === 'checking' ? 'Checking server connection...' : 
           'Cannot connect to the MongoDB server. Please make sure the server is running at localhost:5001.'}
        </Typography>
        {error && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Error: {error}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 1 }}>
          To fix this issue:
        </Typography>
        <ol>
          <li>
            <Typography variant="body2">
              Make sure you've installed all dependencies by running:
              <Box component="code" sx={{ display: 'block', bgcolor: 'background.paper', p: 1, my: 1, borderRadius: 1 }}>
                npm run install-all
              </Box>
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Make sure MongoDB is running on your system
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Start the server in a separate terminal window:
              <Box component="code" sx={{ display: 'block', bgcolor: 'background.paper', p: 1, my: 1, borderRadius: 1 }}>
                npm run server
              </Box>
            </Typography>
          </li>
        </ol>
      </Alert>
    </Box>
  );
};

export default ServerStatusBar;
