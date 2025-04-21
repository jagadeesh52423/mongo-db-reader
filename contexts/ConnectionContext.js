import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Define the API base URL to point to the backend server
const API_BASE_URL = 'http://localhost:5001';

// Define keys for localStorage
const CONNECTIONS_STORAGE_KEY = 'mongo-reader-connections';
const ACTIVE_CONNECTIONS_STORAGE_KEY = 'mongo-reader-active-connections';

// Create a custom event for connection status changes
export const CONNECTION_EVENTS = {
  CONNECT: 'connection-connect',
  DISCONNECT: 'connection-disconnect',
  DATABASE_SELECTED: 'database-selected',
  CONNECTION_FOCUSED: 'connection-focused'
};

const ConnectionContext = createContext();

const ConnectionProvider = ({ children }) => {
  const [connections, setConnections] = useState([]);
  // Store multiple active connections instead of just one
  const [activeConnections, setActiveConnections] = useState({});
  // Current selected connection (for UI focus)
  const [currentConnectionId, setCurrentConnectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');

  // Check if the server is running when the component mounts
  useEffect(() => {
    checkServerStatus();
    // Load connections from localStorage on mount (only for display in sidebar)
    loadConnectionsFromLocalStorage();
    // Try to restore active connections if they exist
    restoreActiveConnectionsFromStorage();
  }, []);

  // Update active connections in localStorage whenever they change
  useEffect(() => {
    saveActiveConnectionsToLocalStorage(activeConnections);
    
    // If we don't have a current connection but have active connections,
    // set the first one as current
    if (!currentConnectionId && Object.keys(activeConnections).length > 0) {
      const firstConnectionId = Object.keys(activeConnections)[0];
      setCurrentConnectionId(firstConnectionId);
    }
  }, [activeConnections, currentConnectionId]);

  // Restore active connections from localStorage if available
  const restoreActiveConnectionsFromStorage = async () => {
    try {
      const storedActiveConnections = localStorage.getItem(ACTIVE_CONNECTIONS_STORAGE_KEY);
      if (storedActiveConnections) {
        const parsedActiveConnections = JSON.parse(storedActiveConnections);
        
        const validConnections = {};
        let latestTimestamp = 0;
        let latestConnectionId = null;
        
        // Validate each stored connection with the server
        for (const [connectionId, connectionData] of Object.entries(parsedActiveConnections)) {
          if (connectionData.sessionToken) {
            const result = await validateSessionToken(connectionData.sessionToken);
            if (result.success) {
              validConnections[connectionId] = connectionData;
              
              // Track most recently used connection
              if (connectionData.timestamp > latestTimestamp) {
                latestTimestamp = connectionData.timestamp;
                latestConnectionId = connectionId;
              }
            }
          }
        }
        
        if (Object.keys(validConnections).length > 0) {
          setActiveConnections(validConnections);
          
          // Set the most recently used connection as current
          if (latestConnectionId) {
            setCurrentConnectionId(latestConnectionId);
          }
        }
      }
    } catch (err) {
      console.error('Error restoring active connections:', err);
      localStorage.removeItem(ACTIVE_CONNECTIONS_STORAGE_KEY);
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

  // Load connections from localStorage
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

  // Save active connections to localStorage
  const saveActiveConnectionsToLocalStorage = (activeConnectionsObj) => {
    try {
      localStorage.setItem(ACTIVE_CONNECTIONS_STORAGE_KEY, JSON.stringify(activeConnectionsObj));
    } catch (err) {
      console.error('Error saving active connections to localStorage:', err);
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
      
      // If this is an active connection, update the display name
      if (activeConnections[connectionId]) {
        setActiveConnections(prev => ({
          ...prev,
          [connectionId]: {
            ...prev[connectionId],
            connectionName: updatedData.name || prev[connectionId].connectionName
          }
        }));
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
      
      // If this is an active connection, disconnect it
      if (activeConnections[connectionId]) {
        await disconnectDatabase(connectionId);
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to delete connection: ' + err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  // Fetch databases for a connection
  const fetchDatabasesByToken = async (connectionId) => {
    if (!activeConnections[connectionId] || !activeConnections[connectionId].sessionToken || serverStatus !== 'connected') return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/databases/list-by-token`, {
        sessionToken: activeConnections[connectionId].sessionToken
      });
      
      // Update the connection's database list
      const updatedActiveConnections = {
        ...activeConnections,
        [connectionId]: {
          ...activeConnections[connectionId],
          databases: response.data.databases || []
        }
      };
      
      setActiveConnections(updatedActiveConnections);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching databases:', err);
      setError('Failed to fetch databases: ' + err.message);
      setLoading(false);
    }
  };

  // Focus on a specific connection
  const focusConnection = (connectionId) => {
    if (!activeConnections[connectionId]) {
      console.error(`Cannot focus on connection ${connectionId}: not active`);
      return;
    }
    
    // Update timestamp to mark this as the most recently used connection
    setActiveConnections(prev => ({
      ...prev,
      [connectionId]: {
        ...prev[connectionId],
        timestamp: Date.now()
      }
    }));
    
    // Set as current connection
    setCurrentConnectionId(connectionId);
    
    // Dispatch focus event
    const event = new CustomEvent(CONNECTION_EVENTS.CONNECTION_FOCUSED, {
      detail: { connectionId }
    });
    window.dispatchEvent(event);
  };

  const connectToDatabase = async (connectionId) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    // Check if already connected
    if (activeConnections[connectionId]) {
      // Just set as current connection and return
      focusConnection(connectionId);
      return { success: true, reused: true };
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
            authSource: connection.authSource || 'admin',
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
      
      // Add to active connections
      const timestamp = Date.now();
      const newActiveConnection = {
        connectionId,
        connectionName: connection.name,
        sessionToken: response.data.sessionToken,
        databases: response.data.databases || [],
        activeDatabase: null,
        collections: [],
        timestamp
      };
      
      // Update state with the new active connection
      setActiveConnections(prev => ({
        ...prev,
        [connectionId]: newActiveConnection
      }));
      
      // Set this as the current connection
      setCurrentConnectionId(connectionId);
      
      // Update last used timestamp in connections list
      const updatedConnections = connections.map(conn => {
        if (conn._id === connectionId) {
          return { ...conn, lastUsed: new Date().toISOString() };
        }
        return conn;
      });
      
      setConnections(updatedConnections);
      saveConnectionsToLocalStorage(updatedConnections);
      
      // Dispatch connect event for other components to react
      const event = new CustomEvent(CONNECTION_EVENTS.CONNECT, {
        detail: { connectionId, databases: response.data.databases || [] }
      });
      window.dispatchEvent(event);
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to connect to database: ' + (err.response?.data?.error || err.message));
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  // Set active database for a connection
  const setActiveDatabase = (database, connectionId = null) => {
    // Use current connection if not specified
    const targetConnectionId = connectionId || currentConnectionId;
    
    if (!targetConnectionId || !activeConnections[targetConnectionId]) {
      console.error('Cannot set active database: No active connection selected');
      return;
    }
    
    // Update the active database for this connection
    setActiveConnections(prev => ({
      ...prev,
      [targetConnectionId]: {
        ...prev[targetConnectionId],
        activeDatabase: database,
        collections: [], // Reset collections
        timestamp: Date.now() // Update timestamp
      }
    }));
    
    // If this connection is in focus, also update collections
    if (targetConnectionId === currentConnectionId) {
      fetchCollectionsByToken(targetConnectionId, database);
    }
    
    // Dispatch event for database selection
    const event = new CustomEvent(CONNECTION_EVENTS.DATABASE_SELECTED, {
      detail: { connectionId: targetConnectionId, database }
    });
    window.dispatchEvent(event);
  };

  // Fetch collections for a connection and database
  const fetchCollectionsByToken = async (connectionId, database) => {
    if (!connectionId) connectionId = currentConnectionId;
    if (!connectionId) return [];
    
    if (!activeConnections[connectionId] || !activeConnections[connectionId].sessionToken || serverStatus !== 'connected') {
      console.error('Cannot fetch collections: Missing connection or session token');
      return [];
    }
    
    // If database not specified, use the active one
    if (!database) {
      database = activeConnections[connectionId].activeDatabase;
    }
    
    if (!database) {
      console.error('Cannot fetch collections: No database specified');
      return [];
    }
    
    setLoading(true);
    try {
      console.log(`Fetching collections for connection ${connectionId}, database ${database}`);
      const response = await axios.post(`${API_BASE_URL}/api/databases/collections-by-token`, {
        sessionToken: activeConnections[connectionId].sessionToken,
        database: database
      });
      
      console.log(`Collections received for ${database}:`, response.data);
      
      // Update collections for this connection
      setActiveConnections(prev => {
        const updatedConnection = {
          ...prev[connectionId],
          activeDatabase: database,
          collections: response.data || [],
          timestamp: Date.now()
        };
        
        return {
          ...prev,
          [connectionId]: updatedConnection
        };
      });
      
      setLoading(false);
      return response.data || [];
    } catch (err) {
      console.error(`Error fetching collections for ${database}:`, err);
      setError(`Failed to fetch collections: ${err.message}`);
      setLoading(false);
      return [];
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
    
    // Determine which connection to use
    const connectionId = options.connectionId || currentConnectionId;
    
    if (!connectionId) {
      return { success: false, message: 'No connection specified for this query' };
    }
    
    const activeConnection = activeConnections[connectionId];
    
    // If we have an active connection with session token
    if (activeConnection && activeConnection.sessionToken) {
      setLoading(true);
      try {
        // Use session token for the query
        const response = await axios.post(
          `${API_BASE_URL}/api/queries/execute-by-token`,
          { 
            sessionToken: activeConnection.sessionToken,
            database: options.database || activeConnection.activeDatabase,
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
      const dbName = options.database;
      const targetCollection = options.collection;
      
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

  // Disconnect from a specific database
  const disconnectDatabase = async (connectionId = null) => {
    // If no connection ID provided, use the current one
    if (!connectionId) {
      connectionId = currentConnectionId;
    }
    
    if (!connectionId || !activeConnections[connectionId]) {
      return { success: false, message: 'No active connection to disconnect' };
    }
    
    setLoading(true);
    try {
      const connectionData = activeConnections[connectionId];
      
      // If we have a session token, tell the server to clean up
      if (connectionData.sessionToken && serverStatus === 'connected') {
        await axios.post(`${API_BASE_URL}/api/connections/disconnect`, {
          sessionToken: connectionData.sessionToken
        });
      }
      
      // Remove from active connections
      const updatedActiveConnections = { ...activeConnections };
      delete updatedActiveConnections[connectionId];
      
      // Update state
      setActiveConnections(updatedActiveConnections);
      
      // If this was the current connection, set a new current connection or clear it
      if (connectionId === currentConnectionId) {
        const activeConnectionIds = Object.keys(updatedActiveConnections);
        if (activeConnectionIds.length > 0) {
          // Use the most recently used connection
          const mostRecentConnectionId = activeConnectionIds.reduce((mostRecent, connId) => {
            const conn = updatedActiveConnections[connId];
            if (!mostRecent || conn.timestamp > updatedActiveConnections[mostRecent].timestamp) {
              return connId;
            }
            return mostRecent;
          }, null);
          
          setCurrentConnectionId(mostRecentConnectionId);
        } else {
          setCurrentConnectionId(null);
        }
      }
      
      // Dispatch a custom event to notify components that
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

  // Get connection data for UI display
  const getActiveConnectionData = (connectionId = null) => {
    const targetConnectionId = connectionId || currentConnectionId;
    if (!targetConnectionId || !activeConnections[targetConnectionId]) {
      return null;
    }
    
    return activeConnections[targetConnectionId];
  };

  // Get all active connections
  const getAllActiveConnections = () => {
    return activeConnections;
  };

  return (
    <ConnectionContext.Provider
      value={{
        connections,
        activeConnections,
        currentConnectionId,
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
        setCurrentConnectionId,
        focusConnection,
        getActiveConnectionData,
        getAllActiveConnections,
        fetchDatabasesByToken,
        fetchCollectionsByToken,
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