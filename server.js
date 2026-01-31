const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Config
const connectDB = require('./config/db');
const Message = require('./models/Message');
const socketHandler = require('./socket/socketHandler');

// Initialize App
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// --- SIMPLE USER CONFIGURATION ---
const ALLOWED_USERS = [
  { name: "alice", pass: "password1" },
  { name: "bob", pass: "password2" },
  { name: "admin", pass: "admin123" }
];

// --- FILE UPLOAD CONFIG ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// --- frontend Connection ---

const publicDirectory = path.join(__dirname, '../frontend');
app.use(express.static(publicDirectory));

// Dynamic Routes
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// --- REST ROUTES ---

// 1. Simple Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = ALLOWED_USERS.find(u => u.name === username && u.pass === password);

  if (user) {
    // No token returned, just success. Frontend will save these credentials to connect via Socket.
    res.json({ success: true, username: user.name });
  } else {
    res.status(401).json({ success: false, message: "Invalid name or password" });
  }
});

// 2. Upload Endpoint (No Auth middleware now, relies on frontend usage)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ mediaUrl: fileUrl });
});

// 3. Get Chat History (Persistent only)
app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const messages = await Message.find({ 
      conversation_id: req.params.roomId,
      is_ephemeral: false 
    }).sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// --- SOCKET INTEGRATION ---
socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});