import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import AuthContext from '../../context/AuthContext';

interface EmailItem {
  id: string;
  subject: string;
  sender: {
    firstName: string;
    lastName: string;
    email: string;
  };
  body: string;
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  folder: string;
}

export default function UserDashboard() {
  const { folderName = 'inbox' } = useParams<{ folderName?: string }>();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const logout = authContext?.logout;

  useEffect(() => {
    if (!user) {
      navigate('/signin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/emails', {
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${user?.token}`, // Uncomment if needed
          },
        });

        if (!response.ok) throw new Error('Failed to fetch emails');

        const data = await response.json() as { emails: EmailItem[] };

        const filtered = data.emails.filter((email) => {
          if (folderName === 'starred') return email.isStarred;
          if (folderName === 'all') return true;
          return email.folder === folderName;
        });

        setEmails(filtered);
      } catch (err) {
        console.error('Error fetching emails:', err);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchEmails();
  }, [folderName, user]);

  const handleSelectEmail = (id: string) => {
    setSelectedEmails((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleOpenEmail = (id: string) => {
    navigate(`/email/${id}`);
  };

  const handleToggleStar = async (
    id: string,
    isStarred: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !isStarred }),
      });

      if (!response.ok) throw new Error('Failed to update star status');

      setEmails((prev) =>
        prev.map((email) =>
          email.id === id ? { ...email, isStarred: !isStarred } : email
        )
      );
    } catch (err) {
      console.error('Error updating star status:', err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredEmails = emails.filter((email) =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.sender.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.sender.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const folderTitles: Record<string, string> = {
    inbox: 'Inbox',
    sent: 'Sent',
    drafts: 'Drafts',
    trash: 'Trash',
    spam: 'Spam',
    starred: 'Starred',
    all: 'All Emails',
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Main */}
      <main className="flex-1 flex flex-col bg-white">
        <header className="p-6 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {folderTitles[folderName] || 'Emails'}
          </h2>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search emails..."
            className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-gray-100 rounded-full p-4">
              <svg width="60" height="48" viewBox="0 0 75 60" className="opacity-50">
                <path d="M7.5 10h60v45H7.5z" fill="#9CA3AF" />
                <path d="M7.5 55V10l30 22.5z" fill="#6B7280" />
                <path d="M67.5 55V10L37.5 32.5z" fill="#6B7280" />
                <path d="M7.5 10l30 22.5L67.5 10z" fill="#6B7280" />
                <path d="M7.5 55l30-22.5 30 22.5z" fill="#6B7280" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-600">No emails found</h3>
            <p className="text-gray-500">Your {folderTitles[folderName] || folderName} is empty</p>
            {folderName === 'inbox' && (
              <button
                className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                onClick={() => navigate('/compose')}
              >
                Compose new email
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleOpenEmail(email.id)}
                className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer ${
                  !email.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center mr-3">
                  <input
                    type="checkbox"
                    checked={selectedEmails.includes(email.id)}
                    onChange={() => handleSelectEmail(email.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 text-blue-600 rounded border-gray-300"
                  />
                  <button
                    onClick={(e) => handleToggleStar(email.id, email.isStarred, e)}
                    className="ml-2"
                    aria-label={email.isStarred ? 'Unstar email' : 'Star email'}
                  >
                    <Star
                      size={18}
                      className={
                        email.isStarred
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-400'
                      }
                    />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between">
                    <h3 className={`text-sm ${!email.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                      {email.sender.firstName} {email.sender.lastName}
                    </h3>
                    <time className="text-xs text-gray-500">
                      {new Date(email.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <p className={`text-sm ${!email.isRead ? 'font-medium' : ''} text-gray-900 truncate`}>
                    {email.subject}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {email.body.slice(0, 120)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Sidebar */}
      <aside className="w-72 bg-gray-50 border-l border-gray-300 p-6 flex flex-col">
        <div className="flex items-center mb-6 space-x-2">
          <img src="/mail.png" alt="Mail Logo" className="w-8 h-8" />
          <h1 className="text-xl font-bold text-gray-700">Mail</h1>
        </div>

        {Object.entries(folderTitles).map(([key, label]) => (
          <button
            key={key}
            className={`mb-3 px-4 py-2 rounded hover:bg-gray-300 text-left w-full ${
              folderName === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => navigate(`/dashboard/${key}`)}
          >
            {label}
          </button>
        ))}

        <div className="mt-auto">
          <button
            onClick={() => logout?.()}
            className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
          >
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}
