const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true },
  sender_name: { type: String, required: true }, // Just storing the name now
  type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  content: { type: String },
  media_url: { type: String },
  is_ephemeral: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);