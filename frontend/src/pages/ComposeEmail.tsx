import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Minimize2, Maximize2, ChevronDown, Paperclip, MoreVertical, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext'

interface LocationState {
  replyTo?: {
    id: string;
    subject: string;
    sender: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

const ComposeEmail: React.FC = () => {
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMaximized, setIsMaximized] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  // Pre-fill form for reply
  useEffect(() => {
    if (state?.replyTo) {
      const { replyTo } = state;
      setRecipient(replyTo.sender.email);
      setSubject(replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`);
      setBody(
        `\n\n\n-------- Original Message --------\nFrom: ${replyTo.sender.firstName} ${replyTo.sender.lastName} <${replyTo.sender.email}>\n\n`
      );
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!recipient.trim()) {
      setError('Recipient email is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('recipientEmail', recipient);
      formData.append('subject', subject);
      formData.append('body', body);
      attachments.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/emails', {
        method: 'POST',
        body: formData, // content-type handled by browser
      });

      if (!response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          data = null;
        }
        throw new Error(data?.message ?? 'Failed to send email');
      }

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    navigate(-1);
  };

  const handleAttachmentClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      // Clear the input value to allow uploading same files again if needed
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`max-w-4xl mx-auto p-4 ${isMaximized ? 'h-full' : 'max-h-[80vh]'}`}>
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b">
          <h2 className="text-base font-medium text-gray-700">{state?.replyTo ? 'Reply' : 'New Message'}</h2>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
              aria-label={isMaximized ? 'Minimize window' : 'Maximize window'}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
              aria-label="Close compose window"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center border-b pb-2">
              <label className="w-20 text-sm text-gray-600">From:</label>
              <div className="text-sm text-gray-800">
                {user?.firstName} {user?.lastName} &lt;{user?.email}&gt;
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center border-b pb-2">
              <label htmlFor="recipient" className="w-20 text-sm text-gray-600">
                To:
              </label>
              <input
                id="recipient"
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 outline-none text-sm"
                placeholder="Recipient email"
                required
              />
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center border-b pb-2">
              <label htmlFor="subject" className="w-20 text-sm text-gray-600">
                Subject:
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 outline-none text-sm"
                placeholder="Subject"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-64 outline-none text-sm resize-none"
              placeholder="Compose your email..."
              required
            />
          </div>

          {attachments.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Attachments:</h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
                  >
                    <span className="truncate max-w-[150px]" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={removeAttachment(index)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      aria-label={`Remove attachment ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <div className="flex">
              <button
                type="submit"
                disabled={isSending}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>

              <div className="flex ml-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept="*"
                />
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label="Attach files"
                >
                  <Paperclip size={20} />
                </button>

                <button
                  type="button"
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label="More options"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
              aria-label="Discard message"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeEmail;
