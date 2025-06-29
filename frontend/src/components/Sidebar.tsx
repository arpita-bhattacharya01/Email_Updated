import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  PenSquare, 
  Inbox, 
  Send, 
  File, 
  Trash2, 
  Star, 
  Clock, 
  Tag,
  ChevronDown,
  Plus
} from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block">
      <div className="p-4">
        <button className="w-full flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-6 rounded-2xl shadow-sm transition-colors">
          <PenSquare size={18} />
          <span>Compose</span>
        </button>
      </div>
      
      <nav className="mt-2">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex items-center py-2 px-4 space-x-3 ${
              isActive ? 'bg-blue-100 text-blue-800 rounded-r-full font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Inbox size={18} />
          <span>Inbox</span>
        </NavLink>
        
        <NavLink 
          to="/folder/starred" 
          className={({ isActive }) => 
            `flex items-center py-2 px-4 space-x-3 ${
              isActive ? 'bg-blue-100 text-blue-800 rounded-r-full font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Star size={18} />
          <span>Starred</span>
        </NavLink>
        
        <NavLink 
          to="/folder/sent" 
          className={({ isActive }) => 
            `flex items-center py-2 px-4 space-x-3 ${
              isActive ? 'bg-blue-100 text-blue-800 rounded-r-full font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Send size={18} />
          <span>Sent</span>
        </NavLink>
        
        <NavLink 
          to="/folder/drafts" 
          className={({ isActive }) => 
            `flex items-center py-2 px-4 space-x-3 ${
              isActive ? 'bg-blue-100 text-blue-800 rounded-r-full font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <File size={18} />
          <span>Drafts</span>
        </NavLink>
        
        <NavLink 
          to="/folder/trash" 
          className={({ isActive }) => 
            `flex items-center py-2 px-4 space-x-3 ${
              isActive ? 'bg-blue-100 text-blue-800 rounded-r-full font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Trash2 size={18} />
          <span>Trash</span>
        </NavLink>
        
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between text-gray-600 mb-1">
            <span className="text-sm font-medium">Labels</span>
            <ChevronDown size={16} />
          </div>
          
          <div className="flex items-center py-2 px-4 space-x-3 text-gray-700 hover:bg-gray-100 cursor-pointer">
            <Tag size={18} className="text-green-600" />
            <span>Work</span>
          </div>
          
          <div className="flex items-center py-2 px-4 space-x-3 text-gray-700 hover:bg-gray-100 cursor-pointer">
            <Tag size={18} className="text-blue-600" />
            <span>Personal</span>
          </div>
          
          <div className="flex items-center py-2 px-4 space-x-3 text-gray-700 hover:bg-gray-100 cursor-pointer">
            <Tag size={18} className="text-purple-600" />
            <span>Important</span>
          </div>
          
          <div className="flex items-center py-2 px-4 space-x-3 text-gray-700 hover:bg-gray-100 cursor-pointer">
            <Plus size={18} className="text-gray-500" />
            <span className="text-gray-600">Create new</span>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;