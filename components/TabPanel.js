import React, { useState, useContext, useEffect } from 'react';
import { Box, Tabs, Tab, IconButton, Tooltip, Chip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import QueryEditor from './QueryEditor';
import ResultsDisplay from './ResultsDisplay';
import { ConnectionContext, CONNECTION_EVENTS } from '../contexts/ConnectionContext';
import { COLLECTION_EVENTS } from './Sidebar';

// Generate a consistent color for a connection
const generateConnectionColor = (connectionId) => {
  // A list of distinct colors that are easily distinguishable
  const colors = [
    '#4caf50', // green
    '#2196f3', // blue
    '#ff9800', // orange
    '#e91e63', // pink
    '#9c27b0', // purple
    '#00bcd4', // cyan
    '#ff5722', // deep orange
    '#673ab7', // deep purple
    '#3f51b5', // indigo
    '#009688', // teal
  ];
  
  // Use the connectionId to pick a consistent color
  if (!connectionId) return colors[0];
  
  // Simple hash function to generate a number from the connectionId string
  const hashCode = connectionId.split('').reduce(
    (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0
  );
  
  return colors[Math.abs(hashCode) % colors.length];
};

const TabPanel = () => {
  const { connections, collections, activeConnection, activeDatabase, activeConnections } = useContext(ConnectionContext);
  const [tabs, setTabs] = useState([{ 
    id: 1, 
    title: 'Query 1', 
    query: '', 
    results: null, 
    connectionId: null, // Track which connection this tab is associated with
    database: null      // Track which database this tab is using
  }]);
  const [activeTab, setActiveTab] = useState(0);

  // Set the connection ID for new tabs when a connection is active
  useEffect(() => {
    if (activeConnection) {
      const updatedTabs = tabs.map(tab => {
        // Only update tabs that don't have a connection ID yet
        if (!tab.connectionId) {
          return { 
            ...tab, 
            connectionId: activeConnection._id,
            database: activeDatabase || tab.database
          };
        }
        return tab;
      });
      setTabs(updatedTabs);
    }
  }, [activeConnection, activeDatabase]);

  // Listen for connection disconnect events
  useEffect(() => {
    const handleDisconnect = (event) => {
      const { connectionId } = event.detail;
      
      // Filter out tabs associated with the disconnected connection
      const remainingTabs = tabs.filter(tab => tab.connectionId !== connectionId);
      
      // If we have no tabs left, create a new empty tab
      if (remainingTabs.length === 0) {
        setTabs([{ 
          id: Date.now(), 
          title: 'Query 1', 
          query: '', 
          results: null, 
          connectionId: null,
          database: null
        }]);
        setActiveTab(0);
      } else {
        setTabs(remainingTabs);
        // Adjust the active tab if necessary
        if (activeTab >= remainingTabs.length) {
          setActiveTab(Math.max(0, remainingTabs.length - 1));
        }
      }
    };

    // Add event listener
    window.addEventListener(CONNECTION_EVENTS.DISCONNECT, handleDisconnect);
    
    // Clean up
    return () => {
      window.removeEventListener(CONNECTION_EVENTS.DISCONNECT, handleDisconnect);
    };
  }, [tabs, activeTab]);

  // Listen for collection open events from the sidebar
  useEffect(() => {
    const handleOpenCollection = (event) => {
      const { collection, connectionId, database } = event.detail;
      
      // Create a new tab with a default query
      const newTabId = tabs.length > 0 ? Math.max(...tabs.map(tab => tab.id)) + 1 : 1;
      const defaultQuery = `db.${collection}.find({})`;
      
      const newTab = {
        id: newTabId,
        title: `${collection}`,
        query: defaultQuery,
        results: null,
        connectionId,
        database
      };
      
      setTabs([...tabs, newTab]);
      setActiveTab(tabs.length); // Set focus to the new tab
    };
    
    window.addEventListener(COLLECTION_EVENTS.OPEN_COLLECTION, handleOpenCollection);
    
    return () => {
      window.removeEventListener(COLLECTION_EVENTS.OPEN_COLLECTION, handleOpenCollection);
    };
  }, [tabs]);

  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddTab = () => {
    const newTabId = tabs.length > 0 ? Math.max(...tabs.map(tab => tab.id)) + 1 : 1;
    const newTab = { 
      id: newTabId, 
      title: `Query ${newTabId}`, 
      query: '', 
      results: null, 
      connectionId: activeConnection ? activeConnection._id : null,
      database: activeDatabase || null
    };
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const handleCloseTab = (event, tabIndex) => {
    event.stopPropagation();
    const newTabs = [...tabs];
    newTabs.splice(tabIndex, 1);
    
    // If we're closing the last tab, create a new empty one
    if (newTabs.length === 0) {
      newTabs.push({ 
        id: Date.now(), 
        title: 'Query 1', 
        query: '', 
        results: null, 
        connectionId: activeConnection ? activeConnection._id : null,
        database: activeDatabase || null
      });
    }
    
    setTabs(newTabs);
    if (activeTab >= tabIndex && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleUpdateQuery = (query) => {
    const newTabs = [...tabs];
    newTabs[activeTab].query = query;
    setTabs(newTabs);
  };

  const handleQueryResult = (results) => {
    const newTabs = [...tabs];
    newTabs[activeTab].results = results;
    setTabs(newTabs);
  };

  const handleCollectionChange = (collection) => {
    const newTabs = [...tabs];
    newTabs[activeTab].selectedCollection = collection;
    setTabs(newTabs);
  };

  // Get connection name from connection ID
  const getConnectionName = (connectionId) => {
    if (!connectionId) return null;
    
    // First check active connections
    if (activeConnections[connectionId]) {
      return activeConnections[connectionId].connectionName || 'Unnamed Connection';
    }
    
    // Then check all connections
    const connection = connections.find(conn => conn._id === connectionId);
    return connection ? (connection.name || 'Unnamed Connection') : null;
  };

  // Check if multiple connections are active
  const hasMultipleActiveConnections = Object.keys(activeConnections).length > 1;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex' }}>
        <Tabs
          value={activeTab}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flexGrow: 1 }}
        >
          {tabs.map((tab, index) => {
            const connectionName = getConnectionName(tab.connectionId);
            const databaseName = tab.database;
            const connectionColor = generateConnectionColor(tab.connectionId);

            return (
              <Tab
                key={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {tab.title}
                    {connectionName && (
                      <Tooltip title={`Connection: ${connectionName}${databaseName ? `, Database: ${databaseName}` : ''}`}>
                        <Chip
                          label={connectionName.split(' ')[0]}
                          size="small"
                          sx={{ 
                            ml: 1, 
                            height: '18px',
                            fontSize: '10px',
                            backgroundColor: connectionColor,
                            color: '#fff',
                            fontWeight: 'bold',
                            maxWidth: '80px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        />
                      </Tooltip>
                    )}
                    {/* Replace IconButton with a clickable Box to avoid button nesting */}
                    <Box
                      component="span"
                      onClick={(e) => handleCloseTab(e, index)}
                      sx={{ 
                        ml: 1,
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'error.main'
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </Box>
                  </Box>
                }
                sx={{
                  borderBottom: tab.connectionId ? `3px solid ${connectionColor}` : 'none',
                  opacity: 1,
                  '&.Mui-selected': {
                    borderBottom: tab.connectionId ? `3px solid ${connectionColor}` : 'none',
                    backgroundColor: tab.connectionId ? `${connectionColor}10` : 'inherit',
                  },
                }}
              />
            );
          })}
        </Tabs>
        <IconButton color="primary" onClick={handleAddTab}>
          <AddIcon />
        </IconButton>
      </Box>
      {tabs.map((tab, index) => (
        <Box
          key={tab.id}
          role="tabpanel"
          hidden={activeTab !== index}
          sx={{ 
            py: 2,
            borderLeft: tab.connectionId ? `4px solid ${generateConnectionColor(tab.connectionId)}` : 'none',
          }}
        >
          {activeTab === index && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
              {tab.connectionId && (
                <Box sx={{ mb: 1, px: 2, display: 'flex', alignItems: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      backgroundColor: generateConnectionColor(tab.connectionId),
                      mr: 1 
                    }} 
                  />
                  <Chip
                    label={`${getConnectionName(tab.connectionId)}${tab.database ? ` | ${tab.database}` : ''}`}
                    size="small"
                    sx={{
                      backgroundColor: `${generateConnectionColor(tab.connectionId)}20`,
                      borderColor: generateConnectionColor(tab.connectionId),
                      color: 'text.primary',
                      fontWeight: 'medium',
                    }}
                    variant="outlined"
                  />
                </Box>
              )}
              <QueryEditor 
                query={tab.query} 
                onUpdateQuery={handleUpdateQuery}
                onQueryResult={handleQueryResult}
                connectionId={tab.connectionId}
                database={tab.database}
              />
              <ResultsDisplay results={tab.results} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default TabPanel;