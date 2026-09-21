import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ALERT_AUDIO = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const LICENSE_REJECTION_MESSAGE = 'Verification failed: License ID must end with .service or .services';

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      map.setView(position, 14);
    }
  }, [position, map]);
  return null;
}

function isValidCoord(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

function emergencyCoords(em) {
  if (!em) return null;
  if (isValidCoord(em.latitude, em.longitude)) return [Number(em.latitude), Number(em.longitude)];
  const lng = em.location?.coordinates?.[0];
  const lat = em.location?.coordinates?.[1];
  if (isValidCoord(lat, lng)) return [Number(lat), Number(lng)];
  return null;
}

function emergencyStatus(em) {
  return String(em?.status || '').toUpperCase();
}

export default function ServiceDashboard({ user }) {
  const [serviceUnit, setServiceUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState('OFFLINE');
  const [emergencies, setEmergencies] = useState([]);
  const [providerName, setProviderName] = useState(user?.name || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const alertedIds = useRef(new Set());
  const dismissedIds = useRef(new Set());
  const pollRef = useRef(null);
  const alertsReady = useRef(false);

  const userId = user?._id || user?.id;

  const playAlertSound = () => {
    try {
      const audio = new Audio(ALERT_AUDIO);
      audio.volume = 0.8;
      audio.play().catch(e => console.log('Audio playback restricted by browser policy:', e));
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      let unit = null;
      try {
        const mine = await axios.get(`http://localhost:8000/api/response/my-service`, { params: { userId } });
        unit = mine.data;
      } catch {
        const serviceRes = await axios.get(`http://localhost:3005/services`);
        const allServices = Array.isArray(serviceRes.data) ? serviceRes.data : [];
        unit = allServices.find(s => String(s.userId?._id || s.userId) === String(userId)) || null;
      }

      if (unit) {
        setServiceUnit(unit);
        setAvailability(unit.availability || 'OFFLINE');
        setProviderName(unit.providerName || user?.name || '');
        setVehicleNumber(unit.vehicleNumber || '');
        setLicenseNumber(unit.licenseNumber || '');
        setPhone(unit.phone || user?.phone || '');
      }

      const approved = String(unit?.verificationStatus || unit?.status || '').toUpperCase() === 'APPROVED';
      const unitAvailable = String(unit?.availability || '').toUpperCase() === 'AVAILABLE';
      const unitId = unit?._id ? String(unit._id) : null;

      try {
        const emergencyRes = await axios.get(`http://localhost:8000/api/emergencies`);
        const activeList = Array.isArray(emergencyRes.data) ? emergencyRes.data : [];
        const visible = activeList.filter((em) => {
          const id = String(em._id);
          if (dismissedIds.current.has(id)) return false;
          const st = emergencyStatus(em);
          const assigned = em.assignedServiceId ? String(em.assignedServiceId) : '';
          const mine = unitId && assigned === unitId;
          const claimable = ['SEARCHING', 'PENDING'].includes(st) && !assigned;
          const closed = ['RESOLVED', 'COMPLETED', 'CANCELLED'].includes(st);
          if (closed && !mine) return false;
          if (mine) return true;
          return approved && unitAvailable && claimable;
        });

        visible.forEach((em) => {
          const id = String(em._id);
          const st = emergencyStatus(em);
          if (['SEARCHING', 'PENDING'].includes(st) && !alertedIds.current.has(id)) {
            if (alertsReady.current) playAlertSound();
            alertedIds.current.add(id);
          }
        });
        alertsReady.current = true;

        setEmergencies(visible);
      } catch (e) {
        console.debug('Emergency feed sync note:', e.message);
      }

      setError('');
    } catch (err) {
      console.error('Failed to load service status:', err);
      setError('Could not load service unit status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    fetchDashboardData();
    pollRef.current = setInterval(fetchDashboardData, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  const toggleAvailability = async () => {
    if (!serviceUnit || !serviceUnit._id) {
      alert('Error: Service Unit ID is missing.');
      return;
    }

    try {
      const nextAvailability = availability === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
      setAvailability(nextAvailability);

      const response = await axios.patch(`http://localhost:3005/services/${serviceUnit._id}/status`, {
        availability: nextAvailability
      });

      if (response.data && response.data.availability) {
        setAvailability(response.data.availability);
      }

      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update availability:', err.response?.data || err.message);
      setAvailability(availability);
      alert(`Failed to update availability: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleRegisterUnit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await axios.put('http://localhost:8000/api/response/my-service', {
        userId,
        providerName,
        vehicleNumber,
        licenseNumber,
        phone
      });
      setServiceUnit(res.data);
      setAvailability(res.data.availability || 'OFFLINE');
    } catch (err) {
      const data = err.response?.data;
      if (data && (data.verificationStatus || data._id)) {
        setServiceUnit(data);
        setAvailability(data.availability || 'OFFLINE');
      }
      setError(data?.error || data?.message || LICENSE_REJECTION_MESSAGE);
    } finally {
      setSaving(false);
      fetchDashboardData();
    }
  };

  const handleAccept = async (emergency) => {
    try {
      await axios.post('http://localhost:8000/api/response/accept', {
        emergencyId: emergency._id,
        userId
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to accept emergency');
      fetchDashboardData();
    }
  };

  const handleReject = async (emergency) => {
    dismissedIds.current.add(String(emergency._id));
    setEmergencies((prev) => prev.filter((em) => String(em._id) !== String(emergency._id)));
    try {
      await axios.post('http://localhost:8000/api/response/reject', {
        emergencyId: emergency._id,
        userId
      });
    } catch (err) {
      console.error(err);
    }
    fetchDashboardData();
  };

  const handleArrived = async (emergency) => {
    try {
      await axios.post('http://localhost:8000/api/response/arrived', {
        emergencyId: emergency._id,
        userId
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to mark arrived');
    }
  };

  const handleComplete = async (emergency) => {
    try {
      await axios.post('http://localhost:8000/api/response/complete', {
        emergencyId: emergency._id,
        userId
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to complete dispatch');
    }
  };

  const handleNavigate = (emergency) => {
    const pos = emergencyCoords(emergency);
    if (pos) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }
    if (emergency.address) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(emergency.address)}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }
    alert('Navigation unavailable: no valid pickup coordinates or address.');
  };

  if (loading) return <div className="p-6 text-gray-600">Loading Service Dashboard...</div>;

  const currentStatus = String(serviceUnit?.verificationStatus || serviceUnit?.status || 'PENDING').toUpperCase();
  const isApproved = currentStatus === 'APPROVED';
  const isRejected = currentStatus === 'REJECTED';
  const unitId = serviceUnit?._id ? String(serviceUnit._id) : null;

  const mapCenter = [
    serviceUnit?.location?.coordinates?.[1] || 18.5204,
    serviceUnit?.location?.coordinates?.[0] || 73.8567
  ];

  const myActive = emergencies.find((em) => {
    const assigned = em.assignedServiceId ? String(em.assignedServiceId) : '';
    return unitId && assigned === unitId && ['DISPATCHED', 'ASSIGNED', 'ARRIVED'].includes(emergencyStatus(em));
  });

  const patientPos = myActive ? emergencyCoords(myActive) : emergencyCoords(emergencies[0]);
  const focusPos = patientPos || mapCenter;

  const registrationForm = (
    <form onSubmit={handleRegisterUnit} className="space-y-3 text-left max-w-md mx-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700">Provider Name</label>
        <input value={providerName} onChange={e => setProviderName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Registration Number</label>
        <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">License ID</label>
        <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
      </div>
      <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium disabled:opacity-50">
        {saving ? 'Verifying...' : 'Submit Registration'}
      </button>
    </form>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-800">Ambulance Unit</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">🚑 AMBULANCE SERVICE</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isApproved ? 'bg-green-100 text-green-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
              {currentStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Unit ID: {serviceUnit?._id || 'N/A'}</p>
        </div>

        <div>
          {isApproved ? (
            <button
              onClick={toggleAvailability}
              disabled={['DISPATCHED', 'ARRIVED', 'BUSY'].includes(String(availability).toUpperCase())}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm text-white shadow-md transition-all ${availability === 'AVAILABLE' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {availability === 'AVAILABLE' ? '🔴 Go Offline' : '🟢 Go Available'}
            </button>
          ) : (
            <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm border border-gray-300">
              {isRejected ? '❌ VERIFICATION REJECTED' : '⏳ AWAITING VERIFICATION'}
            </span>
          )}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-800 rounded text-sm">{error}</div>}

      {isApproved ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Medical Dispatch Feed</h2>
            <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-center">
              {availability === 'AVAILABLE' ? (
                <p className="text-green-600 font-semibold text-sm animate-pulse">🟢 Online. Listening for emergency dispatch broadcasts...</p>
              ) : (
                <p className="text-gray-500 text-sm">🔴 Ambulance is currently {String(availability).toLowerCase()}. Switch to 'Go Available' to receive emergency SOS requests.</p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live SOS Broadcasts ({emergencies.length})</h3>
              {emergencies.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No active emergency dispatches right now.</p>
              ) : (
                emergencies.map((em) => {
                  const st = emergencyStatus(em);
                  const assigned = em.assignedServiceId ? String(em.assignedServiceId) : '';
                  const mine = unitId && assigned === unitId;
                  const pos = emergencyCoords(em);
                  const claimable = ['SEARCHING', 'PENDING'].includes(st) && !assigned;
                  return (
                    <div
                      key={em._id}
                      className={claimable
                        ? 'p-3 animate-pulse border-4 border-red-600 bg-red-100 rounded text-xs space-y-1'
                        : 'p-3 bg-red-50 border border-red-200 rounded text-xs space-y-1'}
                    >
                      <p className="font-bold text-red-700">🚨 EMERGENCY SOS</p>
                      <p><strong>Patient Name:</strong> {em.patientName || em.userName || 'Emergency Caller'}</p>
                      <p><strong>Phone:</strong> {em.phone || 'N/A'}</p>
                      <p><strong>Emergency Type:</strong> {em.emergencyType || 'AMBULANCE'}</p>
                      <p><strong>Pickup Address:</strong> {em.address || 'Coordinates Broadcasted'}</p>
                      {pos
                        ? <p><strong>Precise pickup location available:</strong> {pos[0]}, {pos[1]}</p>
                        : <p><strong>Pickup coordinates:</strong> unavailable</p>}
                      <p><strong>Status:</strong> {st}</p>
                      {claimable && (
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleAccept(em)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">Accept</button>
                          <button onClick={() => handleReject(em)} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">Reject</button>
                        </div>
                      )}
                      {mine && ['DISPATCHED', 'ASSIGNED', 'ARRIVED'].includes(st) && (
                        <div className="space-y-2 pt-2">
                          <button onClick={() => handleNavigate(em)} className="w-full bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">Navigate</button>
                          {['DISPATCHED', 'ASSIGNED'].includes(st) && (
                            <button onClick={() => handleArrived(em)} className="w-full bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">Arrived</button>
                          )}
                          {st === 'ARRIVED' && (
                            <button onClick={() => handleComplete(em)} className="w-full bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold hover:bg-gray-900">Complete Dispatch</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 pt-4 border-t border-gray-100">
              <p><strong>Provider Name:</strong> {serviceUnit?.providerName || user?.name}</p>
              <p><strong>Vehicle Number:</strong> {serviceUnit?.vehicleNumber || 'N/A'}</p>
              <p><strong>License Number:</strong> {serviceUnit?.licenseNumber || 'N/A'}</p>
              <p><strong>Phone:</strong> {serviceUnit?.phone || user?.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🗺️ Live Dispatch Map (Leaflet)</h2>
            <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200 relative z-0">
              <MapContainer
                center={focusPos}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap position={focusPos} />
                <Marker position={mapCenter}>
                  <Popup>
                    <strong>{serviceUnit?.providerName || 'Ambulance Unit'}</strong><br />
                    Vehicle: {serviceUnit?.vehicleNumber || 'N/A'}<br />
                    State: {availability}
                  </Popup>
                </Marker>
                {emergencies.map((em) => {
                  const pos = emergencyCoords(em);
                  if (!pos) return null;
                  return (
                    <Marker key={em._id} position={pos}>
                      <Popup>
                        <strong>Patient pickup</strong><br />
                        {em.patientName || 'Emergency Caller'}<br />
                        {em.address || `${pos[0]}, ${pos[1]}`}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center space-y-4">
          <div className="text-4xl">{isRejected ? '❌' : '⏳'}</div>
          <h2 className="text-xl font-bold text-gray-800">
            {isRejected ? 'Your registration was rejected' : 'Your registration is pending verification'}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            {isRejected
              ? LICENSE_REJECTION_MESSAGE
              : 'Submit your ambulance unit details. License ID must end with .service or .services for automatic approval.'}
          </p>
          {registrationForm}
        </div>
      )}
    </div>
  );
}
