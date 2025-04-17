const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mongo-reader', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB for initial setup');
  
  // Create the Connection model schema if it doesn't exist yet
  require('./models/Connection');
  
  console.log('Database initialized successfully');
  process.exit(0);
}).catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
