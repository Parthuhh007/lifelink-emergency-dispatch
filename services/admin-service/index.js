require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('./models/User');
const Service = require('./models/Service');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Admin Service DB connected'))
  .catch(err => console.error(err));

async function listServices(_req, res) {
  try {
    const services = await Service.find()
      .populate('userId', 'name email phone role')
      .sort({ updatedAt: -1, createdAt: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function patchAvailability(req, res) {
  try {
    const { availability } = req.body;
    const service = await Service.findById(req.params.id).populate('userId', 'name email phone role');
    if (!service) return res.status(404).json({ error: 'Service not found' });

    if (availability !== undefined) {
      const next = String(availability).toUpperCase();
      const verification = String(service.verificationStatus || service.status || '').toUpperCase();
      if (verification !== 'APPROVED') {
        return res.status(403).json({ error: 'Only approved providers can change availability' });
      }
      if (['DISPATCHED', 'ARRIVED', 'BUSY'].includes(service.availability) && next !== service.availability) {
        return res.status(409).json({ error: 'Cannot override operational status during an active dispatch' });
      }
      if (!['AVAILABLE', 'OFFLINE'].includes(next) && next !== service.availability) {
        return res.status(400).json({ error: 'Invalid availability value' });
      }
      service.availability = next;
      await service.save();
    }

    const updated = await Service.findById(service._id).populate('userId', 'name email phone role');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/services', listServices);
app.get('/', listServices);
app.patch('/services/:id/status', patchAvailability);

app.listen(PORT, () => {
  console.log(`Admin Service listening on port ${PORT}`);
});
