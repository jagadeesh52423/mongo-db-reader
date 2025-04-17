const express = require('express');
const router = express.Router();

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
