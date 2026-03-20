import { useState, useEffect, useRef } from 'react';
import '../styles/call.css';

function VideoCall({ callState, socket, currentUser, onEnd }) {
  const { type, user: remoteUser, incoming, offer } = callState;

  const [callStatus, setCallStatus] = useState(incoming ? 'incoming' : 'connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (incoming) {
      // Wait for user to accept
    } else {
      startCall();
    }

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus('connected');
          startTimer();
        }
      } catch (err) {
        console.error('Error setting answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleCallEnded = () => {
      cleanup();
      onEnd();
    };

    socket.on('call-answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallEnded);

    return () => {
      socket.off('call-answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallEnded);
    };
  }, [socket]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offerSdp = await pc.createOffer();
      await pc.setLocalDescription(offerSdp);

      socket.emit('call-offer', {
        to: remoteUser.id,
        offer: offerSdp,
        callType: type
      });

      setCallStatus('ringing');
    } catch (err) {
      console.error('Error starting call:', err);
      setCallStatus('error');
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call-answer', {
        to: remoteUser.id,
        answer: answer
      });

      setCallStatus('connected');
      startTimer();
    } catch (err) {
      console.error('Error accepting call:', err);
      setCallStatus('error');
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: remoteUser.id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  };

  const endCall = () => {
    socket.emit('call-end', { to: remoteUser.id });
    cleanup();
    onEnd();
  };

  const rejectCall = () => {
    socket.emit('call-reject', { to: remoteUser.id });
    cleanup();
    onEnd();
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="call-overlay">
      <div className={`call-container ${type}`}>
        {/* Background */}
        <div className="call-bg">
          <div className="call-gradient-1"></div>
          <div className="call-gradient-2"></div>
        </div>

        {/* Remote Video */}
        {type === 'video' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
        )}

        {/* Audio call avatar */}
        {(type === 'audio' || isVideoOff) && callStatus !== 'incoming' && (
          <div className="call-avatar-container">
            <div className="call-avatar-pulse"></div>
            <div className="call-avatar" style={{ background: remoteUser.avatar_color || '#6c5ce7' }}>
              {remoteUser.username?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}

        {/* Call Info */}
        <div className="call-info">
          <h2>{remoteUser.username}</h2>
          <p className="call-status-text">
            {callStatus === 'incoming' && `Incoming ${type} call...`}
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'ringing' && 'Ringing...'}
            {callStatus === 'connected' && formatDuration(callDuration)}
            {callStatus === 'error' && 'Call failed'}
          </p>
        </div>

        {/* Local Video (PIP) */}
        {type === 'video' && !isVideoOff && (
          <div className="local-video-container">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
        )}

        {/* Controls */}
        <div className="call-controls">
          {callStatus === 'incoming' ? (
            <>
              <button className="call-btn reject" onClick={rejectCall}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.36 5.64a1 1 0 00-1.41 0L12 10.59 7.05 5.64a1 1 0 00-1.41 1.41L10.59 12l-4.95 4.95a1 1 0 101.41 1.41L12 13.41l4.95 4.95a1 1 0 001.41-1.41L13.41 12l4.95-4.95a1 1 0 000-1.41z"/>
                </svg>
                <span>Decline</span>
              </button>
              <button className="call-btn accept" onClick={acceptCall}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.7 2.34a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0122 16.92z"/>
                </svg>
                <span>Accept</span>
              </button>
            </>
          ) : (
            <>
              <button className={`call-ctrl-btn ${isMuted ? 'active' : ''}`} onClick={toggleMute}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isMuted ? (
                    <path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.49-.34 2.17M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 106 0V4a3 3 0 00-3-3z"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
              </button>

              {type === 'video' && (
                <button className={`call-ctrl-btn ${isVideoOff ? 'active' : ''}`} onClick={toggleVideo}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isVideoOff ? (
                      <path d="M16.5 7.5l4.19-3.49A1 1 0 0122 4.86v14.28a1 1 0 01-1.31.85L16.5 16.5M1 1l22 22M11 5h4a2 2 0 012 2v3.34l-9.63 9.63A2 2 0 015 18V7a2 2 0 011.59-1.96" strokeLinecap="round" strokeLinejoin="round"/>
                    ) : (
                      <>
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </>
                    )}
                  </svg>
                </button>
              )}

              <button className="call-ctrl-btn end-call" onClick={endCall}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.7 2.34a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0122 16.92z"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
