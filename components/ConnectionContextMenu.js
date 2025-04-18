import React, { useState, useContext } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { ConnectionContext } from '../contexts/ConnectionContext';

const ConnectionContextMenu = ({ 
  connection, 
  anchorEl, 
  open, 
  handleClose, 
  handleEdit 
}) => {
  const { deleteConnection, connectToDatabase, disconnectDatabase, activeConnection } = useContext(ConnectionContext);

  const isConnected = activeConnection && activeConnection._id === connection?._id;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the connection "${connection.name}"?`)) {
      const result = await deleteConnection(connection._id);
      if (!result.success) {
        alert(`Failed to delete connection: ${result.message}`);
      }
    }
    handleClose();
  };

  const handleConnect = async () => {
    if (!isConnected) {
      await connectToDatabase(connection._id);
    }
    handleClose();
  };

  const handleDisconnect = async () => {
    if (isConnected) {
      await disconnectDatabase();
    }
    handleClose();
  };

  return (
    <Menu
      id="connection-context-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      MenuListProps={{
        'aria-labelledby': 'connection-context-button',
      }}
    >
      {!isConnected && (
        <MenuItem onClick={handleConnect}>
          <ListItemIcon>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Connect</ListItemText>
        </MenuItem>
      )}
      
      {isConnected && (
        <MenuItem onClick={handleDisconnect}>
          <ListItemIcon>
            <LinkOffIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Disconnect</ListItemText>
        </MenuItem>
      )}
      
      <Divider />
      
      <MenuItem onClick={() => { handleEdit(connection); handleClose(); }}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleDelete}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default ConnectionContextMenu;