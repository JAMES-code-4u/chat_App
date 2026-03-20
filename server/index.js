const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { generateToken, authenticateToken, authenticateSocket } = require('./auth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Track online users: userId -> socketId
const onlineUsers = new Map();

// ===== REST API ROUTES =====

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Random avatar color
    const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#e17055', '#00b894', '#0984e3', '#e84393', '#fdcb6e'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const result = db.prepare(
      'INSERT INTO users (username, email, password, avatar_color) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashedPassword, avatarColor);

    const user = { id: result.lastInsertRowid, username, email, avatar_color: avatarColor };
    const token = generateToken(user);

    res.status(201).json({ user: { id: user.id, username, email, avatar_color: avatarColor }, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_color: user.avatar_color,
        status: user.status
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (except self)
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, username, email, avatar_color, status, created_at FROM users WHERE id != ?'
    ).all(req.user.id);

    // Add online status
    const usersWithStatus = users.map(u => ({
      ...u,
      is_online: onlineUsers.has(u.id)
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages between two users
app.get('/api/messages/:userId', authenticateToken, (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id;

    const messages = db.prepare(`
      SELECT m.*, 
        sender.username as sender_name, 
        receiver.username as receiver_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
      LIMIT 500
    `).all(currentUserId, otherUserId, otherUserId, currentUserId);

    // Mark messages as read
    db.prepare(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0'
    ).run(otherUserId, currentUserId);

    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload file
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = getFileType(req.file.mimetype);

    res.json({
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      type: fileType,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
}

// Get unread message counts
app.get('/api/unread', authenticateToken, (req, res) => {
  try {
    const unread = db.prepare(`
      SELECT sender_id, COUNT(*) as count 
      FROM messages 
      WHERE receiver_id = ? AND is_read = 0 
      GROUP BY sender_id
    `).all(req.user.id);

    const counts = {};
    unread.forEach(u => { counts[u.sender_id] = u.count; });

    res.json(counts);
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== SOCKET.IO =====

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.user.id;
  const username = socket.user.username;

  console.log(`✅ ${username} connected (ID: ${userId})`);

  // Track online user
  onlineUsers.set(userId, socket.id);

  // Broadcast online status
  io.emit('user-online', { userId, username });
  
  // Send current online users list
  socket.emit('online-users', Array.from(onlineUsers.keys()));

  // Handle private messages
  socket.on('private-message', (data) => {
    const { receiverId, content, messageType = 'text', fileUrl, fileName, fileSize } = data;

    // Save to database
    const result = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, message_type, file_url, file_name, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, receiverId, content, messageType, fileUrl || null, fileName || null, fileSize || null);

    const message = {
      id: result.lastInsertRowid,
      sender_id: userId,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      sender_name: username,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    // Send to receiver if online
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new-message', message);
    }

    // Send back to sender for confirmation
    socket.emit('message-sent', message);
  });

  // Typing indicator
  socket.on('typing', ({ receiverId, isTyping }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', { userId, username, isTyping });
    }
  });

  // Mark messages as read
  socket.on('mark-read', ({ senderId }) => {
    db.prepare(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0'
    ).run(senderId, userId);

    const senderSocketId = onlineUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messages-read', { readBy: userId });
    }
  });

  // ===== WebRTC Signaling =====

  socket.on('call-offer', ({ to, offer, callType }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-offer', {
        from: userId,
        fromUsername: username,
        offer,
        callType
      });
    } else {
      socket.emit('call-error', { message: 'User is offline' });
    }
  });

  socket.on('call-answer', ({ to, answer }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answer', { from: userId, answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { from: userId, candidate });
    }
  });

  socket.on('call-end', ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', { from: userId });
    }
  });

  socket.on('call-reject', ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected', { from: userId });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`❌ ${username} disconnected`);
    onlineUsers.delete(userId);
    io.emit('user-offline', { userId });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 ChatVerse server running on http://localhost:${PORT}`);
});
