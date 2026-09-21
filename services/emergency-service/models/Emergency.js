const mongoose = require('mongoose');

const EmergencySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emergencyType: { type: String, required: true },
  description: { type: String },
  patientName: { type: String },
  phone: { type: String },
  address: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  status: {
    type: String,
    enum: [
      'SEARCHING',
      'PENDING',
      'ASSIGNED',
      'DISPATCHED',
      'ARRIVED',
      'RESOLVED',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'SEARCHING'
  },
  assignedServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
}, { timestamps: true });

EmergencySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Emergency', EmergencySchema);
