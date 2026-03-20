import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from '../components/MessageBubble';
import FileUpload from '../components/FileUpload';
import VideoCall from '../components/VideoCall';
import AIVoiceChat from '../components/AIVoiceChat';
import '../styles/chat.css';

const API_URL = 'http://localhost:3001';

function ChatPage() {
  const { user, token, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [callState, setCallState] = useState(null); // { type: 'video'|'audio', user, incoming, offer }
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  // Load users
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [token]);

  // Load unread counts
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/unread`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setUnreadCounts(data || {}))
      .catch(console.error);
  }, [token]);

  // Load messages for selected user
  useEffect(() => {
    if (!selectedUser || !token) return;
    fetch(`${API_URL}/api/messages/${selectedUser.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setMessages(Array.isArray(data) ? data : []);
        // Clear unread for this user
        setUnreadCounts(prev => ({ ...prev, [selectedUser.id]: 0 }));
      })
      .catch(console.error);
  }, [selectedUser, token]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (selectedUser && (msg.sender_id === selectedUser.id || msg.receiver_id === selectedUser.id)) {
        setMessages(prev => [...prev, msg]);
        // Mark as read
        if (msg.sender_id === selectedUser.id) {
          socket.emit('mark-read', { senderId: selectedUser.id });
        }
      } else if (msg.sender_id !== user.id) {
        // Increment unread count
        setUnreadCounts(prev => ({
          ...prev,
          [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
        }));
      }
    };

    const handleMessageSent = (msg) => {
      if (selectedUser && msg.receiver_id === selectedUser.id) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleTyping = ({ userId, username, isTyping }) => {
      if (selectedUser && userId === selectedUser.id) {
        setTypingUser(isTyping ? username : null);
      }
    };

    const handleCallOffer = ({ from, fromUsername, offer, callType }) => {
      setCallState({
        type: callType,
        user: { id: from, username: fromUsername },
        incoming: true,
        offer
      });
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('user-typing', handleTyping);
    socket.on('call-offer', handleCallOffer);
    socket.on('call-ended', () => setCallState(null));
    socket.on('call-rejected', () => setCallState(null));

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-sent', handleMessageSent);
      socket.off('user-typing', handleTyping);
      socket.off('call-offer', handleCallOffer);
      socket.off('call-ended');
      socket.off('call-rejected');
    };
  }, [socket, selectedUser, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = (content, type = 'text', fileData = null) => {
    if (!socket || !selectedUser) return;
    if (type === 'text' && !content.trim()) return;

    const msgData = {
      receiverId: selectedUser.id,
      content: content,
      messageType: type,
      ...(fileData && {
        fileUrl: fileData.url,
        fileName: fileData.name,
        fileSize: fileData.size
      })
    };

    socket.emit('private-message', msgData);

    if (type === 'text') {
      setMessageInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(messageInput);
    }
  };

  // Typing indicator
  const handleTypingInput = (value) => {
    setMessageInput(value);
    if (!socket || !selectedUser) return;

    socket.emit('typing', { receiverId: selectedUser.id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { receiverId: selectedUser.id, isTyping: false });
    }, 2000);
  };

  // File uploaded callback
  const handleFileUploaded = (fileData) => {
    sendMessage(fileData.name, fileData.type, fileData);
    setShowFileUpload(false);
  };

  // Start call
  const startCall = (type) => {
    if (!selectedUser) return;
    setCallState({ type, user: selectedUser, incoming: false });
  };

  // Emoji picker
  const emojis = ['😀','😂','😍','🥰','😎','🤩','😜','🤗','😊','👍','👋','🎉','❤️','🔥','💯','✨','🙏','💪','👏','🤝'];

  const insertEmoji = (emoji) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  // Filter users
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get last message for user list preview
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className={`chat-sidebar ${showSidebar ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <div className="user-avatar" style={{ background: user.avatar_color }}>
              {getInitials(user.username)}
            </div>
            <div>
              <h3>{user.username}</h3>
              <span className="status-online">● Online</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* User List */}
        <div className="user-list">
          {filteredUsers.length === 0 ? (
            <div className="no-users">
              <p>No users found</p>
              <span>Register another account to start chatting</span>
            </div>
          ) : (
            filteredUsers.map(u => (
              <div
                key={u.id}
                className={`user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedUser(u);
                  setShowSidebar(false);
                }}
              >
                <div className="user-item-avatar" style={{ background: u.avatar_color }}>
                  {getInitials(u.username)}
                  <span className={`online-dot ${onlineUsers.includes(u.id) ? 'online' : ''}`}></span>
                </div>
                <div className="user-item-info">
                  <h4>{u.username}</h4>
                  <p>{u.status || 'Hey there! I am using ChatVerse'}</p>
                </div>
                {unreadCounts[u.id] > 0 && (
                  <span className="unread-badge">{unreadCounts[u.id]}</span>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <button className="mobile-menu-btn" onClick={() => setShowSidebar(!showSidebar)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
                </svg>
              </button>

              <div className="chat-header-user">
                <div className="user-avatar small" style={{ background: selectedUser.avatar_color }}>
                  {getInitials(selectedUser.username)}
                  <span className={`online-dot ${onlineUsers.includes(selectedUser.id) ? 'online' : ''}`}></span>
                </div>
                <div>
                  <h3>{selectedUser.username}</h3>
                  <span className="user-status">
                    {typingUser ? (
                      <span className="typing-indicator">
                        typing<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
                      </span>
                    ) : (
                      onlineUsers.includes(selectedUser.id) ? 'Online' : 'Offline'
                    )}
                  </span>
                </div>
              </div>

              <div className="chat-header-actions">
                <button
                  className={`action-btn ${voiceMode ? 'active' : ''}`}
                  onClick={() => setVoiceMode(!voiceMode)}
                  title="AI Voice Mode"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 106 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="action-btn" onClick={() => startCall('audio')} title="Voice Call">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="action-btn" onClick={() => startCall('video')} title="Video Call">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* AI Voice Chat Bar */}
            {voiceMode && (
              <AIVoiceChat
                onSendMessage={(text) => sendMessage(text)}
                messages={messages}
                userId={user.id}
              />
            )}

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <div className="no-msg-icon">💬</div>
                  <h3>Start a conversation</h3>
                  <p>Send a message to {selectedUser.username}</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id || idx}
                    message={msg}
                    isOwn={msg.sender_id === user.id}
                    formatTime={formatTimestamp}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Upload Overlay */}
            {showFileUpload && (
              <FileUpload
                token={token}
                onClose={() => setShowFileUpload(false)}
                onUploaded={handleFileUploaded}
              />
            )}

            {/* Message Input */}
            <div className="chat-input-area">
              <button
                className="input-action-btn"
                onClick={() => setShowFileUpload(!showFileUpload)}
                title="Attach file"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="message-input-wrapper">
                <textarea
                  ref={messageInputRef}
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => handleTypingInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                />
                <button
                  className="emoji-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {emojis.map(e => (
                      <button key={e} onClick={() => insertEmoji(e)}>{e}</button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="send-btn"
                onClick={() => sendMessage(messageInput)}
                disabled={!messageInput.trim()}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-graphic">
              <div className="welcome-icon">
                <svg viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="55" stroke="url(#welcomeGrad)" strokeWidth="2" opacity="0.3"/>
                  <circle cx="60" cy="60" r="40" stroke="url(#welcomeGrad)" strokeWidth="2" opacity="0.5"/>
                  <rect x="30" y="35" width="60" height="45" rx="8" fill="url(#welcomeGrad)" opacity="0.8"/>
                  <path d="M45 52h30M45 60h20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="75" cy="75" r="12" fill="#00d2ff"/>
                  <path d="M71 75l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="welcomeGrad" x1="0" y1="0" x2="120" y2="120">
                      <stop stopColor="#6c5ce7"/>
                      <stop offset="1" stopColor="#00cec9"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Welcome to ChatVerse</h2>
              <p>Select a conversation to start messaging</p>
              <div className="welcome-features">
                <span>💬 Messages</span>
                <span>📹 Video Calls</span>
                <span>🎤 Voice Chat</span>
                <span>📎 File Sharing</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Video/Voice Call Overlay */}
      {callState && (
        <VideoCall
          callState={callState}
          socket={socket}
          currentUser={user}
          onEnd={() => setCallState(null)}
        />
      )}
    </div>
  );
}

export default ChatPage;
