const express = require('express');
const { MongoClient } = require('mongodb');
const aws4 = require('aws4');
const { URL } = require('url');
const router = express.Router();

// Middleware to validate session token and get connection
const validateSession = (req, res, next) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken || !global.sessionTokens[sessionToken]) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
  
  const { connectionId } = global.sessionTokens[sessionToken];
  
  if (!global.activeConnections[connectionId]) {
    // Token exists but connection is gone
    delete global.sessionTokens[sessionToken];
    return res.status(401).json({ error: 'Connection no longer active' });
  }
  
  // Add connectionId to request for use in route handlers
  req.connectionId = connectionId;
  next();
};

// New endpoint: List databases using session token
router.post('/list-by-token', validateSession, async (req, res) => {
  try {
    const { connectionId } = req;
    const client = global.activeConnections[connectionId];
    
    // Get the list of databases
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    res.json({ success: true, databases: dbs.databases.map(db => db.name) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: List collections using session token
router.post('/collections-by-token', validateSession, async (req, res) => {
  try {
    const { connectionId } = req;
    const { database } = req.body;
    
    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }
    
    const client = global.activeConnections[connectionId];
    
    // Get the list of collections
    const db = client.db(database);
    const collections = await db.listCollections().toArray();
    
    // Map collection names and send response
    const collectionNames = collections.map(col => col.name);
    
    res.json(collectionNames);
  } catch (error) {
    console.error("Error listing collections:", error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: List databases for a connection passed in the request body
router.post('/list', async (req, res) => {
  try {
    const { uri, authType, username, password, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion } = req.body;
    
    // Create a MongoDB client based on the provided connection details
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
    
    // Get the list of databases
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    // Close the client connection
    await client.close();
    
    res.json({ success: true, databases: dbs.databases.map(db => db.name) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: List collections for a database with connection details in request body
router.post('/collections', async (req, res) => {
  try {
    const { uri, authType, username, password, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion, database } = req.body;
    
    // Create a MongoDB client based on the provided connection details
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
    
    // Get the list of collections
    const db = client.db(database);
    const collections = await db.listCollections().toArray();
    
    // Close the client connection
    await client.close();
    
    // Map collection names and send response
    const collectionNames = collections.map(col => col.name);
    
    res.json(collectionNames);
  } catch (error) {
    console.error("Error listing collections:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all collections in a database
router.get('/:connectionId/:dbName/collections', async (req, res) => {
  try {
    const { connectionId, dbName } = req.params;
    console.log(`Received request for collections in database: ${dbName} using connection: ${connectionId}`);
    
    if (!global.activeConnections[connectionId]) {
      console.error(`Active connection not found for ID: ${connectionId}`);
      return res.status(400).json({ error: 'Not connected to this database' });
    }
    
    const db = global.activeConnections[connectionId].db(dbName);
    console.log(`Connected to database: ${dbName}`);
    
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);
    
    // Map collection names and send response
    const collectionNames = collections.map(col => col.name);
    console.log("Collection names:", collectionNames);
    
    res.json(collectionNames);
  } catch (error) {
    console.error("Error listing collections:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get database stats
router.get('/:connectionId/:dbName/stats', async (req, res) => {
  try {
    const { connectionId, dbName } = req.params;
    
    if (!global.activeConnections[connectionId]) {
      return res.status(400).json({ error: 'Not connected to this database' });
    }
    
    const db = global.activeConnections[connectionId].db(dbName);
    const stats = await db.stats();
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
