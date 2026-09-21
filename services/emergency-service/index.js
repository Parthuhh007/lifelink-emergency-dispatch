require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const Emergency = require('./models/Emergency');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';
const RESPONSE_SERVICE_URL = process.env.RESPONSE_SERVICE_URL || 'http://localhost:3004';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Emergency Service DB connected'))
  .catch(err => console.error(err));

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}

app.post('/', async (req, res) => {
  try {
    const {
      userId,
      emergencyType,
      description,
      latitude,
      longitude,
      patientName,
      phone,
      address
    } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!isValidCoord(lat, lng)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    const emergency = new Emergency({
      userId,
      emergencyType: emergencyType || 'AMBULANCE',
      description,
      patientName,
      phone,
      address,
      latitude: lat,
      longitude: lng,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      status: 'SEARCHING'
    });

    await emergency.save();

    try {
      const dispatchRes = await axios.post(`${RESPONSE_SERVICE_URL}/dispatch`, {
        emergencyId: emergency._id,
        latitude: lat,
        longitude: lng,
        emergencyType: emergency.emergencyType
      });
      console.log('Dispatch result:', dispatchRes.data);
    } catch (dispatchError) {
      console.error(
        'Error dispatching to response service:',
        dispatchError.response?.status,
        dispatchError.message
      );
    }

    res.status(201).json(emergency);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/user/:userId', async (req, res) => {
  try {
    const emergencies = await Emergency.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', async (req, res) => {
  try {
    const emergencies = await Emergency.find().sort({ createdAt: -1 });
    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/:id', async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ error: 'Not found' });
    res.json(emergency);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/:id/status', async (req, res) => {
  try {
    const { status, assignedServiceId } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (assignedServiceId !== undefined) updateData.assignedServiceId = assignedServiceId;

    const emergency = await Emergency.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!emergency) return res.status(404).json({ error: 'Not found' });
    res.json(emergency);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Emergency Service listening on port ${PORT}`);
});
