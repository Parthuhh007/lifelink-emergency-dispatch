import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import ServiceDashboard from './pages/ServiceDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <Navbar user={user} setUser={setUser} />
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to={user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'SERVICE_PROVIDER' ? '/provider' : '/user') : '/login'} />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/user" element={user?.role === 'USER' ? <UserDashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/provider" element={user?.role === 'SERVICE_PROVIDER' ? <ServiceDashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={user?.role === 'ADMIN' ? <AdminDashboard user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
