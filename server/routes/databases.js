const express = require('express');
const router = express.Router();

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
