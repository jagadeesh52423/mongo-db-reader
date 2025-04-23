import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  Typography, 
  IconButton, 
  List, 
  ListItemButton, 
  ListItemText, 
  Divider, 
  Accordion, 
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const MongoHelpDrawer = ({ open, onClose }) => {
  const [expanded, setExpanded] = useState('cursor');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 450, p: 2 }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">MongoDB Query Help</Typography>
        <IconButton onClick={onClose}>
          <InfoIcon />
        </IconButton>
      </Box>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        MongoDB Reader supports standard MongoDB shell syntax. Here are some examples and references.
      </Typography>
      
      <Accordion 
        expanded={expanded === 'basic'} 
        onChange={handleChange('basic')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Basic Operations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItemText 
              primary="Find documents"
              secondary="db.collection.find({ field: 'value' })"
            />
            <ListItemText 
              primary="Find one document"
              secondary="db.collection.findOne({ field: 'value' })"
            />
            <ListItemText 
              primary="Insert a document"
              secondary="db.collection.insertOne({ field: 'value' })"
            />
            <ListItemText 
              primary="Insert multiple documents"
              secondary="db.collection.insertMany([{ field: 'value' }, { field: 'value2' }])"
            />
            <ListItemText 
              primary="Update a document"
              secondary="db.collection.updateOne({ field: 'value' }, { $set: { field2: 'newValue' } })"
            />
            <ListItemText 
              primary="Update multiple documents"
              secondary="db.collection.updateMany({ field: 'value' }, { $set: { field2: 'newValue' } })"
            />
            <ListItemText 
              primary="Delete a document"
              secondary="db.collection.deleteOne({ field: 'value' })"
            />
            <ListItemText 
              primary="Delete multiple documents"
              secondary="db.collection.deleteMany({ field: 'value' })"
            />
            <ListItemText 
              primary="Count documents"
              secondary="db.collection.countDocuments({ field: 'value' })"
            />
          </List>
        </AccordionDetails>
      </Accordion>
      
      <Accordion 
        expanded={expanded === 'cursor'} 
        onChange={handleChange('cursor')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Cursor Methods</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Chain these methods to modify your query behavior:
          </Typography>
          <List dense>
            <ListItemText 
              primary="Sort results"
              secondary="db.collection.find().sort({ field: 1 })"
            />
            <ListItemText 
              primary="Limit results"
              secondary="db.collection.find().limit(10)"
            />
            <ListItemText 
              primary="Skip results"
              secondary="db.collection.find().skip(20)"
            />
            <ListItemText 
              primary="Count results"
              secondary="db.collection.find().count()"
            />
            <ListItemText 
              primary="Specify an index to use"
              secondary="db.collection.find().hint({ field: 1 })"
            />
            <ListItemText 
              primary="Add a comment to the query"
              secondary="db.collection.find().comment('My query')"
            />
            <ListItemText 
              primary="Pretty print results"
              secondary="db.collection.find().pretty()"
            />
            <ListItemText 
              primary="Set max time for query execution"
              secondary="db.collection.find().maxTimeMS(1000)"
            />
            <ListItemText 
              primary="Allow disk use for large sort operations"
              secondary="db.collection.find().allowDiskUse()"
            />
            <ListItemText 
              primary="Return documents as array"
              secondary="db.collection.find().toArray()"
            />
            <ListItemText 
              primary="Count with iteration (client-side count)"
              secondary="db.collection.find().itcount()"
            />
          </List>
        </AccordionDetails>
      </Accordion>
      
      <Accordion 
        expanded={expanded === 'aggregation'} 
        onChange={handleChange('aggregation')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Aggregation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItemText 
              primary="Basic aggregation"
              secondary="db.collection.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$category', total: { $sum: 1 } } }])"
            />
            <ListItemText 
              primary="Aggregate with cursor options"
              secondary="db.collection.aggregate([...]).limit(10).comment('My aggregation')"
            />
            <ListItemText 
              primary="Distinct values"
              secondary="db.collection.distinct('field', { status: 'active' })"
            />
          </List>
        </AccordionDetails>
      </Accordion>
      
      <Accordion 
        expanded={expanded === 'operators'} 
        onChange={handleChange('operators')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Query Operators</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItemText 
              primary="Equals"
              secondary="{ field: 'value' } or { field: { $eq: 'value' } }"
            />
            <ListItemText 
              primary="Not equals"
              secondary="{ field: { $ne: 'value' } }"
            />
            <ListItemText 
              primary="Greater than"
              secondary="{ field: { $gt: 10 } }"
            />
            <ListItemText 
              primary="Greater than or equal"
              secondary="{ field: { $gte: 10 } }"
            />
            <ListItemText 
              primary="Less than"
              secondary="{ field: { $lt: 10 } }"
            />
            <ListItemText 
              primary="Less than or equal"
              secondary="{ field: { $lte: 10 } }"
            />
            <ListItemText 
              primary="In array"
              secondary="{ field: { $in: ['value1', 'value2'] } }"
            />
            <ListItemText 
              primary="Not in array"
              secondary="{ field: { $nin: ['value1', 'value2'] } }"
            />
            <ListItemText 
              primary="Regular expression"
              secondary="{ field: { $regex: 'pattern', $options: 'i' } }"
            />
            <ListItemText 
              primary="Logical AND"
              secondary="{ $and: [{ field1: 'value1' }, { field2: 'value2' }] }"
            />
            <ListItemText 
              primary="Logical OR"
              secondary="{ $or: [{ field1: 'value1' }, { field2: 'value2' }] }"
            />
          </List>
        </AccordionDetails>
      </Accordion>
    </Drawer>
  );
};

export default MongoHelpDrawer;