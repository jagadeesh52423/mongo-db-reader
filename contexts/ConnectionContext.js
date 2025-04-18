import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Define the API base URL to point to the backend server
const API_BASE_URL = 'http://localhost:5001';

// Define keys for localStorage
const CONNECTIONS_STORAGE_KEY = 'mongo-reader-connections';
const SESSION_TOKEN_STORAGE_KEY = 'mongo-reader-session-token';

// Create a custom event for connection status changes
export const CONNECTION_EVENTS = {
  DISCONNECT: 'connection-disconnect'
};

const ConnectionContext = createContext();

const ConnectionProvider = ({ children }) => {
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [activeDatabase, setActiveDatabase] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');

  // Check if the server is running when the component mounts
  useEffect(() => {
    checkServerStatus();
    // Load connections from localStorage on mount (only for display in sidebar)
    loadConnectionsFromLocalStorage();
    // Try to restore session if exists
    restoreSessionFromStorage();
  }, []);

  // Restore session from localStorage if available
  const restoreSessionFromStorage = async () => {
    try {
      const storedToken = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      if (storedToken) {
        const tokenData = JSON.parse(storedToken);
        
        // Validate the token with the server
        const result = await validateSessionToken(tokenData.sessionToken);
        if (result.success) {
          setSessionToken(tokenData.sessionToken);
          
          // Find the connection in local storage by ID
          const storedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
          if (storedConnections) {
            const parsedConnections = JSON.parse(storedConnections);
            const connection = parsedConnections.find(conn => conn._id === tokenData.connectionId);
            if (connection) {
              setActiveConnection({
                _id: connection._id,
                name: connection.name
              });
              
              // Fetch databases using the session token
              fetchDatabasesByToken(tokenData.sessionToken);
              
              // Restore active database if available
              if (tokenData.database) {
                setActiveDatabase(tokenData.database);
              }
            }
          }
        } else {
          // Invalid token, clear it
          localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Error restoring session:', err);
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
  };

  // Validate a session token with the server
  const validateSessionToken = async (token) => {
    if (!token || serverStatus !== 'connected') {
      return { success: false };
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/connections/validate-token`, {
        sessionToken: token
      });
      return { success: true, connectionId: response.data.connectionId };
    } catch (err) {
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  // Load connections from localStorage (only for display in sidebar)
  const loadConnectionsFromLocalStorage = () => {
    try {
      const storedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
      if (storedConnections) {
        setConnections(JSON.parse(storedConnections));
      }
    } catch (err) {
      console.error('Error loading connections from localStorage:', err);
    }
  };

  // Save connections to localStorage
  const saveConnectionsToLocalStorage = (connectionsArray) => {
    try {
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connectionsArray));
    } catch (err) {
      console.error('Error saving connections to localStorage:', err);
    }
  };

  // Check server status
  const checkServerStatus = async () => {
    try {
      setServerStatus('checking');
      await axios.get(`${API_BASE_URL}/api/health`, { timeout: 3000 });
      setServerStatus('connected');
    } catch (err) {
      console.error('Server connection error:', err);
      setServerStatus('disconnected');
      setError('Cannot connect to the server. Please make sure the server is running.');
    }
  };

  // Retry connecting to the server
  const retryConnection = () => {
    checkServerStatus();
  };

  const testConnection = async (connectionData) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/connections/test`, connectionData);
      setLoading(false);
      return { success: true, message: response.data.message };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  const saveConnection = async (connectionData) => {
    setLoading(true);
    try {
      // Generate a unique ID for the connection
      const newConnection = {
        ...connectionData,
        _id: `local_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      // Update state with the new connection
      const updatedConnections = [...connections, newConnection];
      setConnections(updatedConnections);
      
      // Save to localStorage
      saveConnectionsToLocalStorage(updatedConnections);
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to save connection');
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  // Update an existing connection
  const updateConnection = async (connectionId, updatedData) => {
    setLoading(true);
    try {
      // For server connections (if they exist)
      if (serverStatus === 'connected' && !connectionId.startsWith('local_')) {
        const response = await axios.put(`${API_BASE_URL}/api/connections/${connectionId}`, updatedData);
        if (!response.data) {
          throw new Error('Failed to update connection');
        }
      }
      
      // Update in local state and localStorage
      const updatedConnections = connections.map(conn => {
        if (conn._id === connectionId) {
          return { ...conn, ...updatedData, updatedAt: new Date().toISOString() };
        }
        return conn;
      });
      
      setConnections(updatedConnections);
      saveConnectionsToLocalStorage(updatedConnections);
      
      // If this was the active connection, update it
      if (activeConnection && activeConnection._id === connectionId) {
        setActiveConnection(prev => ({ ...prev, ...updatedData }));
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to update connection: ' + err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  // Delete a connection
  const deleteConnection = async (connectionId) => {
    setLoading(true);
    try {
      // For server connections (if they exist)
      if (serverStatus === 'connected' && !connectionId.startsWith('local_')) {
        await axios.delete(`${API_BASE_URL}/api/connections/${connectionId}`);
      }
      
      // Remove from local state
      const updatedConnections = connections.filter(conn => conn._id !== connectionId);
      setConnections(updatedConnections);
      saveConnectionsToLocalStorage(updatedConnections);
      
      // If this was the active connection, clear it and the session
      if (activeConnection && activeConnection._id === connectionId) {
        if (sessionToken) {
          // Properly disconnect from server and invalidate session
          await disconnectDatabase();
        } else {
          // Just clear local state
          setActiveConnection(null);
          setDatabases([]);
          setActiveDatabase(null);
          setCollections([]);
        }
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to delete connection: ' + err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  // Fetch databases using session token
  const fetchDatabasesByToken = async (token) => {
    if (!token || serverStatus !== 'connected') return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/databases/list-by-token`, {
        sessionToken: token
      });
      
      setDatabases(response.data.databases || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching databases:', err);
      setError('Failed to fetch databases: ' + err.message);
      setLoading(false);
    }
  };

  const connectToDatabase = async (connectionId) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    // If we're already connected with a session token, disconnect first
    if (sessionToken) {
      await disconnectDatabase();
    }
    
    setLoading(true);
    try {
      const connection = connections.find(conn => conn._id === connectionId);
      if (!connection) {
        throw new Error(`Connection with ID ${connectionId} not found`);
      }
      
      // Connect to the server and get a session token
      // For local connections, we need to send the connection details
      let response;
      if (connectionId.startsWith('local_')) {
        response = await axios.post(`${API_BASE_URL}/api/connections/connect/${connectionId}`, {
          connectionDetails: {
            uri: connection.uri,
            authType: connection.authType,
            username: connection.username,
            password: connection.password,
            awsAccessKey: connection.awsAccessKey,
            awsSecretKey: connection.awsSecretKey,
            awsSessionToken: connection.awsSessionToken,
            awsRegion: connection.awsRegion
          }
        });
      } else {
        response = await axios.post(`${API_BASE_URL}/api/connections/connect/${connectionId}`);
      }
      
      if (!response.data.sessionToken) {
        throw new Error('Server did not return a session token');
      }
      
      // Store the session token
      const newToken = response.data.sessionToken;
      setSessionToken(newToken);
      
      // Save session info to localStorage for persistence
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, JSON.stringify({
        sessionToken: newToken,
        connectionId: connection._id,
        timestamp: new Date().toISOString()
      }));
      
      // Update state with minimal connection info (no credentials)
      setActiveConnection({
        _id: connection._id,
        name: connection.name
      });
      
      setDatabases(response.data.databases || []);
      
      // Update last used timestamp locally
      const updatedConnections = connections.map(conn => {
        if (conn._id === connectionId) {
          return { ...conn, lastUsed: new Date().toISOString() };
        }
        return conn;
      });
      
      setConnections(updatedConnections);
      saveConnectionsToLocalStorage(updatedConnections);
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to connect to database: ' + (err.response?.data?.error || err.message));
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  // Fetch collections when active database changes
  useEffect(() => {
    if (sessionToken && activeDatabase) {
      console.log(`Fetching collections for database: ${activeDatabase}`);
      fetchCollectionsByToken();
      
      // Update session storage with active database
      const storedSession = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, JSON.stringify({
          ...sessionData,
          database: activeDatabase
        }));
      }
    } else {
      // Clear collections when no database is selected
      setCollections([]);
    }
  }, [sessionToken, activeDatabase]);

  const fetchCollectionsByToken = async () => {
    if (!sessionToken || !activeDatabase || serverStatus !== 'connected') return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/databases/collections-by-token`, {
        sessionToken,
        database: activeDatabase
      });
      
      console.log("Collections fetched:", response.data);
      setCollections(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError(`Failed to fetch collections: ${err.message}`);
      setCollections([]);
      setLoading(false);
    }
  };

  // Legacy function to maintain API compatibility with existing components
  const setActiveCollection = () => {
    console.warn('setActiveCollection is deprecated - collections are now managed per-tab');
  };

  const executeQuery = async (queryData, type, options = {}) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    // Check if we have a session token to use
    if (sessionToken) {
      setLoading(true);
      try {
        // Use session token for the query
        const response = await axios.post(
          `${API_BASE_URL}/api/queries/execute-by-token`,
          { 
            sessionToken,
            database: options.database || activeDatabase,
            collection: options.collection,
            query: queryData,
            type,
            options
          }
        );
        setLoading(false);
        return { success: true, data: response.data };
      } catch (err) {
        setLoading(false);
        return { success: false, message: err.response?.data?.error || err.message };
      }
    } else {
      // Fall back to the old method if no session token
      const connectionId = options.connectionId || (activeConnection && activeConnection._id);
      const dbName = options.database || activeDatabase;
      const targetCollection = options.collection;
      
      if (!connectionId) {
        return { success: false, message: 'No connection specified for this query' };
      }
      
      if (!dbName) {
        return { success: false, message: 'No database specified for this query' };
      }
      
      if (!targetCollection) {
        return { success: false, message: 'No collection specified for this query' };
      }
      
      // Find the connection details
      const connection = connections.find(conn => conn._id === connectionId);
      if (!connection) {
        return { success: false, message: `Connection with ID ${connectionId} not found` };
      }
      
      setLoading(true);
      try {
        // Pass connection details directly to the query endpoint
        const response = await axios.post(
          `${API_BASE_URL}/api/queries/execute`,
          { 
            connectionDetails: {
              uri: connection.uri,
              authType: connection.authType,
              username: connection.username,
              password: connection.password,
              awsAccessKey: connection.awsAccessKey,
              awsSecretKey: connection.awsSecretKey,
              awsSessionToken: connection.awsSessionToken,
              awsRegion: connection.awsRegion
            },
            database: dbName,
            collection: targetCollection,
            query: queryData,
            type,
            options
          }
        );
        setLoading(false);
        return { success: true, data: response.data };
      } catch (err) {
        setLoading(false);
        return { success: false, message: err.response?.data?.error || err.message };
      }
    }
  };

  // Add a fetchConnections function for compatibility with the existing components
  const fetchConnections = () => {
    // Just load connections from localStorage
    loadConnectionsFromLocalStorage();
    return { success: true };
  };

  // Disconnect from the current database
  const disconnectDatabase = async () => {
    if (!activeConnection) {
      return { success: false, message: 'No active connection to disconnect' };
    }
    
    const connectionId = activeConnection._id;
    
    setLoading(true);
    try {
      // If we have a session token, tell the server to clean up
      if (sessionToken && serverStatus === 'connected') {
        await axios.post(`${API_BASE_URL}/api/connections/disconnect`, {
          sessionToken
        });
      }
      
      // Remove session token from localStorage
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      
      // Clear all connection-related state
      setSessionToken(null);
      setActiveConnection(null);
      setDatabases([]);
      setActiveDatabase(null);
      setCollections([]);
      
      // Dispatch a custom event to notify components (like TabPanel) that
      // the connection has been disconnected
      const event = new CustomEvent(CONNECTION_EVENTS.DISCONNECT, {
        detail: { connectionId }
      });
      window.dispatchEvent(event);
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to disconnect: ' + err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  return (
    <ConnectionContext.Provider
      value={{
        connections,
        activeConnection,
        sessionToken,
        databases,
        activeDatabase,
        collections,
        loading,
        error,
        serverStatus,
        fetchConnections,
        testConnection,
        saveConnection,
        updateConnection,
        deleteConnection,
        connectToDatabase,
        disconnectDatabase,
        setActiveDatabase,
        setActiveCollection, // Keep for backward compatibility
        executeQuery,
        retryConnection
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

// Export both the context and the provider
export { ConnectionContext, ConnectionProvider };