import React, { useState, useContext, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Button,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import { ConnectionContext } from '../contexts/ConnectionContext';
import ConnectionDialog from './ConnectionDialog';

const Header = ({ handleDrawerToggle }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const { 
    activeConnection, 
    databases, 
    activeDatabase,
    setActiveDatabase,
    loading,
    serverStatus,
    retryConnection
  } = useContext(ConnectionContext);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Add additional logging for debugging
  useEffect(() => {
    if (activeDatabase) {
      console.log(`Active database changed to: ${activeDatabase}`);
    }
  }, [activeDatabase]);

  const handleDatabaseChange = (event) => {
    const dbName = event.target.value;
    console.log(`Database selected: ${dbName}`);
    setActiveDatabase(dbName);
  };

  // Get status color and icon based on server status
  const getStatusInfo = () => {
    switch(serverStatus) {
      case 'connected':
        return {
          color: 'success',
          icon: <CheckCircleIcon fontSize="small" />,
          label: 'Connected'
        };
      case 'disconnected':
        return {
          color: 'error',
          icon: <ErrorIcon fontSize="small" />,
          label: 'Disconnected'
        };
      case 'checking':
      default:
        return {
          color: 'warning',
          icon: <SyncIcon fontSize="small" className="rotating" />,
          label: 'Checking...'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <style jsx global>{`
        .rotating {
          animation: rotate 2s linear infinite;
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            MongoDB Reader
          </Typography>
          
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            onClick={serverStatus === 'disconnected' ? retryConnection : undefined}
            sx={{ mr: 2 }}
          />
          
          {activeConnection && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <FormControl sx={{ minWidth: 120, mr: 2 }} size="small">
                <InputLabel id="database-select-label">Database</InputLabel>
                <Select
                  labelId="database-select-label"
                  id="database-select"
                  value={activeDatabase || ''}
                  label="Database"
                  onChange={handleDatabaseChange}
                  endAdornment={loading && <CircularProgress size={20} sx={{ mr: 2 }} />}
                >
                  {databases.map((db) => (
                    <MenuItem key={db} value={db}>{db}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          <Button 
            color="inherit" 
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            New Connection
          </Button>
        </Toolbar>
      </AppBar>
      
      <ConnectionDialog open={openDialog} handleClose={handleCloseDialog} />
    </>
  );
};

export default Header;