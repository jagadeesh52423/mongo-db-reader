import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import dynamic from 'next/dynamic';

// Import components using the correct pattern for dynamic imports
const Header = dynamic(() => import('../components/Header'), { ssr: false });
const Sidebar = dynamic(() => import('../components/Sidebar'), { ssr: false });
const TabPanel = dynamic(() => import('../components/TabPanel'), { ssr: false });
const ServerStatusBar = dynamic(() => import('../components/ServerStatusBar'), { ssr: false });

// Fix the ConnectionProvider import to ensure we're getting a valid React component
const ConnectionProvider = dynamic(
  () => import('../contexts/ConnectionContext').then(mod => {
    // Make sure we return the actual component, not just an object
    return { default: mod.ConnectionProvider };
  }),
  { ssr: false }
);

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <CssBaseline />
        {/* We'll create a simpler structure until we resolve the connection provider issues */}
        <ConnectionProvider>
          <Box sx={{ display: 'flex', flexGrow: 1 }}>
            <Header handleDrawerToggle={handleDrawerToggle} />
            <Sidebar 
              mobileOpen={mobileOpen} 
              handleDrawerToggle={handleDrawerToggle} 
            />
            <Box
              component="main"
              sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - 240px)` } }}
            >
              <Box sx={{ height: 64 }} /> {/* Toolbar offset */}
              <ServerStatusBar />
              <TabPanel />
            </Box>
          </Box>
        </ConnectionProvider>
      </Box>
    </ThemeProvider>
  );
}
