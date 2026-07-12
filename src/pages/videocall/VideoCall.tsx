import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
// import { Button } from '../../components/ui/Button';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

// Public STUN server - helps peers discover their public IP (needed for WebRTC to work across networks)
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const VideoCall: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const isAudioOnly = searchParams.get('mode') === 'audio';
  const navigate = useNavigate();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(!isAudioOnly);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'connected' | 'ended'>('connecting');

  const createPeerConnection = useCallback((targetSocketId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Send our local tracks to the peer
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // When the remote peer's video/audio track arrives, show it
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnectionStatus('connected');
    };

    // Send any ICE candidates we discover to the other peer via the signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          target: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    const setup = async () => {
      // 1. Get local camera/mic access (camera skipped entirely in audio-only mode)
      const stream = await navigator.mediaDevices.getUserMedia({ video: !isAudioOnly, audio: true });
      if (!isMounted) return;

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Connect to the signaling server
      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-room', { roomId, userName: user?.name || 'Guest' });
      });

      // 3. If someone is already in the room, we initiate the call (send offer)
      socket.on('room-users', async (existingUsers: string[]) => {
        if (existingUsers.length === 0) {
          setConnectionStatus('waiting');
          return;
        }
        const targetSocketId = existingUsers[0];
        remoteSocketIdRef.current = targetSocketId;

        const pc = createPeerConnection(targetSocketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: targetSocketId, offer });
      });

      // 4. A new user joined after us - just wait for their offer
      socket.on('user-joined', () => {
        setConnectionStatus('connecting');
      });

      // 5. We received an offer - answer it
      socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        remoteSocketIdRef.current = from;
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: from, answer });
      });

      // 6. We received an answer to our offer
      socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      // 7. Receiving ICE candidates from the other peer
      socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        try {
          await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate', err);
        }
      });

      // 8. Other peer left
      socket.on('user-left', () => {
        setConnectionStatus('waiting');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        peerConnectionRef.current?.close();
      });

      // 9. Other peer toggled mic/camera
      socket.on('peer-toggle-media', ({ kind, enabled }: { kind: 'audio' | 'video'; enabled: boolean }) => {
        console.log(`Remote peer ${kind} is now ${enabled ? 'on' : 'off'}`);
      });
    };

    setup();

    return () => {
      isMounted = false;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      socketRef.current?.emit('leave-room', { roomId });
      socketRef.current?.disconnect();
    };
  }, [roomId, user?.name, createPeerConnection, isAudioOnly]);

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      socketRef.current?.emit('toggle-media', { roomId, kind: 'audio', enabled: audioTrack.enabled });
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
      socketRef.current?.emit('toggle-media', { roomId, kind: 'video', enabled: videoTrack.enabled });
    }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    socketRef.current?.emit('leave-room', { roomId });
    socketRef.current?.disconnect();
    setConnectionStatus('ended');
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex-1 relative">
        {/* Remote video - full screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-800"
        />

        {isAudioOnly && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <Phone size={40} />
              </div>
              <p className="text-lg">Voice call in progress...</p>
            </div>
          </div>
        )}

        {connectionStatus === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-40">
            Waiting for the other person to join...
          </div>
        )}

        {/* Local video - small overlay (hidden entirely in audio-only mode) */}
        {!isAudioOnly && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-40 h-28 rounded-lg object-cover border-2 border-white shadow-lg bg-gray-700"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4 bg-gray-900">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full ${isMicOn ? 'bg-gray-700' : 'bg-red-600'} text-white`}
        >
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {!isAudioOnly && (
          <button
            onClick={toggleCamera}
            className={`p-4 rounded-full ${isCameraOn ? 'bg-gray-700' : 'bg-red-600'} text-white`}
          >
            {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        )}

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 text-white"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};