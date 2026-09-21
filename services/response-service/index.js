require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('./models/User');
const Service = require('./models/Service');
const Emergency = require('./models/Emergency');
const { verificationFromLicense, LICENSE_REJECTION_MESSAGE } = require('./license');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3004;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Response Service DB connected'))
  .catch(err => console.error(err));

const CLAIMABLE = ['SEARCHING', 'PENDING'];
const ACTIVE_OPS = ['DISPATCHED', 'ARRIVED', 'BUSY'];

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

async function findUnitForUser(userId) {
  if (!userId) return null;
  const oid = toObjectId(userId);
  const query = oid
    ? { $or: [{ userId: oid }, { userId: String(userId) }] }
    : { userId: String(userId) };
  return Service.findOne(query).populate('userId', 'name email phone role');
}

async function upsertUnit({ userId, providerName, vehicleNumber, licenseNumber, phone }) {
  const existing = await findUnitForUser(userId);
  const verification = verificationFromLicense(licenseNumber);
  const keepOperational = existing && ACTIVE_OPS.includes(existing.availability);

  const payload = {
    userId: toObjectId(userId) || userId,
    providerName,
    serviceType: 'AMBULANCE',
    vehicleNumber,
    licenseNumber: String(licenseNumber || '').trim(),
    phone,
    verificationStatus: verification.verificationStatus,
    status: verification.status,
    availability: verification.valid
      ? (keepOperational ? existing.availability : 'AVAILABLE')
      : 'OFFLINE'
  };

  let service;
  if (existing) {
    Object.assign(existing, payload);
    service = await existing.save();
  } else {
    service = await Service.create({
      ...payload,
      location: { type: 'Point', coordinates: [73.8567, 18.5204] }
    });
  }

  return { service, verification };
}

app.get('/my-service', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const service = await findUnitForUser(userId);
    if (!service) {
      return res.status(404).json({ error: 'Service unit not found for this user' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/my-service', async (req, res) => {
  try {
    const { userId, providerName, vehicleNumber, licenseNumber, phone } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!providerName || !vehicleNumber || !licenseNumber || !phone) {
      return res.status(400).json({ error: 'Provider name, vehicle number, license ID, and phone are required' });
    }

    const { service, verification } = await upsertUnit({
      userId,
      providerName,
      vehicleNumber,
      licenseNumber,
      phone
    });

    const body = {
      ...service.toObject(),
      verificationStatus: verification.verificationStatus,
      status: verification.status,
      availability: service.availability
    };

    if (!verification.valid) {
      return res.status(400).json({
        error: LICENSE_REJECTION_MESSAGE,
        message: LICENSE_REJECTION_MESSAGE,
        ...body
      });
    }

    res.json(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/dispatch', async (req, res) => {
  try {
    const { emergencyId, latitude, longitude, emergencyType } = req.body;
    const nearby = await Service.find({
      verificationStatus: 'APPROVED',
      availability: 'AVAILABLE'
    }).limit(25);

    res.json({
      emergencyId,
      latitude,
      longitude,
      emergencyType,
      notified: nearby.length,
      assigned: false,
      message: 'Emergency is available for claim by an approved AVAILABLE unit'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/accept', async (req, res) => {
  try {
    const { emergencyId, userId } = req.body;
    if (!emergencyId || !userId) {
      return res.status(400).json({ error: 'emergencyId and userId are required' });
    }

    const service = await findUnitForUser(userId);
    if (!service) return res.status(404).json({ error: 'Service unit not found' });

    const verification = String(service.verificationStatus || service.status || '').toUpperCase();
    if (verification !== 'APPROVED') {
      return res.status(403).json({ error: 'Provider is not approved' });
    }
    if (String(service.availability).toUpperCase() !== 'AVAILABLE') {
      return res.status(409).json({ error: 'Provider is not available to accept dispatches' });
    }

    const claimed = await Emergency.findOneAndUpdate(
      {
        _id: emergencyId,
        status: { $in: CLAIMABLE },
        $or: [{ assignedServiceId: null }, { assignedServiceId: { $exists: false } }]
      },
      {
        $set: {
          status: 'DISPATCHED',
          assignedServiceId: service._id
        }
      },
      { new: true }
    );

    if (!claimed) {
      return res.status(409).json({ error: 'Emergency already claimed or is no longer available' });
    }

    const dispatched = await Service.findOneAndUpdate(
      {
        _id: service._id,
        verificationStatus: 'APPROVED',
        availability: 'AVAILABLE'
      },
      { $set: { availability: 'DISPATCHED' } },
      { new: true }
    );

    if (!dispatched) {
      await Emergency.findOneAndUpdate(
        { _id: claimed._id, assignedServiceId: service._id },
        { $set: { status: 'SEARCHING', assignedServiceId: null } }
      );
      return res.status(409).json({ error: 'Provider is not available to accept dispatches' });
    }

    res.json({ emergency: claimed, service: dispatched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reject', async (req, res) => {
  try {
    const { emergencyId, userId } = req.body;
    if (!emergencyId || !userId) {
      return res.status(400).json({ error: 'emergencyId and userId are required' });
    }

    const service = await findUnitForUser(userId);
    if (!service) return res.status(404).json({ error: 'Service unit not found' });

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });

    if (emergency.assignedServiceId && String(emergency.assignedServiceId) === String(service._id)) {
      if (['DISPATCHED', 'ASSIGNED'].includes(emergency.status)) {
        emergency.status = 'SEARCHING';
        emergency.assignedServiceId = null;
        await emergency.save();
      }
    }

    if (ACTIVE_OPS.includes(service.availability) && String(emergency.assignedServiceId || '') !== String(service._id)) {
      if (['DISPATCHED', 'BUSY'].includes(service.availability)) {
        service.availability = 'AVAILABLE';
        await service.save();
      }
    } else if (!emergency.assignedServiceId && ['DISPATCHED', 'BUSY'].includes(service.availability)) {
      service.availability = 'AVAILABLE';
      await service.save();
    }

    res.json({
      emergency,
      service,
      message: 'Emergency remains available for other providers'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/arrived', async (req, res) => {
  try {
    const { emergencyId, userId } = req.body;
    const service = await findUnitForUser(userId);
    if (!service) return res.status(404).json({ error: 'Service unit not found' });

    const emergency = await Emergency.findOneAndUpdate(
      {
        _id: emergencyId,
        assignedServiceId: service._id,
        status: { $in: ['DISPATCHED', 'ASSIGNED'] }
      },
      { $set: { status: 'ARRIVED' } },
      { new: true }
    );

    if (!emergency) {
      return res.status(409).json({ error: 'Cannot mark arrived for this emergency' });
    }

    service.availability = 'ARRIVED';
    await service.save();

    res.json({ emergency, service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/complete', async (req, res) => {
  try {
    const { emergencyId, userId } = req.body;
    const service = await findUnitForUser(userId);
    if (!service) return res.status(404).json({ error: 'Service unit not found' });

    const emergency = await Emergency.findOneAndUpdate(
      {
        _id: emergencyId,
        assignedServiceId: service._id,
        status: 'ARRIVED'
      },
      { $set: { status: 'RESOLVED' } },
      { new: true }
    );

    if (!emergency) {
      return res.status(409).json({ error: 'Dispatch can only be completed after arrival' });
    }

    service.availability = 'AVAILABLE';
    await service.save();

    res.json({ emergency, service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/availability', async (req, res) => {
  try {
    const { userId, serviceId, availability } = req.body;
    const next = String(availability || '').toUpperCase();
    if (!['AVAILABLE', 'OFFLINE'].includes(next)) {
      return res.status(400).json({ error: 'availability must be AVAILABLE or OFFLINE' });
    }

    const service = serviceId
      ? await Service.findById(serviceId)
      : await findUnitForUser(userId);

    if (!service) return res.status(404).json({ error: 'Service unit not found' });

    const verification = String(service.verificationStatus || service.status || '').toUpperCase();
    if (verification !== 'APPROVED') {
      return res.status(403).json({ error: 'Only approved providers can change availability' });
    }
    if (ACTIVE_OPS.includes(service.availability)) {
      return res.status(409).json({ error: 'Cannot change availability during an active dispatch' });
    }

    service.availability = next;
    await service.save();
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Response Service listening on port ${PORT}`);
});
