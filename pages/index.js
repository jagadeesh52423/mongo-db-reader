import React, { useState, useContext, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  Toolbar,
  useMediaQuery
} from '@mui/material';
import { Header, TabPanel, ServerStatusBar, ResizableSidebar } from '../components';
import { ConnectionContext } from '../contexts/ConnectionContext';

// Drawer width is now dynamic and controlled by ResizableSidebar component

export default function Home({ themeMode, setThemeMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTablet = useMediaQuery('(max-width:900px)');
  const {
    currentConnectionId,
    activeConnections,
    activeDatabase,
    setActiveDatabase
  } = useContext(ConnectionContext);

  // Close drawer when selecting a connection on mobile
  useEffect(() => {
    if (isTablet) {
      setMobileOpen(false);
    }
  }, [currentConnectionId, isTablet]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <>
      <Head>
        <title>MongoDB Reader</title>
        <meta name="description" content="MongoDB collection reader application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <CssBaseline />
        
        <Header 
          handleDrawerToggle={handleDrawerToggle}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
        />
        
        <Box component="nav" sx={{ flexShrink: { sm: 0 } }}>
          <ResizableSidebar 
            mobileOpen={mobileOpen} 
            handleDrawerToggle={handleDrawerToggle} 
          />
        </Box>
        
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            width: { sm: `calc(100% - 60px)` }, // Minimum width when sidebar is collapsed
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <Toolbar />
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <TabPanel />
          </Box>
          <ServerStatusBar />
        </Box>
      </Box>
    </>
  );
}
