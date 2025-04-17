const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Load environment variables
dotenv.config();

// Create a global object to store active connections
global.activeConnections = {};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Requested-With']
}));
app.use(bodyParser.json());

// Connect to MongoDB for storing connection data
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mongo-reader', {
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
  res.json({ 
    activeConnections: connectionIds,
    count: connectionIds.length
  });
});

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
  
  // Close all active client connections
  for (const id in global.activeConnections) {
    if (global.activeConnections[id]) {
      await global.activeConnections[id].close();
    }
  }
  
  console.log('All connections closed');
  process.exit(0);
});

module.exports = { app };
