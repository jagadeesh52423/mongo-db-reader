import * as React from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TabPanel from './components/TabPanel';
import { ConnectionProvider } from './contexts/ConnectionContext';

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

function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <ConnectionProvider>
        <Box sx={{ display: 'flex' }}>
          <CssBaseline />
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
            <TabPanel />
          </Box>
        </Box>
      </ConnectionProvider>
    </ThemeProvider>
  );
}

export default App;
