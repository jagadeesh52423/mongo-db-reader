const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  uri: {
    type: String,
    required: true
  },
  authType: {
    type: String,
    enum: ['None', 'Basic', 'Legacy', 'AWS'],
    default: 'None'
  },
  username: String,
  password: String,
  awsAccessKey: String,
  awsSecretKey: String,
  awsSessionToken: String,
  awsRegion: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date
});

module.exports = mongoose.model('Connection', ConnectionSchema);
