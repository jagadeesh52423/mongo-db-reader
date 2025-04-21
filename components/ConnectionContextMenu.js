import React, { useContext } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PowerIcon from '@mui/icons-material/Power';
import { ConnectionContext } from '../contexts/ConnectionContext';

const ConnectionContextMenu = ({ x, y, connectionId, isConnected, onClose, hasMultipleActiveConnections }) => {
  const { connectToDatabase, disconnectDatabase, disconnectAllDatabases, deleteConnection, updateConnection, focusConnection, duplicateConnection } = useContext(ConnectionContext);

  const handleConnect = async () => {
    await connectToDatabase(connectionId);
    onClose();
  };

  const handleDisconnect = () => {
    disconnectDatabase(connectionId);
    onClose();
  };

  const handleDisconnectAll = () => {
    disconnectAllDatabases();
    onClose();
  };

  const handleEdit = () => {
    // Trigger the edit connection dialog through a custom event
    window.dispatchEvent(new CustomEvent('edit-connection-dialog', {
      detail: { connectionId }
    }));
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this connection?')) {
      deleteConnection(connectionId);
    }
    onClose();
  };

  const handleDuplicate = () => {
    duplicateConnection(connectionId);
    onClose();
  };

  // Position the menu
  const menuPosition = {
    left: x,
    top: y
  };

  return (
    <Menu
      open={true}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={menuPosition}
    >
      {isConnected ? (
        <MenuItem onClick={handleDisconnect}>
          <ListItemIcon sx={{ minWidth: '30px' }}>
            <PowerSettingsNewIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Disconnect" 
            primaryTypographyProps={{ 
              fontSize: '0.875rem',
              variant: 'body2'
            }} 
          />
        </MenuItem>
      ) : (
        <MenuItem onClick={handleConnect}>
          <ListItemIcon sx={{ minWidth: '30px' }}>
            <PowerIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText 
            primary="Connect" 
            primaryTypographyProps={{ 
              fontSize: '0.875rem',
              variant: 'body2'
            }} 
          />
        </MenuItem>
      )}

      {hasMultipleActiveConnections && isConnected && (
        <MenuItem onClick={handleDisconnectAll}>
          <ListItemIcon sx={{ minWidth: '30px' }}>
            <PowerSettingsNewIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Disconnect All" 
            primaryTypographyProps={{ 
              fontSize: '0.875rem',
              variant: 'body2'
            }} 
          />
        </MenuItem>
      )}

      <Divider />

      <MenuItem onClick={handleEdit}>
        <ListItemIcon sx={{ minWidth: '30px' }}>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText 
          primary="Edit Connection" 
          primaryTypographyProps={{ 
            fontSize: '0.875rem',
            variant: 'body2'
          }} 
        />
      </MenuItem>

      <MenuItem onClick={handleDuplicate}>
        <ListItemIcon sx={{ minWidth: '30px' }}>
          <ContentCopyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText 
          primary="Clone Connection" 
          primaryTypographyProps={{ 
            fontSize: '0.875rem',
            variant: 'body2'
          }} 
        />
      </MenuItem>

      <MenuItem onClick={handleDelete}>
        <ListItemIcon sx={{ minWidth: '30px' }}>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText 
          primary="Delete Connection" 
          primaryTypographyProps={{ 
            fontSize: '0.875rem',
            variant: 'body2'
          }} 
        />
      </MenuItem>
    </Menu>
  );
};

export default ConnectionContextMenu;