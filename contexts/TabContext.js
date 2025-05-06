import React, { useState, useEffect } from 'react';

export const TabContext = React.createContext();

export const TabProvider = ({ children }) => {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Make sure existing tabs have the rowLimit property
  useEffect(() => {
    const updatedTabs = tabs.map(tab => {
      if (tab.rowLimit === undefined) {
        return { ...tab, rowLimit: 50 }; // Set default row limit
      }
      return tab;
    });
    
    // Only update if changes were made
    if (JSON.stringify(updatedTabs) !== JSON.stringify(tabs)) {
      setTabs(updatedTabs);
    }
  }, [tabs]);

  const addTab = (tabData = {}) => {
    const newTab = {
      id: Date.now(),
      title: tabData.title || 'Untitled Query',
      query: tabData.query || '',
      results: null,
      rowLimit: tabData.rowLimit || 50, // Default to 50 rows
      // ...other tab properties
    };
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  return (
    <TabContext.Provider value={{ tabs, setTabs, activeTab, setActiveTab, addTab }}>
      {children}
    </TabContext.Provider>
  );
};