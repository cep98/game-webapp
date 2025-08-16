const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

const connections = new Map();

io.on('connection', (socket) => {
  console.log('Verbunden:', socket.id);

  socket.on('identify', ({ role, deviceId }) => {
    socket.role = role;
    socket.deviceId = deviceId;
    connections.set(deviceId, socket);

    // Farbe für Laser zuweisen
    if (role === 'control') {
      const color = getColorForDevice(deviceId);
      socket.emit('assign-color', color);
    }
  });

  socket.on('draw', data => {
    // Weiterleiten an alle Displays
    for (let [id, s] of connections) {
      if (s.role === 'display') {
        s.emit('draw', data);
      }
    }
  });

  socket.on('draw-end', ({ deviceId }) => {
    for (let [id, s] of connections) {
      if (s.role === 'display') {
        s.emit('draw-end', { deviceId });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Getrennt:', socket.id);
    connections.delete(socket.deviceId);
    for (let [id, s] of connections) {
      if (s.role === 'display') {
        s.emit('draw-end', { deviceId: socket.deviceId });
      }
    }
  });
});

// Einfache, feste Farbauswahl
const COLORS = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4'];
const colorMap = new Map();
let colorIndex = 0;
function getColorForDevice(deviceId) {
  if (!colorMap.has(deviceId)) {
    const color = COLORS[colorIndex % COLORS.length];
    colorMap.set(deviceId, color);
    colorIndex++;
  }
  return colorMap.get(deviceId);
}

server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
