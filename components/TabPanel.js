import React, { useState } from 'react';
import { Box, Tabs, Tab, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import QueryEditor from './QueryEditor';
import ResultsDisplay from './ResultsDisplay';

const TabPanel = () => {
  const [tabs, setTabs] = useState([{ id: 1, title: 'Query 1', query: '', results: null }]);
  const [activeTab, setActiveTab] = useState(0);

  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddTab = () => {
    const newTabId = tabs.length > 0 ? Math.max(...tabs.map(tab => tab.id)) + 1 : 1;
    const newTab = { id: newTabId, title: `Query ${newTabId}`, query: '', results: null };
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const handleCloseTab = (event, tabIndex) => {
    event.stopPropagation();
    const newTabs = [...tabs];
    newTabs.splice(tabIndex, 1);
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
                  <IconButton
                    size="small"
                    onClick={(e) => handleCloseTab(e, index)}
                    sx={{ ml: 1 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
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