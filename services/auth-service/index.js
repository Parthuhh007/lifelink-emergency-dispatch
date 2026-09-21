require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const { verificationFromLicense } = require('./license');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Auth Service DB connected'))
  .catch(err => console.error(err));

async function upsertAmbulanceUnit(user, { providerName, vehicleNumber, licenseNumber, phone }) {
  const servicesCollection = mongoose.connection.collection('services');
  const verification = verificationFromLicense(licenseNumber);
  const now = new Date();

  const existing = await servicesCollection.findOne({
    $or: [{ userId: user._id }, { userId: String(user._id) }]
  });
  const keepOperational = existing && ['DISPATCHED', 'ARRIVED', 'BUSY'].includes(existing.availability);

  const availability = verification.valid
    ? (keepOperational ? existing.availability : 'AVAILABLE')
    : 'OFFLINE';

  const fields = {
    userId: user._id,
    providerName: providerName || user.name,
    serviceType: 'AMBULANCE',
    vehicleNumber: vehicleNumber || existing?.vehicleNumber || 'NOT_PROVIDED',
    licenseNumber: String(licenseNumber || '').trim() || existing?.licenseNumber || 'NOT_PROVIDED',
    phone: phone || user.phone || existing?.phone || 'NOT_PROVIDED',
    verificationStatus: verification.verificationStatus,
    status: verification.status,
    availability,
    updatedAt: now
  };

  if (existing) {
    await servicesCollection.updateOne({ _id: existing._id }, { $set: fields });
    return { ...existing, ...fields, _id: existing._id, verification };
  }

  const inserted = {
    ...fields,
    location: {
      type: 'Point',
      coordinates: [73.8567, 18.5204]
    },
    createdAt: now
  };
  const result = await servicesCollection.insertOne(inserted);
  return { ...inserted, _id: result.insertedId, verification };
}

app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, vehicleNumber, licenseNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role, phone });
    await user.save();

    const normalizedRole = String(role || '').toUpperCase();
    let service = null;
    let verificationMessage = null;

    if (normalizedRole.includes('PROVIDER') || normalizedRole.includes('SERVICE')) {
      service = await upsertAmbulanceUnit(user, {
        providerName: name,
        vehicleNumber,
        licenseNumber,
        phone
      });
      if (!service.verification.valid) {
        verificationMessage = service.verification.message;
      }
      console.log(`Ambulance service upserted for: ${name} (${service.verificationStatus})`);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
      service,
      verificationStatus: service?.verificationStatus,
      message: verificationMessage
    });
  } catch (err) {
    console.error('Registration error details:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service listening on port ${PORT}`);
});
