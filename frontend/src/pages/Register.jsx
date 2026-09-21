import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register({ setUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');

  // Extra fields for Service Providers
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [serviceType, setServiceType] = useState('AMBULANCE');

  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        email,
        password,
        role,
        ...(role === 'SERVICE_PROVIDER' && {
          phone,
          vehicleNumber,
          licenseNumber,
          serviceType
        })
      };

      const res = await axios.post('http://localhost:8000/api/auth/register', payload);

      if (res.data.message) {
        setError(res.data.message);
      }

      if (res.data.token) localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      }
      if (!res.data.message) {
        navigate('/');
      } else {
        setTimeout(() => navigate('/'), 1200);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Register</h2>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-white">
            <option value="USER">Normal User</option>
            <option value="SERVICE_PROVIDER">Emergency Service Provider</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>

        {/* Additional provider fields appear only when SERVICE_PROVIDER is chosen */}
        {role === 'SERVICE_PROVIDER' && (
          <div className="space-y-4 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Type</label>
              <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-white">
                <option value="AMBULANCE">Ambulance</option>
                <option value="TOWING">Towing</option>
                <option value="FIRE">Fire Squad</option>
                <option value="MEDICAL">Medical Response</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle / Unit Number</label>
              <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">License / Registration ID</label>
              <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
            </div>
          </div>
        )}

        <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium transition">
          Register
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-600">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
      </p>
    </div>
  );
}