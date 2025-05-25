import React, { useContext } from 'react';
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
  alpha
} from '@mui/material';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'; // Changed
import { ConnectionContext } from '../contexts/ConnectionContext';

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const { connections, connectToDatabase, activeConnection, loading } = useContext(ConnectionContext);

  const handleConnectionClick = async (connectionId) => {
    await connectToDatabase(connectionId);
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
              <ListItem key={connection._id} disablePadding>
                <ListItemButton
                  onClick={() => handleConnectionClick(connection._id)}
                  selected={activeConnection && activeConnection._id === connection._id}
                  sx={(theme) => ({
                    // Apply transition to background-color and color (for text and icons)
                    transition: theme.transitions.create(['background-color', 'color'], {
                      duration: theme.transitions.duration.short,
                    }),
                    // Default state for icon (text already defaults to text.primary)
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.text.secondary,
                    },
                    // Hover state for non-selected items
                    '&:not(.Mui-selected):hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12), // Subtle cyan hover
                      color: theme.palette.primary.light, // Lighter text on hover
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main, // Icon becomes primary color
                      },
                    },
                    // Selected state
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.25),
                      color: theme.palette.primary.main, // Text color becomes primary
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main, // Icon color becomes primary
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.35),
                      },
                    },
                  })}
                >
                  <ListItemIcon> {/* sx removed, controlled by ListItemButton sx */}
                    <StorageOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText primary={connection.name} /> {/* sx removed, controlled by ListItemButton sx */}
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
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
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            bgcolor: 'background.paper', // Explicitly set background
          },
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            bgcolor: 'background.paper', // Explicitly set background
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
