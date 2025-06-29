import React from 'react';
import { Menu, Search, Settings, HelpCircle, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <button className="p-2 rounded-full hover:bg-gray-100 lg:hidden">
            <Menu size={20} />
          </button>
          <div className="flex items-center ml-2">
            <svg width="40" height="30" viewBox="0 0 40 30" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5h36v24H4z" fill="#4285F4" stroke="#4285F4" />
              <path d="M4 5h36v24H4z" fill="#EA4335" stroke="#EA4335" />
              <path d="M40 5H4v24h36V5z" fill="#FBBC04" stroke="#FBBC04" />
              <path d="M4 5h36v24H4z" fill="#34A853" stroke="#34A853" />
              <path d="M4 29V5l18 12z" fill="#C5221F" stroke="#C5221F" />
              <path d="M40 29V5L22 17z" fill="#C5221F" stroke="#C5221F" />
              <path d="M4 5l18 12L40 5z" fill="#C5221F" stroke="#C5221F" />
              <path d="M4 29l18-12 18 12z" fill="#C5221F" stroke="#C5221F" />
            </svg>
            <h1 className="ml-2 text-xl font-semibold text-gray-800">Gmail</h1>
          </div>
        </div>

        <div className="flex-1 max-w-3xl mx-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search mail"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <HelpCircle size={20} className="text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Settings size={20} className="text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Bell size={20} className="text-gray-600" />
          </button>
          <div className="ml-2">
            <button className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-medium">
              {user?.firstName?.charAt(0)?.toUpperCase() || '?'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
