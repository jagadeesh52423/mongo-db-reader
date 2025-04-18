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

// New endpoint: Execute a query using session token
router.post('/execute-by-token', validateSession, async (req, res) => {
  try {
    const { connectionId } = req;
    const { database, collection, query, type, options = {} } = req.body;
    
    if (!database || !collection) {
      return res.status(400).json({ error: 'Database and collection are required' });
    }
    
    const client = global.activeConnections[connectionId];
    const db = client.db(database);
    const coll = db.collection(collection);
    
    let result;
    
    switch (type) {
      case 'find':
        const findCursor = coll.find(query, options);
        result = await findCursor.toArray();
        break;
      case 'findOne':
        result = await coll.findOne(query, options);
        break;
      case 'count':
        result = await coll.countDocuments(query, options);
        break;
      case 'aggregate':
        const aggCursor = coll.aggregate(query, options);
        result = await aggCursor.toArray();
        break;
      case 'distinct':
        result = await coll.distinct(query.field, query.filter || {}, options);
        break;
      case 'insert':
        if (Array.isArray(query)) {
          result = await coll.insertMany(query, options);
        } else {
          result = await coll.insertOne(query, options);
        }
        break;
      case 'update':
        if (options.many) {
          result = await coll.updateMany(query.filter, query.update, options);
        } else {
          result = await coll.updateOne(query.filter, query.update, options);
        }
        break;
      case 'delete':
        if (options.many) {
          result = await coll.deleteMany(query, options);
        } else {
          result = await coll.deleteOne(query, options);
        }
        break;
      default:
        return res.status(400).json({ error: 'Unsupported query type' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: Execute a query with connection details in the request body
router.post('/execute', async (req, res) => {
  try {
    const { connectionDetails, database, collection, query, type, options = {} } = req.body;
    const { uri, authType, username, password, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion } = connectionDetails;
    
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
    
    // Execute the query
    const db = client.db(database);
    const coll = db.collection(collection);
    
    let result;
    
    switch (type) {
      case 'find':
        const findCursor = coll.find(query, options);
        result = await findCursor.toArray();
        break;
      case 'findOne':
        result = await coll.findOne(query, options);
        break;
      case 'count':
        result = await coll.countDocuments(query, options);
        break;
      case 'aggregate':
        const aggCursor = coll.aggregate(query, options);
        result = await aggCursor.toArray();
        break;
      case 'distinct':
        result = await coll.distinct(query.field, query.filter || {}, options);
        break;
      case 'insert':
        if (Array.isArray(query)) {
          result = await coll.insertMany(query, options);
        } else {
          result = await coll.insertOne(query, options);
        }
        break;
      case 'update':
        if (options.many) {
          result = await coll.updateMany(query.filter, query.update, options);
        } else {
          result = await coll.updateOne(query.filter, query.update, options);
        }
        break;
      case 'delete':
        if (options.many) {
          result = await coll.deleteMany(query, options);
        } else {
          result = await coll.deleteOne(query, options);
        }
        break;
      default:
        await client.close();
        return res.status(400).json({ error: 'Unsupported query type' });
    }
    
    // Close the client connection
    await client.close();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute a query
router.post('/:connectionId/:dbName/:collectionName', async (req, res) => {
  try {
    const { connectionId, dbName, collectionName } = req.params;
    const { query, type, options = {} } = req.body;
    
    if (!global.activeConnections[connectionId]) {
      return res.status(400).json({ error: 'Not connected to this database' });
    }
    
    const db = global.activeConnections[connectionId].db(dbName);
    const collection = db.collection(collectionName);
    
    let result;
    
    switch (type) {
      case 'find':
        const findCursor = collection.find(query, options);
        result = await findCursor.toArray();
        break;
      case 'findOne':
        result = await collection.findOne(query, options);
        break;
      case 'count':
        result = await collection.countDocuments(query, options);
        break;
      case 'aggregate':
        const aggCursor = collection.aggregate(query, options);
        result = await aggCursor.toArray();
        break;
      case 'distinct':
        result = await collection.distinct(query.field, query.filter || {}, options);
        break;
      case 'insert':
        if (Array.isArray(query)) {
          result = await collection.insertMany(query, options);
        } else {
          result = await collection.insertOne(query, options);
        }
        break;
      case 'update':
        if (options.many) {
          result = await collection.updateMany(query.filter, query.update, options);
        } else {
          result = await collection.updateOne(query.filter, query.update, options);
        }
        break;
      case 'delete':
        if (options.many) {
          result = await collection.deleteMany(query, options);
        } else {
          result = await collection.deleteOne(query, options);
        }
        break;
      default:
        return res.status(400).json({ error: 'Unsupported query type' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
