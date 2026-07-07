import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

// Mounted once at the app root - keeps a persistent socket connection
// so the user gets notified instantly about new meeting requests, etc.
export const NotificationListener: React.FC = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register-user', user.id);
    });

    socket.on('new-meeting-request', (meeting: { title: string }) => {
      toast.success(`New meeting request: "${meeting.title}"`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return null;
};