import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Reply, Trash2, ArrowRight, MoreHorizontal, Paperclip } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string;
  };
  attachments: string[];
}

const EmailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmail = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!id) return;
        
        const response = await fetch(`/api/emails/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch email');
        }
        
        const data = await response.json();
        setEmail(data.email);
      } catch (err) {
        setError('Could not load email. It may have been deleted or moved.');
        console.error('Error fetching email:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmail();
  }, [id]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleToggleStar = async () => {
    if (!email) return;
    
    try {
      await fetch(`/api/emails/${email.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isStarred: !email.isStarred })
      });
      
      setEmail(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    } catch (err) {
      console.error('Error updating email:', err);
    }
  };

  const handleTrashEmail = async () => {
    if (!email) return;
    
    try {
      await fetch(`/api/emails/${email.id}/trash`, {
        method: 'PUT'
      });
      
      navigate('/');
    } catch (err) {
      console.error('Error trashing email:', err);
    }
  };

  const handleReply = () => {
    if (!email) return;
    navigate('/compose', { state: { replyTo: email } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button 
          onClick={handleGoBack}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Back</span>
        </button>
        
        <div className="p-6 bg-white rounded-lg shadow-md text-center">
          <p className="text-red-500 mb-4">{error || 'Email not found'}</p>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleGoBack}
          >
            Return to inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handleGoBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} className="mr-1" />
          <span>Back</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToggleStar}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Star 
              size={20} 
              className={email.isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'} 
            />
          </button>
          
          <button 
            onClick={handleReply}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Reply size={20} className="text-gray-500" />
          </button>
          
          <button 
            onClick={handleTrashEmail}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Trash2 size={20} className="text-gray-500" />
          </button>
          
          <button className="p-2 rounded-full hover:bg-gray-100">
            <ArrowRight size={20} className="text-gray-500" />
          </button>
          
          <button className="p-2 rounded-full hover:bg-gray-100">
            <MoreHorizontal size={20} className="text-gray-500" />
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">{email.subject}</h1>
          
          <div className="flex items-start mb-6">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {email.sender.firstName.charAt(0)}
              </div>
            </div>
            
            <div className="ml-4 min-w-0 flex-1">
              <div className="flex justify-between items-baseline">
                <div>
                  <h2 className="text-base font-medium text-gray-900">
                    {email.sender.firstName} {email.sender.lastName} <span className="text-gray-500 font-normal">&lt;{email.sender.email}&gt;</span>
                  </h2>
                  <p className="text-sm text-gray-500">
                    To: {email.recipient.firstName} {email.recipient.lastName} &lt;{email.recipient.email}&gt;
                  </p>
                </div>
                
                <time className="text-sm text-gray-500">
                  {new Date(email.createdAt).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </div>
            </div>
          </div>
          
          <div className="prose max-w-none text-gray-800 mb-6">
            {email.body.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments ({email.attachments.length})</h3>
              <div className="flex flex-wrap gap-3">
                {email.attachments.map((attachment, index) => (
                  <a 
                    key={index}
                    href={`#${attachment}`} 
                    className="flex items-center p-2 border rounded hover:bg-gray-50"
                  >
                    <Paperclip size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{attachment}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <button 
            onClick={handleReply}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Reply size={16} className="mr-2" />
            Reply
          </button>
          
          <div className="flex space-x-2">
            <button 
              onClick={handleTrashEmail}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailView;