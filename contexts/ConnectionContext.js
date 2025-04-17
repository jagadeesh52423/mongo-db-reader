import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

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
  }, []);

  // Check server status
  const checkServerStatus = async () => {
    try {
      setServerStatus('checking');
      // First try the health endpoint, which should be the fastest response
      await axios.get('/api/health', { timeout: 3000 });
      setServerStatus('connected');
      fetchConnections();
    } catch (err) {
      console.error('Server connection error:', err);
      setServerStatus('disconnected');
      setError('Cannot connect to the server. Please make sure the server is running.');
    }
  };

  // Fetch saved connections on component mount
  const fetchConnections = async () => {
    if (serverStatus !== 'connected') return;
    
    setLoading(true);
    try {
      const response = await axios.get('/api/connections');
      setConnections(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch connections');
      setLoading(false);
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
      const response = await axios.post('/api/connections/test', connectionData);
      setLoading(false);
      return { success: true, message: response.data.message };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  const saveConnection = async (connectionData) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/api/connections', connectionData);
      setConnections([...connections, response.data]);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to save connection');
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
  };

  const connectToDatabase = async (connectionId) => {
    if (serverStatus !== 'connected') {
      return { success: false, message: 'Server is not running. Please start the server first.' };
    }
    
    setLoading(true);
    try {
      const connection = connections.find(conn => conn._id === connectionId);
      const response = await axios.post(`/api/connections/connect/${connectionId}`);
      
      setActiveConnection(connection);
      setDatabases(response.data.databases);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError('Failed to connect to database');
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
    
    console.log(`API call to fetch collections: /api/databases/${connectionId}/${dbName}/collections`);
    setLoading(true);
    try {
      const response = await axios.get(`/api/databases/${connectionId}/${dbName}/collections`);
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
      const response = await axios.post(
        `/api/queries/${activeConnection._id}/${activeDatabase}/${activeCollection}`,
        { ...queryData, type }
      );
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.response?.data?.error || err.message };
    }
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