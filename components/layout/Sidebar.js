import React, { useContext, useState, useEffect } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Divider, Toolbar, Typography, Collapse, Box, Button, IconButton, Tooltip
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DatabaseIcon from '@mui/icons-material/Dns';
import CollectionIcon from '@mui/icons-material/TableView';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { ConnectionContext, CONNECTION_EVENTS } from '../../contexts/ConnectionContext';
import { ConnectionContextMenu } from '../database';

// Define collection events for use in the application
export const COLLECTION_EVENTS = {
  OPEN_COLLECTION: 'collection:open',
};

const drawerWidth = 260;

const Sidebar = ({ mobileOpen, handleDrawerToggle, isCollapsed }) => {
  const {
    connections,
    activeConnections,
    currentConnectionId,
    connectToDatabase,
    getAllActiveConnections,
    fetchDatabasesByToken,
    setActiveDatabase,
    fetchCollectionsByToken,
    focusConnection,
    disconnectDatabase,
    disconnectAllDatabases,
    loading
  } = useContext(ConnectionContext);

  // Add state to track collections loading state per database
  const [collectionsLoading, setCollectionsLoading] = useState({});
  const [contextMenu, setContextMenu] = useState({ 
    isOpen: false, 
    x: 0, 
    y: 0, 
    connectionId: null, 
    isConnected: false 
  });
  
  // Add state for expanded connections and databases
  const [expandedConnections, setExpandedConnections] = useState({});
  const [expandedDatabases, setExpandedDatabases] = useState({});
  
  // Track which databases have already loaded collections
  const [loadedCollections, setLoadedCollections] = useState({});

  // Listen for connection events
  useEffect(() => {
    const handleConnect = (event) => {
      const { connectionId } = event.detail;
      setExpandedConnections(prev => ({ ...prev, [connectionId]: true }));
    };

    const handleDisconnect = (event) => {
      const { connectionId } = event.detail;
      setExpandedConnections(prev => {
        const updated = { ...prev };
        delete updated[connectionId];
        return updated;
      });
    };

    const handleDatabaseSelected = (event) => {
      const { connectionId, database } = event.detail;
      // Expand the database in the sidebar
      setExpandedDatabases(prev => ({ ...prev, [`${connectionId}:${database}`]: true }));
    };

    window.addEventListener(CONNECTION_EVENTS.CONNECT, handleConnect);
    window.addEventListener(CONNECTION_EVENTS.DISCONNECT, handleDisconnect);
    window.addEventListener(CONNECTION_EVENTS.DATABASE_SELECTED, handleDatabaseSelected);

    return () => {
      window.removeEventListener(CONNECTION_EVENTS.CONNECT, handleConnect);
      window.removeEventListener(CONNECTION_EVENTS.DISCONNECT, handleDisconnect);
      window.removeEventListener(CONNECTION_EVENTS.DATABASE_SELECTED, handleDatabaseSelected);
    };
  }, []);

  // Add keyboard shortcut support for switching connections
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+1, Alt+2, etc. for switching between connections
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        const connectionIds = Object.keys(activeConnections);
        
        if (idx < connectionIds.length) {
          focusConnection(connectionIds[idx]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeConnections, focusConnection]);

  // Handle right-click on a connection
  const handleContextMenu = (event, connectionId, isConnected) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      connectionId,
      isConnected
    });
  };

  // Close the context menu
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  // Toggle expanded state for a connection
  const toggleConnection = (connectionId) => {
    setExpandedConnections(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };

  // Handle connecting to a database
  const handleConnect = async (connectionId) => {
    const result = await connectToDatabase(connectionId);
    if (result.success) {
      // Expand the connection in the sidebar
      setExpandedConnections(prev => ({ ...prev, [connectionId]: true }));
    }
  };

  // Handle clicking on a database
  const handleDatabaseClick = async (connectionId, dbName) => {
    const dbKey = `${connectionId}:${dbName}`;
    const isCurrentlyExpanded = expandedDatabases[dbKey];
    
    // Toggle the expanded state if this database is already expanded
    if (isCurrentlyExpanded) {
      setExpandedDatabases(prev => ({
        ...prev,
        [dbKey]: false
      }));
      return;
    }
    
    // Set active database
    setActiveDatabase(dbName, connectionId);
    
    // If we're clicking on a database for a connection that's not currently focused,
    // focus the connection first
    if (connectionId !== currentConnectionId) {
      focusConnection(connectionId);
    }
    
    // Expand the database when clicking on it
    setExpandedDatabases(prev => ({
      ...prev,
      [dbKey]: true
    }));
    
    // Check if we have already loaded collections for this database
    const collectionsKey = `${connectionId}:${dbName}`;
    const hasLoadedCollections = loadedCollections[collectionsKey];
    
    // Only fetch collections if they haven't been loaded before
    if (!hasLoadedCollections) {
      // Mark this database as loading collections
      setCollectionsLoading(prev => ({
        ...prev,
        [collectionsKey]: true
      }));
      
      // Fetch collections for this database
      try {
        await fetchCollectionsByToken(connectionId, dbName);
        
        // Mark collections as loaded for this database
        setLoadedCollections(prev => ({
          ...prev,
          [collectionsKey]: true
        }));
      } catch (error) {
        console.error("Error fetching collections:", error);
      } finally {
        // Clear loading state for this database
        setCollectionsLoading(prev => ({
          ...prev,
          [collectionsKey]: false
        }));
      }
    }
  };

  // Handle collection click - change to double click instead of single click
  const handleCollectionClick = (connectionId, dbName, collection) => {
    // Dispatch event for opening a collection
    window.dispatchEvent(
      new CustomEvent(COLLECTION_EVENTS.OPEN_COLLECTION, {
        detail: {
          connectionId,
          database: dbName,
          collection
        }
      })
    );
  };

  // Get all active connections
  const allActiveConnections = getAllActiveConnections();
  const activeConnectionsArray = Object.entries(allActiveConnections);
  const hasMultipleActiveConnections = activeConnectionsArray.length > 1;

  // Render database and collections
  const renderDatabase = (connectionId, dbName, connectionData) => {
    const dbKey = `${connectionId}:${dbName}`;
    const isDatabaseExpanded = expandedDatabases[dbKey];
    const isActiveDatabase = connectionData.activeDatabase === dbName;
    const isLoadingCollections = collectionsLoading[dbKey];

    return (
      <React.Fragment key={dbKey}>
        <ListItemButton 
          onClick={() => handleDatabaseClick(connectionId, dbName)}
          selected={isActiveDatabase}
          sx={{ 
            pl: 4,
            position: 'relative',
            '&::after': isActiveDatabase ? {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '4px',
              bottom: '4px',
              width: '3px',
              backgroundColor: 'primary.main',
              borderRadius: '0 2px 2px 0',
            } : {}
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {isDatabaseExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </ListItemIcon>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <DatabaseIcon color={isActiveDatabase ? "primary" : "action"} />
          </ListItemIcon>
          <ListItemText 
            primary={dbName}
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: isActiveDatabase ? 'bold' : 'normal',
              noWrap: true,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          />
        </ListItemButton>
        
        <Collapse in={isDatabaseExpanded} timeout="auto" unmountOnExit>
          {isLoadingCollections ? (
            <ListItem sx={{ pl: 8 }}>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <FiberManualRecordIcon sx={{ 
                  fontSize: 10, 
                  color: 'text.disabled', 
                  animation: 'pulse 1.5s infinite ease-in-out',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.4 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.4 },
                  }
                }} />
              </ListItemIcon>
              <ListItemText 
                primary="Loading collections..."
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  color: 'text.secondary'
                }}
              />
            </ListItem>
          ) : (
            dbName === connectionData.activeDatabase && 
            connectionData.collections && 
            Array.isArray(connectionData.collections) && 
            connectionData.collections.length > 0 ? (
              <List 
                component="div" 
                disablePadding
                dense
                sx={{ 
                  maxHeight: connectionData.collections.length > 15 ? '300px' : 'auto',
                  overflow: connectionData.collections.length > 15 ? 'auto' : 'visible',
                  transition: 'max-height 0.3s ease-in-out',
                }}
              >
                {[...connectionData.collections].sort().map(collection => (
                  <ListItemButton 
                    key={`${connectionId}-${dbName}-${collection}`}
                    sx={{ 
                      pl: 8,
                      py: 0.5,
                      borderRadius: '0 4px 4px 0',
                      mx: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                    onDoubleClick={() => handleCollectionClick(connectionId, dbName, collection)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CollectionIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={collection}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        noWrap: true,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <ListItem sx={{ pl: 8 }}>
                <ListItemText 
                  primary="No collections found"
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    color: 'text.secondary'
                  }}
                />
              </ListItem>
            )
          )}
        </Collapse>
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        px: isCollapsed ? 1 : 2,
        flexShrink: 0, // Prevent toolbar from shrinking
        minHeight: '64px'
      }}>
        <img src="/globe.svg" alt="Logo" style={{ width: 24, height: 24, marginRight: isCollapsed ? 0 : 8 }} />
        {!isCollapsed && (
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MongoDB Reader
          </Typography>
        )}
      </Toolbar>

      {/* Scrollable area */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          position: 'relative',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          },
          maxHeight: 'calc(100vh - 128px)', // Subtract header and footer heights
        }}
      >
        {!isCollapsed && (
          <Box sx={{ 
            px: 2, 
            py: 1.5, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: theme => theme.palette.background.paper,
            zIndex: 1,
          }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Connections
            </Typography>
            {hasMultipleActiveConnections && (
              <Tooltip title="Disconnect all connections">
                <Button 
                  size="small" 
                  color="error" 
                  variant="outlined" 
                  onClick={disconnectAllDatabases}
                  startIcon={<PowerSettingsNewIcon fontSize="small" />}
                  sx={{ py: 0.5, fontSize: '0.75rem' }}
                >
                  Disconnect All
                </Button>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Active Connections Section */}
        {activeConnectionsArray.length > 0 && (
          <>
            {!isCollapsed && (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1 }}>
                <FiberManualRecordIcon sx={{ fontSize: 10, color: 'success.main', mr: 0.5 }} />
                <Typography variant="caption" color="text.secondary">
                  Active ({activeConnectionsArray.length})
                </Typography>
              </Box>
            )}
            <List>
              {activeConnectionsArray.map(([connectionId, connectionData], index) => {
                const isActive = connectionId === currentConnectionId;
                const isExpanded = expandedConnections[connectionId];
                
                return (
                  <React.Fragment key={connectionId}>
                    <ListItemButton 
                      selected={isActive}
                      onClick={() => {
                        if (isActive && !isCollapsed) {
                          toggleConnection(connectionId);
                        } else {
                          focusConnection(connectionId);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, connectionId, true)}
                      sx={{
                        position: 'relative',
                        px: isCollapsed ? 1 : 2,
                        '&::after': isActive ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: '4px',
                          backgroundColor: 'primary.main',
                        } : {}
                      }}
                    >
                      {!isCollapsed && (
                        <ListItemIcon>
                          {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                        </ListItemIcon>
                      )}
                      <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 36, mr: isCollapsed ? 0 : 2 }}>
                        <StorageIcon color={isActive ? "primary" : "success"} />
                      </ListItemIcon>
                      {!isCollapsed && (
                        <ListItemText 
                          primary={connectionData.connectionName || 'Unnamed Connection'}
                          secondary={hasMultipleActiveConnections ? `Alt+${index + 1}` : null}
                          primaryTypographyProps={{
                            fontWeight: isActive ? 'bold' : 'normal',
                            noWrap: true,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          secondaryTypographyProps={{
                            fontSize: '0.7rem'
                          }}
                        />
                      )}
                      {!isCollapsed && (
                        <IconButton 
                          size="small" 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectDatabase(connectionId);
                          }}
                          sx={{ 
                            opacity: 0, 
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: '1 !important', color: 'error.main' },
                            '.MuiListItemButton-root:hover &': { opacity: 0.5 }
                          }}
                        >
                          <PowerSettingsNewIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItemButton>
                    
                    {/* Databases List */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List 
                        component="div" 
                        disablePadding
                        sx={{
                          maxHeight: connectionData.databases && connectionData.databases.length > 15 ? '400px' : 'auto',
                          overflow: connectionData.databases && connectionData.databases.length > 15 ? 'auto' : 'visible',
                        }}
                      >
                        {connectionData.databases && connectionData.databases.map(dbName => 
                          renderDatabase(connectionId, dbName, connectionData)
                        )}
                      </List>
                    </Collapse>
                  </React.Fragment>
                );
              })}
            </List>
          </>
        )}
        
        {/* Saved Connections Section */}
        <Divider sx={{ my: 1 }} />
        {connections.filter(conn => !activeConnections[conn._id]).length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1 }}>
              <FiberManualRecordIcon sx={{ fontSize: 10, color: 'text.disabled', mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Saved ({connections.filter(conn => !activeConnections[conn._id]).length})
              </Typography>
            </Box>
            <List>
              {connections.filter(conn => !activeConnections[conn._id]).map(connection => (
                <ListItemButton 
                  key={connection._id}
                  onClick={() => handleConnect(connection._id)}
                  onContextMenu={(e) => handleContextMenu(e, connection._id, false)}
                >
                  <ListItemIcon sx={{ ml: 4 }}>
                    <StorageIcon color="disabled" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={connection.name || 'Unnamed Connection'}
                    primaryTypographyProps={{
                      noWrap: true,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>
      
      {/* Fixed footer section */}
      <Box sx={{ p: isCollapsed ? 1 : 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        {isCollapsed ? (
          <IconButton
            color="primary"
            onClick={() => window.dispatchEvent(new CustomEvent('open-connection-dialog'))}
            sx={{ width: '100%', height: '40px', margin: '0 auto', display: 'flex' }}
          >
            <AddIcon />
          </IconButton>
        ) : (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => window.dispatchEvent(new CustomEvent('open-connection-dialog'))}
          >
            New Connection
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {drawer}
      
      {contextMenu.isOpen && (
        <ConnectionContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          connectionId={contextMenu.connectionId}
          isConnected={contextMenu.isConnected}
          onClose={closeContextMenu}
          hasMultipleActiveConnections={hasMultipleActiveConnections}
        />
      )}
    </>
  );
};

export default Sidebar;