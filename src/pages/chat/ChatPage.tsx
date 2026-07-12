import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Info, Smile, MessageCircle, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { Message } from '../../types';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace('/api', '');
const TOKEN_STORAGE_KEY = 'business_nexus_token';

interface ChatPartnerInfo {
  id: string;
  name: string;
  email?: string;
  role?: string;
  profilePicture: string;
  isOnline: boolean;
}

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatPartner, setChatPartner] = useState<ChatPartnerInfo | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const getToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchChatPartner = useCallback(async () => {
    if (!userId) {
      setChatPartner(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('User not found');
      const data = await res.json();

      const resolvedAvatar: string =
        data.profilePicture && data.profilePicture.length > 0
          ? data.profilePicture
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;

      setChatPartner({
        id: String(data.id),
        name: data.name,
        email: data.email,
        role: data.role,
        profilePicture: resolvedAvatar,
        isOnline: false,
      });
    } catch (error) {
      setChatPartner(null);
    }
  }, [userId]);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/chat/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error(error);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetchChatPartner();
    fetchMessages();
    setShowInfoPanel(false); // close info panel when switching conversations
  }, [fetchChatPartner, fetchMessages]);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register-user', currentUser.id);
    });

    socket.on('new-chat-message', (message: Message) => {
      if (userId && (message.senderId === userId || message.receiverId === userId)) {
        setMessages((prev) => [...prev, message]);
      } else {
        toast.success('New message received');
      }
      fetchConversations();
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser, userId, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId) return;

    const contentToSend = newMessage;
    setNewMessage('');

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ receiverId: userId, content: contentToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message');

      setMessages((prev) => [...prev, data]);
      fetchConversations();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const buildRoomId = () => {
    if (!currentUser || !chatPartner) return null;
    const ids = [currentUser.id, chatPartner.id].sort();
    return `chat-${ids[0]}-${ids[1]}`;
  };

  const handleStartVoiceCall = () => {
    const roomId = buildRoomId();
    if (!roomId) return;
    navigate(`/call/${roomId}?mode=audio`);
  };

  const handleStartVideoCall = () => {
    const roomId = buildRoomId();
    if (!roomId) return;
    navigate(`/call/${roomId}?mode=video`);
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      {/* Conversations sidebar */}
      <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200">
        <ChatUserList conversations={conversations} />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0">
          {chatPartner ? (
            <>
              <div className="border-b border-gray-200 p-4 flex justify-between items-center">
                <div className="flex items-center min-w-0">
                  <Avatar
                    src={chatPartner.profilePicture}
                    alt={chatPartner.name}
                    size="md"
                    status={chatPartner.isOnline ? 'online' : 'offline'}
                    className="mr-3 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium text-gray-900 truncate">{chatPartner.name}</h2>
                    <p className="text-sm text-gray-500">
                      {chatPartner.isOnline ? 'Online' : 'Last seen recently'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2"
                    aria-label="Voice call"
                    onClick={handleStartVoiceCall}
                  >
                    <Phone size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2"
                    aria-label="Video call"
                    onClick={handleStartVideoCall}
                  >
                    <Video size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-full p-2 ${showInfoPanel ? 'bg-primary-50 text-primary-700' : ''}`}
                    aria-label="Info"
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                  >
                    <Info size={18} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isCurrentUser = message.senderId === currentUser.id;
                      const senderInfo = isCurrentUser
                        ? { name: currentUser.name, avatarUrl: currentUser.avatarUrl }
                        : { name: chatPartner.name, avatarUrl: chatPartner.profilePicture };

                      return (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          isCurrentUser={isCurrentUser}
                          senderInfo={senderInfo}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <MessageCircle size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
                    <p className="text-gray-500 mt-1">Send a message to start the conversation</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 flex justify-center">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full max-w-2xl">
                  <Button type="button" variant="ghost" size="sm" className="rounded-full p-2 flex-shrink-0" aria-label="Add emoji">
                    <Smile size={20} />
                  </Button>

                  <div className="flex-1 min-w-0">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      fullWidth
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newMessage.trim()}
                    className="rounded-full p-2 w-10 h-10 flex items-center justify-center flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <MessageCircle size={48} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-medium text-gray-700">Select a conversation</h2>
              <p className="text-gray-500 mt-2 text-center">
                Choose a contact from the list to start chatting
              </p>
            </div>
          )}
        </div>

        {/* Info panel - shows chat partner details */}
        {showInfoPanel && chatPartner && (
          <div className="w-72 border-l border-gray-200 flex-shrink-0 p-6 overflow-y-auto">
            <div className="flex justify-end">
              <button
                onClick={() => setShowInfoPanel(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close info panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mt-2">
              <Avatar src={chatPartner.profilePicture} alt={chatPartner.name} size="xl" />
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{chatPartner.name}</h3>
              {chatPartner.role && (
                <span className="mt-1 text-xs font-medium uppercase tracking-wide text-primary-600">
                  {chatPartner.role}
                </span>
              )}
            </div>

            <div className="mt-6 space-y-3 text-sm">
              {chatPartner.email && (
                <div>
                  <span className="block text-gray-400 text-xs">Email</span>
                  <span className="text-gray-800 break-all">{chatPartner.email}</span>
                </div>
              )}
              <div>
                <span className="block text-gray-400 text-xs">Status</span>
                <span className="text-gray-800">{chatPartner.isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};