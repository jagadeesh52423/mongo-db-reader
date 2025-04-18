const express = require('express');
const { MongoClient } = require('mongodb');
const aws4 = require('aws4');
const { URL } = require('url');
const Connection = require('../models/Connection');

const router = express.Router();

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
  const { uri, authType, username, password, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion } = req.body;
  
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
        authMechanism
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
    res.status(400).json({ success: false, error: error.message });
  }
});

// Connect to MongoDB and store the connection
router.post('/connect/:id', async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    let client;
    
    if (connection.authType === 'AWS') {
      // AWS IAM authentication setup here
      // Similar to test connection
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
      client = new MongoClient(connection.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        auth: {
          username: connection.username,
          password: connection.password
        },
        authMechanism
      });
    } else {
      client = new MongoClient(connection.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    await client.connect();
    
    // Store the active connection in the global object
    global.activeConnections[req.params.id] = client;
    
    // Update last used timestamp
    connection.lastUsed = new Date();
    await connection.save();
    
    // Get the list of databases
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    res.json({ success: true, databases: dbs.databases.map(db => db.name) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
