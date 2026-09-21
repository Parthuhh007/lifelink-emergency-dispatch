const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  password: { type: String },
  role: { type: String },
  phone: { type: String },
}, { timestamps: true, collection: 'users' });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
