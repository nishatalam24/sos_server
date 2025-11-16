const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
dotenv.config();

const authRoutes = require('./routes/auth.controller');
const sosRoutes = require('./routes/sos.controller');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const peers = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, user }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.user = user;
    socket.to(roomId).emit('peer-joined', { socketId: socket.id, user });
  });

  socket.on('signal', ({ target, description, candidate }) => {
    io.to(target).emit('signal', {
      from: socket.id,
      user: socket.user,
      description,
      candidate
    });
  });

  socket.on('chat-message', ({ roomId, message }) => {
    io.to(roomId).emit('chat-message', {
      from: socket.user,
      text: message,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('peer-left', { socketId: socket.id });
    }
  });
});

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'SOS API running' });
});

app.get('/test', (_req, res) => {
  res.send('<h1>Test endpoint working</h1>');
});


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo error', err));

const PORT = process.env.PORT || 5500;
// server.listen(PORT, () => console.log(`Server on ${PORT}`));
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server on ${PORT}`);
});
