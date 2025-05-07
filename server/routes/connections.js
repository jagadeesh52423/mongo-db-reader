const express = require('express');
const { MongoClient } = require('mongodb');
const aws4 = require('aws4');
const { URL } = require('url');
const crypto = require('crypto');
const Connection = require('../models/Connection');

const router = express.Router();

// Add session token storage
global.sessionTokens = {};
// Add storage for local connections that aren't in the database
global.localConnections = {};
// ActiveConnections is now defined in server.js

// Helper function to generate a secure session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Get all saved connections
router.get('/', async (req, res) => {
  try {
    const connections = await Connection.find().select('-password -awsSecretKey -awsSessionToken');
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new connection
router.post('/', async (req, res) => {
  try {
    const connection = new Connection(req.body);
    await connection.save();
    res.status(201).json({ _id: connection._id, name: connection.name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an existing connection
router.put('/:id', async (req, res) => {
  try {
    const connection = await Connection.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true, runValidators: true }
    ).select('-password -awsSecretKey -awsSessionToken');
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json(connection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a connection
router.delete('/:id', async (req, res) => {
  try {
    // Check if the connection is active
    if (global.activeConnections[req.params.id]) {
      // Close the connection first
      await global.activeConnections[req.params.id].close();
      delete global.activeConnections[req.params.id];
      
      // Clean up any session tokens for this connection
      Object.keys(global.sessionTokens).forEach(token => {
        if (global.sessionTokens[token].connectionId === req.params.id) {
          delete global.sessionTokens[token];
        }
      });
    }
    
    // Check if it's a local connection
    if (req.params.id.startsWith('local_')) {
      delete global.localConnections[req.params.id];
      return res.json({ message: 'Connection deleted successfully' });
    }
    
    const connection = await Connection.findByIdAndDelete(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test connection
router.post('/test', async (req, res) => {
  const { uri, authType, username, password, authSource, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion } = req.body;
  
  try {
    let client;
    
    if (authType === 'AWS') {
      // AWS IAM authentication
      const url = new URL(uri);
      const request = {
        host: url.hostname,
        path: url.pathname,
        method: 'GET',
        service: 'mongodb'
      };
      
      const credentials = {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        sessionToken: awsSessionToken,
        region: awsRegion
      };
      
      aws4.sign(request, credentials);
      
      // Create MongoDB client with AWS auth headers
      client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        authMechanism: 'MONGODB-AWS',
        authSource: '$external'
      });
    } else if (authType === 'Basic' || authType === 'Legacy') {
      // SCRAM-SHA-256 or SCRAM-SHA-1 authentication
      const authMechanism = authType === 'Basic' ? 'SCRAM-SHA-256' : 'SCRAM-SHA-1';
      client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        auth: {
          username,
          password
        },
        authMechanism,
        authSource: authSource || 'admin'
      });
    } else {
      // No authentication
      client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    await client.connect();
    await client.close();
    
    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    console.error("Test connection error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Connect to MongoDB and store the connection
router.post('/connect/:id', async (req, res) => {
  try {
    let connection;
    const connectionId = req.params.id;
    
    console.log(`Attempting to connect to MongoDB with connection ID: ${connectionId}`);
    
    // Check if the connection is already active and has a client
    if (global.activeConnections[connectionId]) {
      // Get the existing client
      const existingClient = global.activeConnections[connectionId];
      
      // Ping to verify the connection is still alive
      try {
        await existingClient.db('admin').command({ ping: 1 });
        
        // Connection is still valid, get the list of databases
        const admin = existingClient.db().admin();
        const dbs = await admin.listDatabases();
        
        // Generate a new session token for this connection
        const sessionToken = generateSessionToken();
        global.sessionTokens[sessionToken] = {
          connectionId: connectionId,
          createdAt: new Date()
        };
        
        // Return the existing connection info
        return res.json({ 
          success: true, 
          sessionToken: sessionToken,
          databases: dbs.databases.map(db => db.name),
          reused: true
        });
      } catch (err) {
        console.log("Existing connection is stale, creating a new one:", err.message);
        // Connection is no longer valid, continue to create a new one
        try {
          await existingClient.close();
        } catch (closeErr) {
          // Ignore close errors
        }
        delete global.activeConnections[connectionId];
      }
    }
    
    // Check if it's a local connection
    if (connectionId.startsWith('local_')) {
      // For local connections, we need the connection details in the request body
      if (!req.body || !req.body.connectionDetails) {
        return res.status(400).json({ error: 'Connection details are required for local connections' });
      }
      
      console.log(`Local connection details received: ${JSON.stringify({
        ...req.body.connectionDetails,
        password: req.body.connectionDetails.password ? '***' : undefined, // Hide password in logs
        awsSecretKey: req.body.connectionDetails.awsSecretKey ? '***' : undefined // Hide AWS secret in logs
      })}`);
      
      connection = req.body.connectionDetails;
      // Store the connection details for future use
      global.localConnections[connectionId] = connection;
    } else {
      // For database connections, fetch from MongoDB
      connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
    }
    
    let client;
    
    if (connection.authType === 'AWS') {
      // AWS IAM authentication setup here
      const url = new URL(connection.uri);
      const request = {
        host: url.hostname,
        path: url.pathname,
        method: 'GET',
        service: 'mongodb'
      };
      
      const credentials = {
        accessKeyId: connection.awsAccessKey,
        secretAccessKey: connection.awsSecretKey,
        sessionToken: connection.awsSessionToken,
        region: connection.awsRegion
      };
      
      aws4.sign(request, credentials);
      
      client = new MongoClient(connection.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        authMechanism: 'MONGODB-AWS',
        authSource: '$external'
      });
    } else if (connection.authType === 'Basic' || connection.authType === 'Legacy') {
      const authMechanism = connection.authType === 'Basic' ? 'SCRAM-SHA-256' : 'SCRAM-SHA-1';
      
      // Create the connection options with proper error handling for potentially missing fields
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        authMechanism
      };
      
      // Only add auth if username and password are provided
      if (connection.username && connection.password) {
        connectionOptions.auth = {
          username: connection.username,
          password: connection.password
        };
        
        // Only add authSource if it's defined
        if (connection.authSource) {
          connectionOptions.authSource = connection.authSource;
        } else {
          connectionOptions.authSource = 'admin'; // Default to admin if not specified
        }
      }
      
      console.log(`Connecting with auth mechanism: ${authMechanism}, authSource: ${connectionOptions.authSource || 'not specified'}`);
      
      client = new MongoClient(connection.uri, connectionOptions);
    } else {
      client = new MongoClient(connection.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    console.log(`Attempting to connect to: ${connection.uri.split('@').length > 1 ? connection.uri.split('@')[1] : connection.uri}`);
    
    await client.connect();
    console.log('Connection successful');
    
    // Store the active connection in the global object
    global.activeConnections[connectionId] = client;
    
    // Initialize activity tracking
    if (global.updateConnectionActivity) {
      global.updateConnectionActivity(connectionId);
    } else {
      // Fallback if function isn't available (shouldn't happen)
      global.connectionLastActivity = global.connectionLastActivity || {};
      global.connectionLastActivity[connectionId] = Date.now();
    }
    
    // Update last used timestamp (only for DB connections)
    if (!connectionId.startsWith('local_')) {
      connection.lastUsed = new Date();
      await connection.save();
    }
    
    // Get the list of databases
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    // Generate a session token for this connection
    const sessionToken = generateSessionToken();
    global.sessionTokens[sessionToken] = {
      connectionId: connectionId,
      createdAt: new Date()
    };
    
    // Don't send sensitive information back to the client
    res.json({ 
      success: true, 
      sessionToken: sessionToken,
      databases: dbs.databases.map(db => db.name) 
    });
  } catch (error) {
    console.error("Connection error:", error);
    // Provide more detailed error information in the response
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code
    });
  }
});

// Validate a session token
router.post('/validate-token', (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken || !global.sessionTokens[sessionToken]) {
    return res.status(401).json({ valid: false, error: 'Invalid or expired session token' });
  }
  
  const { connectionId } = global.sessionTokens[sessionToken];
  
  if (!global.activeConnections[connectionId]) {
    // Token exists but connection is gone
    delete global.sessionTokens[sessionToken];
    return res.status(401).json({ valid: false, error: 'Connection no longer active' });
  }
  
  // Session token is valid
  res.json({ valid: true, connectionId });
});

// Disconnect and invalidate session token
router.post('/disconnect', (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken || !global.sessionTokens[sessionToken]) {
    return res.status(400).json({ error: 'Invalid session token' });
  }
  
  const { connectionId } = global.sessionTokens[sessionToken];
  
  // Clean up session token
  delete global.sessionTokens[sessionToken];
  
  // Check if this is the last session token for this connection
  const hasMoreSessions = Object.values(global.sessionTokens).some(
    session => session.connectionId === connectionId
  );
  
  // Only close the connection if there are no more active sessions using it
  if (!hasMoreSessions && global.activeConnections[connectionId]) {
    // Close the connection
    global.activeConnections[connectionId].close()
      .then(() => {
        console.log(`Connection ${connectionId} closed successfully.`);
      })
      .catch(err => {
        console.error(`Error closing connection ${connectionId}:`, err);
      })
      .finally(() => {
        // Clean up all tracking data
        delete global.activeConnections[connectionId];
        delete global.connectionLastActivity[connectionId];
        
        // Clear any timeout for this connection
        if (global.connectionTimeouts && global.connectionTimeouts[connectionId]) {
          clearTimeout(global.connectionTimeouts[connectionId]);
          delete global.connectionTimeouts[connectionId];
        }
      });
  }
  
  res.json({ success: true, message: 'Disconnected successfully' });
});

module.exports = router;
