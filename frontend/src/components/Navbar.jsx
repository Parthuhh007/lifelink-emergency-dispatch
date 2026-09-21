import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 p-4 flex justify-between items-center">
      <div className="flex items-center space-x-2 text-brand-blue font-bold text-xl">
        <Activity size={24} />
        <Link to="/">Lifelink</Link>
      </div>
      <div>
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 font-medium">{user.name} ({user.role})</span>
            <button onClick={handleLogout} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded">Logout</button>
          </div>
        ) : (
          <div className="space-x-4">
            <Link to="/login" className="text-brand-blue font-medium hover:underline">Login</Link>
            <Link to="/register" className="bg-brand-blue text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
