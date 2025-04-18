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
  CircularProgress
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import { ConnectionContext } from '../contexts/ConnectionContext';
import ConnectionContextMenu from './ConnectionContextMenu';
import ConnectionDialog from './ConnectionDialog';

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const { connections, connectToDatabase, activeConnection, loading } = useContext(ConnectionContext);
  const [contextMenu, setContextMenu] = useState({ anchorEl: null, connection: null });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState(null);

  const handleConnectionClick = async (connectionId) => {
    await connectToDatabase(connectionId);
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
            connections.map((connection) => (
              <ListItem 
                key={connection._id} 
                disablePadding
                onContextMenu={(e) => handleContextMenu(e, connection)}
              >
                <ListItemButton 
                  onClick={() => handleConnectionClick(connection._id)}
                  selected={activeConnection && activeConnection._id === connection._id}
                >
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText primary={connection.name} />
                </ListItemButton>
              </ListItem>
            ))
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