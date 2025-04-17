import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const ConnectionContext = createContext();

export const ConnectionProvider = ({ children }) => {
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [activeDatabase, setActiveDatabase] = useState(null);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch saved connections on component mount
  useEffect(() => {
    fetchConnections();
  }, []);

  // Fetch collections when active database changes
  useEffect(() => {
    if (activeConnection && activeDatabase) {
      fetchCollections(activeConnection._id, activeDatabase);
    }
  }, [activeConnection, activeDatabase]);

  const fetchConnections = async () => {
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

  const testConnection = async (connectionData) => {
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

  const fetchCollections = async (connectionId, dbName) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/databases/${connectionId}/${dbName}/collections`);
      setCollections(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch collections');
      setLoading(false);
    }
  };

  const executeQuery = async (queryData, type) => {
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
        fetchConnections,
        testConnection,
        saveConnection,
        connectToDatabase,
        setActiveDatabase,
        setActiveCollection,
        executeQuery,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};
