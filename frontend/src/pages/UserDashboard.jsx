import { useState, useEffect } from 'react';
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

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      map.setView(position, 16);
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
  if (isValidCoord(em?.latitude, em?.longitude)) {
    return [Number(em.latitude), Number(em.longitude)];
  }
  const lng = em?.location?.coordinates?.[0];
  const lat = em?.location?.coordinates?.[1];
  if (isValidCoord(lat, lng)) return [Number(lat), Number(lng)];
  return null;
}

export default function UserDashboard({ user }) {
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [emergencies, setEmergencies] = useState([]);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/emergencies/user/${user.id}`);
      setEmergencies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const geoErrorMessage = (error) => {
    if (!error) return 'Unable to retrieve your location';
    if (error.code === 1) return 'Location permission denied. Enable location access and try again.';
    if (error.code === 2) return 'Location currently unavailable. Try again or enter an address.';
    if (error.code === 3) return 'Location request timed out. Try again.';
    return error.message || 'Unable to retrieve your location';
  };

  const applyPosition = (latitude, longitude) => {
    if (!isValidCoord(latitude, longitude)) {
      setMessage('Invalid coordinates received. Please try locating again.');
      return false;
    }
    setCoords({ latitude: Number(latitude), longitude: Number(longitude) });
    setMessage('Current location captured. You can submit the ambulance request.');
    return true;
  };

  const handleUseCurrentLocation = () => {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPosition(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      (error) => {
        setMessage(geoErrorMessage(error));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const submitEmergency = async (latitude, longitude) => {
    await axios.post('http://localhost:8000/api/emergencies', {
      userId: user.id,
      emergencyType: 'AMBULANCE',
      description,
      address,
      patientName: user.name,
      phone: user.phone,
      latitude,
      longitude
    });
    setMessage('Emergency reported successfully! Finding nearby ambulance services...');
    setDescription('');
    fetchEmergencies();
  };

  const handleReport = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (coords && isValidCoord(coords.latitude, coords.longitude)) {
      submitEmergency(coords.latitude, coords.longitude)
        .catch(() => setMessage('Failed to report emergency'))
        .finally(() => setLoading(false));
      return;
    }

    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        if (!applyPosition(latitude, longitude)) {
          setLoading(false);
          return;
        }
        await submitEmergency(latitude, longitude);
      } catch (err) {
        setMessage('Failed to report emergency');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setMessage(geoErrorMessage(error));
      setLoading(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const mapPosition = coords ? [coords.latitude, coords.longitude] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-brand-red">Request Emergency Ambulance</h2>
        {message && <div className="bg-blue-100 text-blue-800 p-3 rounded mb-4 text-sm">{message}</div>}
        <form onSubmit={handleReport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
              <span className="text-xl mr-3">🚑</span>
              <div>
                <p className="font-bold text-gray-800">Emergency Ambulance Dispatch</p>
                <p className="text-xs text-gray-500">LifeLink is optimized for rapid ambulance dispatch.</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pickup Address (Optional)</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              placeholder="Street, area, PIN if GPS is unavailable"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" rows="3" placeholder="Briefly describe the medical emergency..."></textarea>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md font-bold hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
          >
            {locating ? 'Detecting location...' : 'Use Current Location'}
          </button>
          {coords && (
            <p className="text-xs text-gray-500">
              GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
          )}
          <div className="h-56 rounded overflow-hidden z-0 border border-gray-200">
            <MapContainer
              center={mapPosition || [20.5937, 78.9629]}
              zoom={mapPosition ? 16 : 5}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {mapPosition && <RecenterMap position={mapPosition} />}
              {mapPosition && (
                <Marker position={mapPosition}>
                  <Popup>Your current location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-3 px-4 rounded-md font-bold text-lg hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Locating...' : 'REQUEST AMBULANCE USING MY LOCATION'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Your Recent Emergencies</h2>
        {emergencies.length === 0 ? (
          <p className="text-gray-500">No recent emergencies.</p>
        ) : (
          <div className="space-y-4">
            {emergencies.map(em => {
              const pos = emergencyCoords(em);
              return (
              <div key={em._id} className="border p-4 rounded-md bg-gray-50 flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">🚑 {em.emergencyType}</span>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${em.status === 'SEARCHING' || em.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                    {em.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{new Date(em.createdAt).toLocaleString()}</div>
                <div className="text-sm">Assigned to: {em.assignedServiceId || em.providerId || 'None yet'}</div>

                {pos && (
                <div className="h-32 mt-2 rounded overflow-hidden z-0">
                  <MapContainer center={pos} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={pos}></Marker>
                  </MapContainer>
                </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
