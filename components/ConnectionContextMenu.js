import React, { useState, useContext } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { ConnectionContext } from '../contexts/ConnectionContext';

const ConnectionContextMenu = ({ 
  connection, 
  anchorEl, 
  open, 
  handleClose, 
  handleEdit 
}) => {
  const { deleteConnection } = useContext(ConnectionContext);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the connection "${connection.name}"?`)) {
      const result = await deleteConnection(connection._id);
      if (!result.success) {
        alert(`Failed to delete connection: ${result.message}`);
      }
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