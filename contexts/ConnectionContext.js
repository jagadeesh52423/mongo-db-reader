import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Define the API base URL to point to the backend server
const API_BASE_URL = 'http://localhost:5001';

// Define a key for localStorage
const CONNECTIONS_STORAGE_KEY = 'mongo-reader-connections';

const ConnectionContext = createContext();

const ConnectionProvider = ({ children }) => {
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [activeDatabase, setActiveDatabase] = useState(null);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');

  // Check if the server is running when the component mounts
  useEffect(() => {
    checkServerStatus();
    // Load connections from localStorage on mount
    loadConnectionsFromLocalStorage();
  }, []);

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

  // Check server status
  const checkServerStatus = async () => {
    try {
      setServerStatus('checking');
      // First try the health endpoint, which should be the fastest response
      await axios.get(`${API_BASE_URL}/api/health`, { timeout: 3000 });
      setServerStatus('connected');
      // We don't need to fetch connections from server anymore
      // fetchConnections();
    } catch (err) {
      console.error('Server connection error:', err);
      setServerStatus('disconnected');
      setError('Cannot connect to the server. Please make sure the server is running.');
    }
  };

  // Fetch saved connections (not used anymore, but kept for reference)
  // const fetchConnections = async () => {
  //   if (serverStatus !== 'connected') return;
  //   
  //   setLoading(true);
  //   try {
  //     const response = await axios.get(`${API_BASE_URL}/api/connections`);
  //     setConnections(response.data);
  //     setLoading(false);
  //   } catch (err) {
  //     setError('Failed to fetch connections');
  //     setLoading(false);
  //   }
  // };

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
    // Don't require server connection for saving to localStorage
    // if (serverStatus !== 'connected') {
    //   return { success: false, message: 'Server is not running. Please start the server first.' };
    // }
    
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

  const connectToDatabase = async (connectionId) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    setLoading(true);
    try {
      const connection = connections.find(conn => conn._id === connectionId);
      if (!connection) {
        throw new Error(`Connection with ID ${connectionId} not found`);
      }
      
      // Pass the entire connection data to the server
      const response = await axios.post(`${API_BASE_URL}/api/connections/test`, {
        uri: connection.uri,
        authType: connection.authType,
        username: connection.username,
        password: connection.password,
        awsAccessKey: connection.awsAccessKey,
        awsSecretKey: connection.awsSecretKey,
        awsSessionToken: connection.awsSessionToken,
        awsRegion: connection.awsRegion
      });
      
      // If test was successful, now connect and get databases
      const dbResponse = await axios.post(`${API_BASE_URL}/api/databases/list`, {
        uri: connection.uri,
        authType: connection.authType,
        username: connection.username,
        password: connection.password,
        awsAccessKey: connection.awsAccessKey,
        awsSecretKey: connection.awsSecretKey,
        awsSessionToken: connection.awsSessionToken,
        awsRegion: connection.awsRegion
      });
      
      setActiveConnection(connection);
      setDatabases(dbResponse.data.databases || []);
      
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
    if (activeConnection && activeDatabase) {
      console.log(`Fetching collections for database: ${activeDatabase}`);
      fetchCollections(activeConnection._id, activeDatabase);
    } else {
      // Clear collections when no database is selected
      setCollections([]);
    }
  }, [activeConnection, activeDatabase]);

  const fetchCollections = async (connectionId, dbName) => {
    if (serverStatus !== 'connected') return;
    
    setLoading(true);
    try {
      const connection = connections.find(conn => conn._id === connectionId);
      if (!connection) {
        throw new Error(`Connection with ID ${connectionId} not found`);
      }
      
      // Use the API to fetch collections, passing the connection details directly
      const response = await axios.post(`${API_BASE_URL}/api/databases/collections`, {
        uri: connection.uri,
        authType: connection.authType,
        username: connection.username,
        password: connection.password,
        awsAccessKey: connection.awsAccessKey,
        awsSecretKey: connection.awsSecretKey,
        awsSessionToken: connection.awsSessionToken,
        awsRegion: connection.awsRegion,
        database: dbName
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

  const executeQuery = async (queryData, type) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    if (!activeConnection || !activeDatabase || !activeCollection) {
      return { success: false, message: 'No active connection, database or collection selected' };
    }
    
    setLoading(true);
    try {
      // Pass connection details directly to the query endpoint
      const response = await axios.post(
        `${API_BASE_URL}/api/queries/execute`,
        { 
          connectionDetails: {
            uri: activeConnection.uri,
            authType: activeConnection.authType,
            username: activeConnection.username,
            password: activeConnection.password,
            awsAccessKey: activeConnection.awsAccessKey,
            awsSecretKey: activeConnection.awsSecretKey,
            awsSessionToken: activeConnection.awsSessionToken,
            awsRegion: activeConnection.awsRegion
          },
          database: activeDatabase,
          collection: activeCollection,
          query: queryData,
          type
        }
      );
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  // Add a fetchConnections function for compatibility with the existing components
  const fetchConnections = () => {
    // Just load connections from localStorage
    loadConnectionsFromLocalStorage();
    return { success: true };
  };

  return (
    <ConnectionContext.Provider
      value={{
        connections,
        activeConnection,
        databases,
        activeDatabase,
        collections,
        activeCollection,
        loading,
        error,
        serverStatus,
        fetchConnections,
        testConnection,
        saveConnection,
        connectToDatabase,
        setActiveDatabase,
        setActiveCollection,
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