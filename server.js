// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Statische Dateien aus /public ausliefern (z.B. ball.png)
app.use(express.static('public'));

// Spiel-Frontend
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

// Steuerung-Frontend
app.get('/control', (req, res) => {
  res.sendFile(__dirname + '/control.html');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Gyro-Daten von Control-Clients weiterleiten
  socket.on('gyro', data => {
    socket.broadcast.emit('gyro', { id: socket.id, ...data });
  });

  // Laser-Schuss von Control-Clients broadcasten
  socket.on('laser', data => {
    io.emit('laser', { id: socket.id, angle: data.angle });
  });

  // Bei Trennung aufräumen
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    io.emit('disconnectClient', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Listening on *:${PORT}`);
});
