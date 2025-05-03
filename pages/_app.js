import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import '../styles/globals.css';
import '../styles/TreeView.css';
import { ConnectionProvider } from '../contexts/ConnectionContext';

// Create theme function that adapts to system preferences
function createAppTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#90caf9' : '#1976d2',
      },
      secondary: {
        main: mode === 'dark' ? '#f48fb1' : '#e91e63',
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#f5f5f5',
        paper: mode === 'dark' ? '#1e1e24' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#e0e0e0' : '#333333',
        secondary: mode === 'dark' ? '#aaaaaa' : '#666666',
      }
    },
  });
}

function MyApp({ Component, pageProps }) {
  // State to hold the current theme mode
  const [themeMode, setThemeMode] = useState('dark');
  
  // Listen for system theme preference changes
  useEffect(() => {
    // Check if window is defined (browser environment)
    if (typeof window !== 'undefined') {
      // Check initial preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(prefersDarkMode ? 'dark' : 'light');
      
      // Listen for changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setThemeMode(e.matches ? 'dark' : 'light');
      };
      
      // Add event listener with modern API if available
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, []);

  // Create the theme based on the current mode
  const theme = React.useMemo(() => createAppTheme(themeMode), [themeMode]);

  // Add theme mode as data attribute to body for CSS selectors
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  return (
    <>
      <Head>
        <title>MongoDB Reader</title>
        <meta name="description" content="MongoDB Collection Reader Application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ConnectionProvider>
          <Component {...pageProps} themeMode={themeMode} setThemeMode={setThemeMode} />
        </ConnectionProvider>
      </ThemeProvider>
    </>
  );
}

export default MyApp;
