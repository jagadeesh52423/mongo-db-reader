import React, { useContext, useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Toolbar,
  Typography,
  CircularProgress,
  Badge,
  Collapse
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DatabaseIcon from '@mui/icons-material/Storage';
import CollectionIcon from '@mui/icons-material/TableView';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ConnectionContext } from '../contexts/ConnectionContext';
import ConnectionContextMenu from './ConnectionContextMenu';
import ConnectionDialog from './ConnectionDialog';

// Define a custom event for opening a collection in a tab
export const COLLECTION_EVENTS = {
  OPEN_COLLECTION: 'open-collection'
};

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const { 
    connections, 
    connectToDatabase, 
    activeConnection, 
    activeDatabase,
    setActiveDatabase,
    databases,
    collections,
    loading 
  } = useContext(ConnectionContext);
  
  const [contextMenu, setContextMenu] = useState({ anchorEl: null, connection: null });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState(null);
  
  // State to track expanded connections and databases
  const [expandedConnections, setExpandedConnections] = useState({});
  const [expandedDatabases, setExpandedDatabases] = useState({});

  const handleConnectionClick = async (connectionId) => {
    // Toggle expanded state
    setExpandedConnections(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
    
    // If not already connected, connect to the database
    if (!activeConnection || activeConnection._id !== connectionId) {
      await connectToDatabase(connectionId);
    }
  };

  const handleDatabaseClick = (dbName) => {
    // Toggle expanded state for this database
    setExpandedDatabases(prev => ({
      ...prev,
      [dbName]: !prev[dbName]
    }));
    
    // Set active database
    setActiveDatabase(dbName);
  };

  const handleCollectionClick = (collectionName, event) => {
    // Single click does nothing
  };

  const handleCollectionDoubleClick = (collectionName) => {
    // Dispatch a custom event to inform TabPanel to open a new tab with default query
    const event = new CustomEvent(COLLECTION_EVENTS.OPEN_COLLECTION, {
      detail: { 
        collection: collectionName,
        connectionId: activeConnection?._id,
        database: activeDatabase
      }
    });
    window.dispatchEvent(event);
  };

  const handleContextMenu = (event, connection) => {
    event.preventDefault();
    // Set the anchorEl directly to the currentTarget element
    setContextMenu({
      anchorEl: event.currentTarget,
      connection
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ anchorEl: null, connection: null });
  };

  const handleEditConnection = (connection) => {
    setConnectionToEdit(connection);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setConnectionToEdit(null);
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <Typography variant="subtitle2" sx={{ p: 2, color: 'text.secondary' }}>
        Saved Connections
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List>
          {connections.length === 0 ? (
            <ListItem>
              <ListItemText primary="No connections yet" secondary="Add a new connection to get started" />
            </ListItem>
          ) : (
            connections.map((connection) => {
              const isActive = activeConnection && activeConnection._id === connection._id;
              const isExpanded = expandedConnections[connection._id];
              
              return (
                <React.Fragment key={connection._id}>
                  <ListItem 
                    disablePadding
                    onContextMenu={(e) => handleContextMenu(e, connection)}
                  >
                    <ListItemButton 
                      onClick={() => handleConnectionClick(connection._id)}
                      selected={isActive}
                      sx={{
                        position: 'relative',
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
                      <ListItemIcon>
                        {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </ListItemIcon>
                      <ListItemIcon>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <FiberManualRecordIcon 
                              sx={{ 
                                fontSize: 10, 
                                color: isActive ? 'success.main' : 'text.disabled'
                              }} 
                            />
                          }
                        >
                          <StorageIcon color={isActive ? 'primary' : 'action'} />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText 
                        primary={connection.name} 
                        secondary={isActive ? 'Connected' : 'Disconnected'}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 'bold' : 'normal'
                        }}
                        secondaryTypographyProps={{
                          color: isActive ? 'success.main' : 'text.secondary',
                          fontSize: '0.75rem'
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                  
                  {/* Databases Sublist */}
                  {isActive && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {databases.map((dbName) => {
                          const isDbActive = activeDatabase === dbName;
                          const isDbExpanded = expandedDatabases[dbName];
                          
                          return (
                            <React.Fragment key={dbName}>
                              <ListItemButton 
                                onClick={() => handleDatabaseClick(dbName)}
                                selected={isDbActive}
                                sx={{ pl: 6 }}
                              >
                                <ListItemIcon>
                                  {isDbExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                                </ListItemIcon>
                                <ListItemIcon>
                                  <DatabaseIcon color={isDbActive ? 'primary' : 'action'} fontSize="small" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={dbName}
                                  primaryTypographyProps={{
                                    fontSize: '0.9rem',
                                    fontWeight: isDbActive ? 'bold' : 'normal'
                                  }}
                                />
                              </ListItemButton>
                              
                              {/* Collections Sublist */}
                              {isDbActive && (
                                <Collapse in={isDbExpanded} timeout="auto" unmountOnExit>
                                  <List component="div" disablePadding>
                                    {collections.map((collectionName) => (
                                      <ListItemButton 
                                        key={collectionName} 
                                        sx={{ pl: 9 }}
                                        onClick={(e) => handleCollectionClick(collectionName, e)}
                                        onDoubleClick={() => handleCollectionDoubleClick(collectionName)}
                                      >
                                        <ListItemIcon>
                                          <CollectionIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary={collectionName}
                                          primaryTypographyProps={{
                                            fontSize: '0.8rem'
                                          }}
                                        />
                                      </ListItemButton>
                                    ))}
                                  </List>
                                </Collapse>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </React.Fragment>
              );
            })
          )}
        </List>
      )}

      {/* Context Menu */}
      <ConnectionContextMenu
        connection={contextMenu.connection}
        anchorEl={contextMenu.anchorEl}
        open={Boolean(contextMenu.anchorEl)}
        handleClose={handleCloseContextMenu}
        handleEdit={handleEditConnection}
      />

      {/* Edit Dialog */}
      {connectionToEdit && (
        <ConnectionDialog
          open={editDialogOpen}
          handleClose={handleCloseEditDialog}
          initialData={connectionToEdit}
          isEditing={true}
        />
      )}
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;