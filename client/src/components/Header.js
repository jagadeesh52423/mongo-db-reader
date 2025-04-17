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
                <FormControl sx={{ minWidth: 120 }} size="small">
                  <InputLabel id="collection-select-label">Collection</InputLabel>
                  <Select
                    labelId="collection-select-label"
                    id="collection-select"
                    value={activeCollection || ''}
                    label="Collection"
                    onChange={handleCollectionChange}
                  >
                    {collections.map((collection) => (
                      <MenuItem key={collection} value={collection}>{collection}</MenuItem>
                    ))}
                  </Select>
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
