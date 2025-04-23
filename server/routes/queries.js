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
  
  // Add connectionId and mongoClient to request for use in route handlers
  req.connectionId = connectionId;
  req.mongoClient = global.activeConnections[connectionId];
  next();
};

// New endpoint: Execute a query using session token with pagination support
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
    let metadata = {};
    
    // Handle pagination for find and aggregate operations
    const hasPagination = options.pagination && (type === 'find' || type === 'aggregate');
    const page = hasPagination ? options.pagination.page || 1 : 1;
    const pageSize = hasPagination ? options.pagination.pageSize || 20 : 20;
    const skip = (page - 1) * pageSize;
    
    // Extract options besides pagination to pass to MongoDB
    const mongoOptions = { ...options };
    delete mongoOptions.pagination;
    delete mongoOptions.collection; // Remove collection from options
    
    // Apply common cursor options
    if (options.maxTimeMS) mongoOptions.maxTimeMS = options.maxTimeMS;
    if (options.comment) mongoOptions.comment = options.comment;
    if (options.hint) mongoOptions.hint = options.hint;
    if (options.readConcern) mongoOptions.readConcern = options.readConcern;
    if (options.readPreference || options.readPref) mongoOptions.readPreference = options.readPreference || options.readPref;
    if (options.collation) mongoOptions.collation = options.collation;
    if (options.allowDiskUse !== undefined) mongoOptions.allowDiskUse = options.allowDiskUse;
    if (options.noCursorTimeout !== undefined) mongoOptions.noCursorTimeout = options.noCursorTimeout;
    if (options.tailable !== undefined) mongoOptions.tailable = options.tailable;
    if (options.returnKey !== undefined) mongoOptions.returnKey = options.returnKey;
    if (options.showRecordId !== undefined) mongoOptions.showRecordId = options.showRecordId;
    if (options.sort) mongoOptions.sort = options.sort;
    
    switch (type) {
      case 'find':
        // If pagination is requested, get count first
        if (hasPagination) {
          const totalCount = await coll.countDocuments(query);
          metadata = {
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
          };
          
          // Apply pagination
          const findCursor = coll.find(query, mongoOptions)
            .skip(skip)
            .limit(pageSize);
          
          const documents = await findCursor.toArray();
          
          // Return paginated response
          result = {
            metadata,
            documents
          };
        } else {
          // Non-paginated response
          const findCursor = coll.find(query, mongoOptions);
          result = await findCursor.toArray();
        }
        break;
        
      case 'aggregate':
        // For aggregate queries with pagination
        if (hasPagination) {
          // Create a pipeline for counting documents that matches the criteria
          const countPipeline = [...query];
          
          // Remove any existing $skip, $limit stages if present
          const filteredPipeline = countPipeline.filter(stage => 
            !stage.$skip && !stage.$limit && !stage.$sort
          );
          
          // Add count stage
          const countResult = await coll.aggregate([
            ...filteredPipeline,
            { $count: 'totalCount' }
          ]).toArray();
          
          const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
          
          metadata = {
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
          };
          
          // Clone the original pipeline
          const paginatedPipeline = [...query];
          
          // Add pagination stages
          paginatedPipeline.push({ $skip: skip });
          paginatedPipeline.push({ $limit: pageSize });
          
          const documents = await coll.aggregate(paginatedPipeline, mongoOptions).toArray();
          
          // Return paginated response
          result = {
            metadata,
            documents
          };
        } else {
          // Non-paginated response
          const aggCursor = coll.aggregate(query, mongoOptions);
          result = await aggCursor.toArray();
        }
        break;
        
      case 'findOne':
        result = await coll.findOne(query, mongoOptions);
        break;
        
      case 'count':
        result = await coll.countDocuments(query, mongoOptions);
        break;
        
      case 'distinct':
        result = await coll.distinct(query.field, query.filter || {}, mongoOptions);
        break;
        
      case 'insert':
        if (Array.isArray(query)) {
          result = await coll.insertMany(query, mongoOptions);
        } else {
          result = await coll.insertOne(query, mongoOptions);
        }
        break;
        
      case 'update':
        if (mongoOptions.many) {
          result = await coll.updateMany(query.filter, query.update, mongoOptions);
        } else {
          result = await coll.updateOne(query.filter, query.update, mongoOptions);
        }
        break;
        
      case 'delete':
        if (mongoOptions.many) {
          result = await coll.deleteMany(query, mongoOptions);
        } else {
          result = await coll.deleteOne(query, mongoOptions);
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

// Execute a query with connection details in the request body
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
    let metadata = {};
    
    // Handle pagination for find and aggregate operations
    const hasPagination = options.pagination && (type === 'find' || type === 'aggregate');
    const page = hasPagination ? options.pagination.page || 1 : 1;
    const pageSize = hasPagination ? options.pagination.pageSize || 20 : 20;
    const skip = (page - 1) * pageSize;
    
    // Extract options besides pagination to pass to MongoDB
    const mongoOptions = { ...options };
    delete mongoOptions.pagination;
    delete mongoOptions.collection; // Remove collection from options
    
    // Apply common cursor options
    if (options.maxTimeMS) mongoOptions.maxTimeMS = options.maxTimeMS;
    if (options.comment) mongoOptions.comment = options.comment;
    if (options.hint) mongoOptions.hint = options.hint;
    if (options.readConcern) mongoOptions.readConcern = options.readConcern;
    if (options.readPreference || options.readPref) mongoOptions.readPreference = options.readPreference || options.readPref;
    if (options.collation) mongoOptions.collation = options.collation;
    if (options.allowDiskUse !== undefined) mongoOptions.allowDiskUse = options.allowDiskUse;
    if (options.noCursorTimeout !== undefined) mongoOptions.noCursorTimeout = options.noCursorTimeout;
    if (options.tailable !== undefined) mongoOptions.tailable = options.tailable;
    if (options.returnKey !== undefined) mongoOptions.returnKey = options.returnKey;
    if (options.showRecordId !== undefined) mongoOptions.showRecordId = options.showRecordId;
    if (options.sort) mongoOptions.sort = options.sort;
    
    switch (type) {
      case 'find':
        // If pagination is requested, get count first
        if (hasPagination) {
          const totalCount = await coll.countDocuments(query);
          metadata = {
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
          };
          
          // Apply pagination
          const findCursor = coll.find(query, mongoOptions)
            .skip(skip)
            .limit(pageSize);
          
          const documents = await findCursor.toArray();
          
          // Return paginated response
          result = {
            metadata,
            documents
          };
        } else {
          // Non-paginated response
          const findCursor = coll.find(query, mongoOptions);
          result = await findCursor.toArray();
        }
        break;
        
      case 'aggregate':
        // For aggregate queries with pagination
        if (hasPagination) {
          // Create a pipeline for counting documents that matches the criteria
          const countPipeline = [...query];
          
          // Remove any existing $skip, $limit stages if present
          const filteredPipeline = countPipeline.filter(stage => 
            !stage.$skip && !stage.$limit && !stage.$sort
          );
          
          // Add count stage
          const countResult = await coll.aggregate([
            ...filteredPipeline,
            { $count: 'totalCount' }
          ]).toArray();
          
          const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
          
          metadata = {
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
          };
          
          // Clone the original pipeline
          const paginatedPipeline = [...query];
          
          // Add pagination stages
          paginatedPipeline.push({ $skip: skip });
          paginatedPipeline.push({ $limit: pageSize });
          
          const documents = await coll.aggregate(paginatedPipeline, mongoOptions).toArray();
          
          // Return paginated response
          result = {
            metadata,
            documents
          };
        } else {
          // Non-paginated response
          const aggCursor = coll.aggregate(query, mongoOptions);
          result = await aggCursor.toArray();
        }
        break;
        
      case 'findOne':
        result = await coll.findOne(query, mongoOptions);
        break;
        
      case 'count':
        result = await coll.countDocuments(query, mongoOptions);
        break;
        
      case 'distinct':
        result = await coll.distinct(query.field, query.filter || {}, mongoOptions);
        break;
        
      case 'insert':
        if (Array.isArray(query)) {
          result = await coll.insertMany(query, mongoOptions);
        } else {
          result = await coll.insertOne(query, mongoOptions);
        }
        break;
        
      case 'update':
        if (mongoOptions.many) {
          result = await coll.updateMany(query.filter, query.update, mongoOptions);
        } else {
          result = await coll.updateOne(query.filter, query.update, mongoOptions);
        }
        break;
        
      case 'delete':
        if (mongoOptions.many) {
          result = await coll.deleteMany(query, mongoOptions);
        } else {
          result = await coll.deleteOne(query, mongoOptions);
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

// Execute a query using path parameters
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
    let metadata = {};
    
    // Handle pagination for find and aggregate operations
    const hasPagination = options.pagination && (type === 'find' || type === 'aggregate');
    const page = hasPagination ? options.pagination.page || 1 : 1;
    const pageSize = hasPagination ? options.pagination.pageSize || 20 : 20;
    const skip = (page - 1) * pageSize;
    
    // Extract options besides pagination to pass to MongoDB
    const mongoOptions = { ...options };
    delete mongoOptions.pagination;
    delete mongoOptions.collection; // Remove collection from options
    
    // Apply common cursor options
    if (options.maxTimeMS) mongoOptions.maxTimeMS = options.maxTimeMS;
    if (options.comment) mongoOptions.comment = options.comment;
    if (options.hint) mongoOptions.hint = options.hint;
    if (options.readConcern) mongoOptions.readConcern = options.readConcern;
    if (options.readPreference || options.readPref) mongoOptions.readPreference = options.readPreference || options.readPref;
    if (options.collation) mongoOptions.collation = options.collation;
    if (options.allowDiskUse !== undefined) mongoOptions.allowDiskUse = options.allowDiskUse;
    if (options.noCursorTimeout !== undefined) mongoOptions.noCursorTimeout = options.noCursorTimeout;
    if (options.tailable !== undefined) mongoOptions.tailable = options.tailable;
    if (options.returnKey !== undefined) mongoOptions.returnKey = options.returnKey;
    if (options.showRecordId !== undefined) mongoOptions.showRecordId = options.showRecordId;
    if (options.sort) mongoOptions.sort = options.sort;
    
    switch (type) {
      case 'find':
        // If pagination is requested, get count first
        if (hasPagination) {
          const totalCount = await collection.countDocuments(query);
          metadata = {
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
          };
          
          // Apply pagination
          const findCursor = collection.find(query, mongoOptions)
            .skip(skip)
            .limit(pageSize);
          
          const documents = await findCursor.toArray();
          
          // Return paginated response
          result = {
            metadata,
            documents
          };
        } else {
          // Non-paginated response
          const findCursor = collection.find(query, mongoOptions);
          result = await findCursor.toArray();
        }
        break;
        
      case 'aggregate':
        // For aggregate queries with pagination
        if (hasPagination) {
          // Create a pipeline for counting documents that matches the criteria
          const countPipeline = [...query];
          
          // Remove any existing $skip, $limit stages if present
          const filteredPipeline = countPipeline.filter(stage => 
            !stage.$skip && !stage.$limit && !stage.$sort
          );
          
          // Add count stage
          const countResult = await collection.aggregate([
            ...filteredPipeline,
            { $count: 'totalCount' }
          ]).toArray();
          
          const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
          
          metadata = {
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
          };
          
          // Clone the original pipeline
          const paginatedPipeline = [...query];
          
          // Add pagination stages
          paginatedPipeline.push({ $skip: skip });
          paginatedPipeline.push({ $limit: pageSize });
          
          const documents = await collection.aggregate(paginatedPipeline, mongoOptions).toArray();
          
          // Return paginated response
          result = {
            metadata,
            documents
          };
        } else {
          // Non-paginated response
          const aggCursor = collection.aggregate(query, mongoOptions);
          result = await aggCursor.toArray();
        }
        break;
        
      case 'findOne':
        result = await collection.findOne(query, mongoOptions);
        break;
        
      case 'count':
        result = await collection.countDocuments(query, mongoOptions);
        break;
        
      case 'distinct':
        result = await collection.distinct(query.field, query.filter || {}, mongoOptions);
        break;
        
      case 'insert':
        if (Array.isArray(query)) {
          result = await collection.insertMany(query, mongoOptions);
        } else {
          result = await collection.insertOne(query, mongoOptions);
        }
        break;
        
      case 'update':
        if (mongoOptions.many) {
          result = await collection.updateMany(query.filter, query.update, mongoOptions);
        } else {
          result = await collection.updateOne(query.filter, query.update, mongoOptions);
        }
        break;
        
      case 'delete':
        if (mongoOptions.many) {
          result = await collection.deleteMany(query, mongoOptions);
        } else {
          result = await collection.deleteOne(query, mongoOptions);
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
