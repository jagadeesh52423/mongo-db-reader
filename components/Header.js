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
  Chip,
  Badge,
  Menu,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import StorageIcon from '@mui/icons-material/Storage';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import { ConnectionContext } from '../contexts/ConnectionContext';
import ConnectionDialog from './ConnectionDialog';

const Header = ({ handleDrawerToggle }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { 
    activeConnections,
    currentConnectionId,
    getAllActiveConnections,
    focusConnection,
    disconnectDatabase,
    disconnectAllDatabases,
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

  const handleConnectionMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleConnectionMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFocusConnection = (connectionId) => {
    focusConnection(connectionId);
    handleConnectionMenuClose();
  };

  const handleDisconnect = () => {
    if (currentConnectionId) {
      disconnectDatabase(currentConnectionId);
    }
    handleConnectionMenuClose();
  };

  const handleDisconnectAll = () => {
    disconnectAllDatabases();
    handleConnectionMenuClose();
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
  const activeConnectionsCount = Object.keys(activeConnections).length;
  const allActiveConnections = getAllActiveConnections();
  const currentConnection = currentConnectionId ? allActiveConnections[currentConnectionId] : null;

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
          
          {activeConnectionsCount > 0 && (
            <Tooltip title="Manage connections">
              <Badge 
                badgeContent={activeConnectionsCount} 
                color="secondary"
                overlap="circular"
                sx={{ mr: 2 }}
              >
                <IconButton 
                  color="inherit" 
                  onClick={handleConnectionMenuOpen}
                >
                  <StorageIcon />
                </IconButton>
              </Badge>
            </Tooltip>
          )}

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleConnectionMenuClose}
          >
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
              Active Connections
            </Typography>
            
            {Object.entries(allActiveConnections).map(([connId, conn]) => (
              <MenuItem 
                key={connId} 
                onClick={() => handleFocusConnection(connId)}
                selected={connId === currentConnectionId}
              >
                <StorageIcon fontSize="small" sx={{ mr: 1, color: connId === currentConnectionId ? 'primary.main' : 'text.secondary' }} />
                {conn.connectionName || 'Unnamed Connection'}
                {connId === currentConnectionId && ' (current)'}
              </MenuItem>
            ))}
            
            <Box sx={{ borderTop: 1, borderColor: 'divider', my: 1 }} />
            
            {currentConnectionId && (
              <MenuItem onClick={handleDisconnect}>
                <PowerOffIcon fontSize="small" sx={{ mr: 1 }} />
                Disconnect Current
              </MenuItem>
            )}
            
            {activeConnectionsCount > 1 && (
              <MenuItem onClick={handleDisconnectAll}>
                <PowerOffIcon fontSize="small" sx={{ mr: 1 }} />
                Disconnect All
              </MenuItem>
            )}
          </Menu>
          
          {currentConnection && (
            <Chip 
              label={currentConnection.connectionName || 'Unnamed Connection'} 
              size="small" 
              color="primary" 
              sx={{ mr: 2 }}
            />
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