import React, { useState, useContext, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { ConnectionContext } from '../contexts/ConnectionContext';

const ConnectionDialog = ({ open, handleClose, initialData = null, isEditing = false }) => {
  const { testConnection, saveConnection, updateConnection, loading } = useContext(ConnectionContext);
  
  const [formData, setFormData] = useState({
    name: '',
    uri: '',
    authType: 'None',
    username: '',
    password: '',
    awsAccessKey: '',
    awsSecretKey: '',
    awsSessionToken: '',
    awsRegion: '',
  });
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Initialize form with data when editing
  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        name: initialData.name || '',
        uri: initialData.uri || '',
        authType: initialData.authType || 'None',
        username: initialData.username || '',
        password: initialData.password || '',
        awsAccessKey: initialData.awsAccessKey || '',
        awsSecretKey: initialData.awsSecretKey || '',
        awsSessionToken: initialData.awsSessionToken || '',
        awsRegion: initialData.awsRegion || '',
      });
    }
  }, [initialData, isEditing]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleTestConnection = async () => {
    const result = await testConnection(formData);
    
    if (result.success) {
      setFeedback({ type: 'success', message: 'Connection successful!' });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };
  
  const handleSaveConnection = async () => {
    if (!formData.name || !formData.uri) {
      setFeedback({ type: 'error', message: 'Name and URI are required' });
      return;
    }
    
    let result;
    
    if (isEditing && initialData) {
      // Update existing connection
      result = await updateConnection(initialData._id, formData);
    } else {
      // Create new connection
      result = await saveConnection(formData);
    }
    
    if (result.success) {
      setFeedback({ 
        type: 'success', 
        message: isEditing ? 'Connection updated successfully!' : 'Connection saved successfully!' 
      });
      setTimeout(() => {
        handleClose();
        // Only reset form if not editing
        if (!isEditing) {
          setFormData({
            name: '',
            uri: '',
            authType: 'None',
            username: '',
            password: '',
            awsAccessKey: '',
            awsSecretKey: '',
            awsSessionToken: '',
            awsRegion: '',
          });
        }
        setFeedback({ type: '', message: '' });
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };
  
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Edit Connection: ${initialData?.name}` : 'Add New MongoDB Connection'}
      </DialogTitle>
      <DialogContent>
        {feedback.message && (
          <Alert severity={feedback.type} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        )}
        
        <TextField
          margin="dense"
          name="name"
          label="Connection Name"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />
        
        <TextField
          margin="dense"
          name="uri"
          label="MongoDB URI"
          fullWidth
          variant="outlined"
          value={formData.uri}
          onChange={handleChange}
          sx={{ mb: 2 }}
          placeholder="mongodb://localhost:27017/mydb"
        />
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Authentication Type</InputLabel>
          <Select
            name="authType"
            value={formData.authType}
            label="Authentication Type"
            onChange={handleChange}
          >
            <MenuItem value="None">None</MenuItem>
            <MenuItem value="Basic">Basic (SCRAM-SHA-256)</MenuItem>
            <MenuItem value="Legacy">Legacy (SCRAM-SHA-1)</MenuItem>
            <MenuItem value="AWS">AWS IAM</MenuItem>
          </Select>
        </FormControl>
        
        {(formData.authType === 'Basic' || formData.authType === 'Legacy') && (
          <Box sx={{ mb: 2 }}>
            <TextField
              margin="dense"
              name="username"
              label="Username"
              fullWidth
              variant="outlined"
              value={formData.username}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="password"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={formData.password}
              onChange={handleChange}
            />
          </Box>
        )}
        
        {formData.authType === 'AWS' && (
          <Box sx={{ mb: 2 }}>
            <TextField
              margin="dense"
              name="awsAccessKey"
              label="AWS Access Key"
              fullWidth
              variant="outlined"
              value={formData.awsAccessKey}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="awsSecretKey"
              label="AWS Secret Key"
              type="password"
              fullWidth
              variant="outlined"
              value={formData.awsSecretKey}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="awsSessionToken"
              label="AWS Session Token (optional)"
              fullWidth
              variant="outlined"
              value={formData.awsSessionToken}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="awsRegion"
              label="AWS Region"
              fullWidth
              variant="outlined"
              value={formData.awsRegion}
              onChange={handleChange}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleTestConnection} color="secondary" disabled={loading}>
          Test Connection
          {loading && <CircularProgress size={24} sx={{ ml: 1 }} />}
        </Button>
        <Button onClick={handleSaveConnection} color="primary" disabled={loading}>
          {isEditing ? 'Update Connection' : 'Save Connection'}
          {loading && <CircularProgress size={24} sx={{ ml: 1 }} />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectionDialog;