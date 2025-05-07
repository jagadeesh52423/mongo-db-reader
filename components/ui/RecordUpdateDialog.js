import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StableMongoEditor from '../editor/StableMongoEditor';

/**
 * Dialog component for updating MongoDB records
 */
const RecordUpdateDialog = ({ 
  open, 
  onClose, 
  record,
  recordId,
  onUpdate,
  loading
}) => {
  const [recordJson, setRecordJson] = useState('');
  const [error, setError] = useState('');
  const editorRef = useRef(null);
  
  // Initialize editor content when record changes
  useEffect(() => {
    if (record) {
      try {
        // Format the record as pretty JSON
        setRecordJson(JSON.stringify(record, null, 2));
      } catch (err) {
        setError('Error parsing record: ' + err.message);
      }
    }
    
    // Focus the editor after a short delay to ensure it's fully rendered
    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [record]);

  // Handle update button click
  const handleUpdate = () => {
    try {
      // Get updated record from editor
      const updatedJson = editorRef.current?.getText() || recordJson;
      const updatedRecord = JSON.parse(updatedJson);
      
      // Call the onUpdate handler with the updated record
      onUpdate(updatedRecord);
    } catch (err) {
      setError('Invalid JSON: ' + err.message);
    }
  };

  // ID field is a special case as MongoDB doesn't allow updating it
  const hasIdField = record && (record._id || record.id);
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="record-update-dialog-title"
    >
      <DialogTitle id="record-update-dialog-title">
        <Box display="flex" alignItems="center">
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Update Record
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {hasIdField && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Record ID: <Typography component="span" fontFamily="monospace">{recordId}</Typography>
            </Typography>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <StableMongoEditor
          ref={editorRef}
          value={recordJson}
          onChange={setRecordJson}
          height="400px"
        />
        
        {hasIdField && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Note: The _id field cannot be modified
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpdate} 
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Update Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecordUpdateDialog;