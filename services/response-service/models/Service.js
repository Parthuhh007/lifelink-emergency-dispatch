const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerName: { type: String, required: true },
  serviceType: {
    type: String,
    default: 'AMBULANCE'
  },
  phone: { type: String },
  vehicleNumber: { type: String },
  licenseNumber: { type: String },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  availability: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE', 'DISPATCHED', 'ARRIVED'],
    default: 'OFFLINE'
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [73.8567, 18.5204] }
  }
}, { timestamps: true, collection: 'services' });

ServiceSchema.index({ location: '2dsphere' });

ServiceSchema.pre('validate', function (next) {
  this.serviceType = this.serviceType || 'AMBULANCE';
  if (this.verificationStatus && !this.status) this.status = this.verificationStatus;
  if (this.status && !this.verificationStatus) this.verificationStatus = this.status;
  next();
});

module.exports = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
