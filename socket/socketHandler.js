const Message = require('../models/Message');

// Hardcoded list of allowed users (Replace with your desired list)
const ALLOWED_USERS = [
  { name: "alice", pass: "password1" },
  { name: "bob", pass: "password2" },
  { name: "admin", pass: "admin123" }
];

module.exports = (io) => {
  // Simple Authentication Middleware
  io.use((socket, next) => {
    const { username, password } = socket.handshake.auth;

    // Check if user exists and password matches
    const user = ALLOWED_USERS.find(u => u.name === username && u.pass === password);

    if (user) {
      socket.user = user; // Attach user to socket
      next();
    } else {
      next(new Error("Authentication failed: Invalid credentials"));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.user.name}`);

    // Join a room
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.user.name} joined: ${roomId}`);
    });

    // Handle Sending Messages
    socket.on('send_message', async (data) => {
      // data: { roomId, content, type, mediaUrl, isEphemeral }
      
      const messagePayload = {
        sender_name: socket.user.name,
        type: data.type || 'text',
        content: data.content,
        media_url: data.mediaUrl || null,
        timestamp: new Date()
      };

      if (data.isEphemeral) {
        // --- EPHEMERAL MODE (No Storage) ---
        io.to(data.roomId).emit('receive_message', {
          ...messagePayload,
          id: 'ephemeral_' + Date.now(),
          is_ephemeral: true
        });
      } else {
        // --- PERSISTENT MODE (Saved to DB) ---
        try {
          const newMessage = new Message({
            conversation_id: data.roomId,
            sender_name: socket.user.name,
            type: data.type || 'text',
            content: data.content,
            media_url: data.mediaUrl,
            is_ephemeral: false
          });

          const savedMessage = await newMessage.save();

          io.to(data.roomId).emit('receive_message', {
            ...messagePayload,
            id: savedMessage._id,
            is_ephemeral: false
          });

        } catch (err) {
          socket.emit('error', { message: 'Failed to save message' });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User Disconnected', socket.user.name);
    });
  });
};
