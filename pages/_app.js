import React from 'react';
import Head from 'next/head';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import '../styles/globals.css';
import '../styles/TreeView.css';
import { ConnectionProvider } from '../contexts/ConnectionContext';

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

function MyApp({ Component, pageProps }) {
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
          <Component {...pageProps} />
        </ConnectionProvider>
      </ThemeProvider>
    </>
  );
}

export default MyApp;
