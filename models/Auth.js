const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  updated: {
    type: Date,
    default: Date.now()
  },
  client_id: {
    type: Number,
    default: process.env.CLIENT_ID
  },
  client_secret: {
    type: String,
    default: process.env.CLIENT_SECRET
  },
  token_type: {
    type: String,
    default: 'Bearer'
  },
  access_token: {
    type: String,
    default: process.env.INITIAL_ACCESS_TOKEN
  },
  refresh_token: {
    type: String,
    default: process.env.INITIAL_REFRESH_TOKEN
  },
  email_sent: {
    type: Boolean,
    default: false
  },
  expires_at: Date
});

module.exports = mongoose.model('Auth', authSchema);
