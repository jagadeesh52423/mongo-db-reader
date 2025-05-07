const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Load environment variables
dotenv.config();

// Create a global object to store active connections and their last activity time
global.activeConnections = {};
global.connectionLastActivity = {};
global.connectionTimeouts = {};

// Default timeout in milliseconds (30 minutes)
const CONNECTION_TIMEOUT = process.env.CONNECTION_TIMEOUT || 30 * 60 * 1000;

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Requested-With']
}));
app.use(bodyParser.json());

// Connection activity tracking middleware
app.use((req, res, next) => {
  // Extract connection ID from request
  const connectionId = req.body?.connectionId || req.query?.connectionId;
  
  if (connectionId && global.activeConnections[connectionId]) {
    updateConnectionActivity(connectionId);
  }
  
  next();
});

// Connect to MongoDB for storing connection data
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongoReader:password@localhost:27017/mongo-reader?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for connection storage'))
.catch(err => console.error('MongoDB connection error:', err));

// Import routes after global.activeConnections is defined to avoid circular dependencies
const connectionsRouter = require('./routes/connections');
const databasesRouter = require('./routes/databases');
const queriesRouter = require('./routes/queries');

// Routes
app.use('/api/connections', connectionsRouter);
app.use('/api/databases', databasesRouter);
app.use('/api/queries', queriesRouter);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Debug endpoint to check active connections
app.get('/api/debug/connections', (req, res) => {
  const connectionIds = Object.keys(global.activeConnections);
  const activityInfo = {};
  
  // Add last activity time for each connection
  Object.keys(global.connectionLastActivity).forEach(id => {
    const lastActivity = global.connectionLastActivity[id];
    if (lastActivity) {
      activityInfo[id] = {
        lastActivity: new Date(lastActivity),
        idleTime: Date.now() - lastActivity,
        willTimeoutIn: Math.max(0, (lastActivity + CONNECTION_TIMEOUT) - Date.now())
      };
    }
  });
  
  res.json({ 
    activeConnections: connectionIds,
    count: connectionIds.length,
    activityInfo
  });
});

// Function to update connection activity - exported for use in routes
const updateConnectionActivity = (connectionId) => {
  if (!connectionId) return;
  
  // Update last activity time
  global.connectionLastActivity[connectionId] = Date.now();
  
  // Clear existing timeout if any
  if (global.connectionTimeouts[connectionId]) {
    clearTimeout(global.connectionTimeouts[connectionId]);
  }
  
  // Set new timeout
  global.connectionTimeouts[connectionId] = setTimeout(async () => {
    console.log(`Connection ${connectionId} timed out after ${CONNECTION_TIMEOUT}ms of inactivity`);
    
    // Close the connection
    try {
      if (global.activeConnections[connectionId]) {
        await global.activeConnections[connectionId].close();
        delete global.activeConnections[connectionId];
        delete global.connectionLastActivity[connectionId];
        delete global.connectionTimeouts[connectionId];
        console.log(`Connection ${connectionId} closed due to inactivity`);
      }
    } catch (err) {
      console.error(`Error closing timed out connection ${connectionId}:`, err);
    }
  }, CONNECTION_TIMEOUT);
};

// Make the function globally available
global.updateConnectionActivity = updateConnectionActivity;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Close MongoDB connections on process exit
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connections...');
  
  // Close mongoose connection
  await mongoose.connection.close();
  
  // Clear all connection timeouts
  for (const id in global.connectionTimeouts) {
    if (global.connectionTimeouts[id]) {
      clearTimeout(global.connectionTimeouts[id]);
      delete global.connectionTimeouts[id];
    }
  }
  
  // Close all active client connections
  for (const id in global.activeConnections) {
    if (global.activeConnections[id]) {
      try {
        await global.activeConnections[id].close();
        delete global.activeConnections[id];
        delete global.connectionLastActivity[id];
      } catch (err) {
        console.error(`Error closing connection ${id}:`, err);
      }
    }
  }
  
  console.log('All connections closed');
  process.exit(0);
});

module.exports = { app };
