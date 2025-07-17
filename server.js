// server.js
const express = require('express');
const path    = require('path');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);

// Statische Dateien aus /public
app.use(express.static(path.join(__dirname, 'public')));

// Game-Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// Control-Frontend
app.get('/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

// Admin-Frontend
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('gyro', data => {
    socket.broadcast.emit('gyro', { id: socket.id, ...data });
  });

  socket.on('laser', data => {
    io.emit('laser', { id: socket.id, angle: data.angle });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    io.emit('disconnectClient', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on *:${PORT}`));
