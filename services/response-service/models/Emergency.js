const mongoose = require('mongoose');

const EmergencySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencyType: { type: String },
  description: { type: String },
  patientName: { type: String },
  phone: { type: String },
  address: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }
  },
  status: { type: String, default: 'SEARCHING' },
  assignedServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
}, { timestamps: true, collection: 'emergencies' });

module.exports = mongoose.models.Emergency || mongoose.model('Emergency', EmergencySchema);
