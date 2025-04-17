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
  FormHelperText
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
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
    setActiveCollection,
    loading // Add this to fix the error
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
      console.log(`Collections available:`, collections);
    }
  }, [activeDatabase, collections]);

  const handleDatabaseChange = (event) => {
    const dbName = event.target.value;
    console.log(`Database selected: ${dbName}`);
    setActiveDatabase(dbName);
  };

  const handleCollectionChange = (event) => {
    const collectionName = event.target.value;
    console.log(`Collection selected: ${collectionName}`);
    setActiveCollection(collectionName);
  };

  return (
    <>
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
                >
                  {databases.map((db) => (
                    <MenuItem key={db} value={db}>{db}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {activeDatabase && (
                <FormControl sx={{ minWidth: 120 }} size="small" error={collections.length === 0 && !loading}>
                  <InputLabel id="collection-select-label">Collection</InputLabel>
                  <Select
                    labelId="collection-select-label"
                    id="collection-select"
                    value={activeCollection || ''}
                    label="Collection"
                    onChange={handleCollectionChange}
                    endAdornment={loading && <CircularProgress size={20} sx={{ mr: 2 }} />}
                  >
                    {collections.length > 0 ? (
                      collections.map((collection) => (
                        <MenuItem key={collection} value={collection}>{collection}</MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled value="">
                        No collections found
                      </MenuItem>
                    )}
                  </Select>
                  {collections.length === 0 && !loading && (
                    <FormHelperText>No collections found in this database</FormHelperText>
                  )}
                </FormControl>
              )}
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