import React, { useState, useContext, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  Toolbar,
  useMediaQuery
} from '@mui/material';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TabPanel from '../components/TabPanel';
import ServerStatusBar from '../components/ServerStatusBar';
import { ConnectionContext } from '../contexts/ConnectionContext';

const drawerWidth = 240;

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
        
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          {/* Mobile drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth 
              },
            }}
          >
            <Toolbar />
            <Sidebar />
          </Drawer>
          
          {/* Desktop drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                height: '100%',
                overflow: 'hidden'
              },
            }}
            open
          >
            <Toolbar />
            <Box sx={{ height: 'calc(100% - 64px)', overflow: 'auto' }}>
              <Sidebar />
            </Box>
          </Drawer>
        </Box>
        
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            width: { sm: `calc(100% - ${drawerWidth}px)` },
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
