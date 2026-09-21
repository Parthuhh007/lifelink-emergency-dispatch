import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ADMIN_API = 'http://localhost:3005';
const EMERGENCY_API = 'http://localhost:8000/api/emergencies';

function isValidCoord(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

function unitCoords(s) {
  const lng = s?.location?.coordinates?.[0];
  const lat = s?.location?.coordinates?.[1];
  if (isValidCoord(lat, lng)) return [Number(lat), Number(lng)];
  return null;
}

function emergencyCoords(em) {
  if (isValidCoord(em?.latitude, em?.longitude)) return [Number(em.latitude), Number(em.longitude)];
  const lng = em?.location?.coordinates?.[0];
  const lat = em?.location?.coordinates?.[1];
  if (isValidCoord(lat, lng)) return [Number(lat), Number(lng)];
  return null;
}

export default function AdminDashboard() {
  const [pendingServices, setPendingServices] = useState([]);
  const [approvedServices, setApprovedServices] = useState([]);
  const [rejectedServices, setRejectedServices] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const seenRef = useRef(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    fetchAllServices();
    const interval = setInterval(fetchAllServices, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllServices = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/services`);
      const all = Array.isArray(res.data) ? res.data : [];

      if (initialized.current) {
        const notices = [];
        all.forEach((s) => {
          const key = `${s._id}:${s.verificationStatus || s.status}:${s.updatedAt || s.createdAt}`;
          if (!seenRef.current.has(key)) {
            const prevKeys = [...seenRef.current].filter((k) => k.startsWith(`${s._id}:`));
            if (prevKeys.length) {
              notices.push(`${s.providerName || s.userId?.name || 'Provider'} updated. Verification: ${String(s.verificationStatus || s.status || 'PENDING').toUpperCase()}`);
            } else {
              notices.push(`${s.providerName || s.userId?.name || 'Provider'} submitted registration. Verification: ${String(s.verificationStatus || s.status || 'PENDING').toUpperCase()}`);
            }
            seenRef.current.add(key);
          }
        });
        if (notices.length) setMessage(notices[0]);
      } else {
        all.forEach((s) => {
          seenRef.current.add(`${s._id}:${s.verificationStatus || s.status}:${s.updatedAt || s.createdAt}`);
        });
        initialized.current = true;
      }

      setPendingServices(all.filter(s => {
        const stat = (s.verificationStatus || s.status || 'PENDING').toUpperCase();
        return stat === 'PENDING';
      }));

      setApprovedServices(all.filter(s => {
        const stat = (s.verificationStatus || s.status || '').toUpperCase();
        return stat === 'APPROVED';
      }));

      setRejectedServices(all.filter(s => {
        const stat = (s.verificationStatus || s.status || '').toUpperCase();
        return stat === 'REJECTED';
      }));
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setMessage('Error loading service units. Check backend connection.');
    } finally {
      setLoading(false);
    }

    try {
      const emRes = await axios.get(EMERGENCY_API);
      setEmergencies(Array.isArray(emRes.data) ? emRes.data : []);
    } catch {
      // Keep admin monitoring of providers even if emergency feed is unavailable
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading Admin Dashboard...</div>;

  const fleet = [...approvedServices, ...pendingServices, ...rejectedServices];

  const renderTable = (rows, showAvailability) => (
    rows.length === 0 ? (
      <p className="text-gray-500 text-sm italic">No records.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Unit Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Vehicle No</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">License No</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Verification</th>
              {showAvailability && <th className="px-4 py-3 text-left font-semibold text-gray-700">Availability</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(s => (
              <tr key={s._id}>
                <td className="px-4 py-3 font-medium text-gray-900">{s.providerName || s.userId?.name || 'Unknown Provider'}</td>
                <td className="px-4 py-3 text-gray-600">{s.vehicleNumber || 'N/A'}</td>
                <td className="px-4 py-3 text-gray-600">{s.licenseNumber || 'N/A'}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone || s.userId?.phone || 'N/A'}</td>
                <td className="px-4 py-3 text-gray-600">{String(s.verificationStatus || s.status || 'PENDING').toUpperCase()}</td>
                {showAvailability && (
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.availability === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {s.availability || 'OFFLINE'}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dispatch Command</h1>
        <p className="text-sm text-gray-500">Read-only monitoring of ambulance verification and operational status.</p>
        {message && <div className={`mt-3 p-3 rounded text-sm ${message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>{message}</div>}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-orange-600">⏳ Pending Provider Approvals ({pendingServices.length})</h2>
        {pendingServices.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No pending applications right now.</p>
        ) : renderTable(pendingServices, false)}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-green-700">✅ Approved Fleet Units ({approvedServices.length})</h2>
        {approvedServices.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No approved ambulance units active yet.</p>
        ) : renderTable(approvedServices, true)}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-red-700">❌ Rejected Units ({rejectedServices.length})</h2>
        {renderTable(rejectedServices, true)}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🗺️ Fleet & Pickup Monitoring</h2>
        <div className="w-full h-[360px] rounded-lg overflow-hidden border border-gray-200 relative z-0">
          <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {fleet.map((s) => {
              const pos = unitCoords(s);
              if (!pos) return null;
              return (
                <Marker key={s._id} position={pos}>
                  <Popup>
                    <strong>{s.providerName || 'Ambulance'}</strong><br />
                    Verification: {String(s.verificationStatus || s.status || 'PENDING').toUpperCase()}<br />
                    Operational: {s.availability || 'OFFLINE'}
                  </Popup>
                </Marker>
              );
            })}
            {emergencies.filter(em => !['RESOLVED', 'COMPLETED', 'CANCELLED'].includes(String(em.status || '').toUpperCase())).map((em) => {
              const pos = emergencyCoords(em);
              if (!pos) return null;
              return (
                <Marker key={em._id} position={pos}>
                  <Popup>
                    <strong>Patient pickup</strong><br />
                    {em.patientName || em.emergencyType}<br />
                    Status: {em.status}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
