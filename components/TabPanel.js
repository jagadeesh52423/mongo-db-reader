import React, { useState, useContext, useEffect } from 'react';
import { Box, Tabs, Tab, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import QueryEditor from './QueryEditor';
import ResultsDisplay from './ResultsDisplay';
import { ConnectionContext, CONNECTION_EVENTS } from '../contexts/ConnectionContext';
import { COLLECTION_EVENTS } from './Sidebar';

const TabPanel = () => {
  const { collections, activeConnection, activeDatabase } = useContext(ConnectionContext);
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
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {tab.title}
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
            />
          ))}
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
          sx={{ py: 2 }}
        >
          {activeTab === index && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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