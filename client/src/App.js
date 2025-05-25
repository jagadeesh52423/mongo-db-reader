import * as React from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TabPanel from './components/TabPanel';
import { ConnectionProvider } from './contexts/ConnectionContext';

const theme = createTheme({
  palette: {
    mode: 'dark', // Keep dark mode
    primary: {
      main: '#00FFFF', // Accent Color 1 (Cyan)
    },
    secondary: {
      main: '#9F00FF', // Accent Color 2 (Electric Purple)
    },
    error: {
      main: '#FF3B30',
    },
    success: {
      main: '#34C759',
    },
    background: {
      default: '#0A0F1A', // Primary Background
      paper: '#1A202C',   // Secondary Background/Surface
    },
    text: {
      primary: '#E0E0E0',   // Primary Text
      secondary: '#A0A0A0', // Secondary Text
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', // Explicitly state Roboto
    fontFamilyMonospace: '"Fira Code", "Consolas", "Monaco", monospace', // Monospace font
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        code {
          font-family: "Fira Code", "Consolas", "Monaco", monospace;
        }
        pre {
          font-family: "Fira Code", "Consolas", "Monaco", monospace;
        }
      `,
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
