// src/components/Navbar.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white font-bold text-lg">
          <Link to="/" className="hover:text-gray-300">
            MyApp
          </Link>
        </div>
        <div>
          {user ? (
            <>
              <Link to="/profile" className="text-blue-400 hover:text-blue-300 mr-4">
                Profile
              </Link>
              <Link to="/logout" className="text-blue-400 hover:text-blue-300 mr-4">
                Logout
              </Link>
            </>
          ) : (
            <Link to="/signin" className="text-blue-400 hover:text-blue-300">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;