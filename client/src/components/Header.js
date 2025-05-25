import React, { useState, useContext } from 'react';
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
  InputLabel
} from '@mui/material';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'; // Changed
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'; // Changed
import { ConnectionContext } from '../contexts/ConnectionContext';
import ConnectionDialog from './ConnectionDialog';

const Header = ({ handleDrawerToggle }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const { 
    activeConnection, 
    databases, 
    activeDatabase, 
    collections, 
    activeCollection,
    setActiveDatabase,
    setActiveCollection
  } = useContext(ConnectionContext);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleDatabaseChange = (event) => {
    setActiveDatabase(event.target.value);
  };

  const handleCollectionChange = (event) => {
    setActiveCollection(event.target.value);
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper', // Use theme's paper color for AppBar background
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit" // Should inherit text.primary due to AppBar's new background
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuOutlinedIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            MongoDB Reader
          </Typography>
          
          {activeConnection && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <FormControl sx={{ minWidth: 120, mr: 2 }} size="small">
                <InputLabel id="database-select-label" sx={{ color: 'text.secondary' }}>Database</InputLabel>
                <Select
                  labelId="database-select-label"
                  id="database-select"
                  value={activeDatabase || ''}
                  label="Database"
                  onChange={handleDatabaseChange}
                  sx={{ color: 'text.primary', '.MuiSvgIcon-root': { color: 'text.secondary' } }}
                  MenuProps={{
                    PaperProps: {
                      sx: { bgcolor: 'background.paper' },
                    },
                  }}
                >
                  {databases.map((db) => (
                    <MenuItem key={db} value={db} sx={{ color: 'text.primary' }}>{db}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {activeDatabase && (
                <FormControl sx={{ minWidth: 120 }} size="small">
                  <InputLabel id="collection-select-label" sx={{ color: 'text.secondary' }}>Collection</InputLabel>
                  <Select
                    labelId="collection-select-label"
                    id="collection-select"
                    value={activeCollection || ''}
                    label="Collection"
                    onChange={handleCollectionChange}
                    sx={{ color: 'text.primary', '.MuiSvgIcon-root': { color: 'text.secondary' } }}
                    MenuProps={{
                      PaperProps: {
                        sx: { bgcolor: 'background.paper' },
                      },
                    }}
                  >
                    {collections.map((collection) => (
                      <MenuItem key={collection} value={collection} sx={{ color: 'text.primary' }}>{collection}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
          
          <Button 
            color="inherit" // Should inherit text.primary
            startIcon={<AddOutlinedIcon />} // Icon will also inherit
            onClick={handleOpenDialog}
            sx={{ color: 'text.primary' }} // Explicitly set for clarity, though inherit should work
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
