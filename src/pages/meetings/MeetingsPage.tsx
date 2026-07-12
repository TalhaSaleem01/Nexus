import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check, X, Video, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'business_nexus_token';

interface MeetingUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Meeting {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requesterId: number;
  recipientId: number;
  requester: MeetingUser;
  recipient: MeetingUser;
}

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // New meeting form state
  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const getToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/meetings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load meetings');
      const data = await res.json();
      setMeetings(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          recipientId: Number(recipientId),
          title,
          description,
          startTime,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to schedule meeting');

      toast.success('Meeting request sent!');
      setShowForm(false);
      setRecipientId('');
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      fetchMeetings();
    } catch (error) {
      setFormError((error as Error).message);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/meetings/${id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to accept');
      toast.success('Meeting accepted');
      fetchMeetings();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/meetings/${id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject');
      toast.success('Meeting rejected');
      fetchMeetings();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this meeting?')) return;
    try {
      const res = await fetch(`${API_URL}/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel');
      toast.success('Meeting cancelled');
      fetchMeetings();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'accepted': return 'secondary';
      case 'rejected': return 'gray';
      case 'cancelled': return 'gray';
      default: return 'primary';
    }
  };

  if (!user) return null;

  const inputClasses =
    'w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 focus:border-primary-500 focus:ring-primary-500 focus:outline-none';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<PlusCircle size={18} />} onClick={() => setShowForm(!showForm)}>
          Schedule Meeting
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Meeting Request</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient User ID
                </label>
                <input
                  type="number"
                  required
                  className={inputClasses}
                  placeholder="e.g. 1"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter the ID of the investor/entrepreneur you want to meet with.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className={inputClasses}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    className={inputClasses}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    className={inputClasses}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">My Meetings</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No meetings scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const isRecipient = meeting.recipientId === Number(user.id);
                const otherPerson = isRecipient ? meeting.requester : meeting.recipient;

                return (
                  <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900">{meeting.title}</h3>
                          <Badge variant={statusVariant(meeting.status)} size="sm">
                            {meeting.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          With {otherPerson?.name || 'Unknown'} ({otherPerson?.role})
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          {new Date(meeting.startTime).toLocaleString()} -{' '}
                          {new Date(meeting.endTime).toLocaleTimeString()}
                        </p>
                        {meeting.description && (
                          <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {meeting.status === 'pending' && isRecipient && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success-600"
                              onClick={() => handleAccept(meeting.id)}
                            >
                              <Check size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error-600"
                              onClick={() => handleReject(meeting.id)}
                            >
                              <X size={18} />
                            </Button>
                          </>
                        )}

                        {meeting.status === 'accepted' && (
                          <Link to={`/call/${meeting.id}`}>
                            <Button variant="outline" size="sm" leftIcon={<Video size={16} />}>
                              Join Call
                            </Button>
                          </Link>
                        )}

                        {(meeting.status === 'pending' || meeting.status === 'accepted') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400"
                            onClick={() => handleCancel(meeting.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};