const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const pointerBuffer = new Map();

// Alle 50ms (20 FPS) senden wir die letzten Positionen
setInterval(() => {
  for (const [socketId, data] of pointerBuffer.entries()) {
    io.emit('draw', data);
  }
  pointerBuffer.clear();
}, 50);

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Kontrolle erkennt sich
  socket.on('identify', ({ role, deviceId }) => {
    socket.deviceId = deviceId;
    socket.role = role;
    console.log(`Identified as ${role} (${deviceId})`);

    if (role === 'control') {
      const color = assignColor();
      socket.emit('assign-color', color);
    }
  });

  // Eingehende Bewegung -> zwischenspeichern
  socket.on('draw', data => {
    pointerBuffer.set(socket.id, data);
  });

  // Zeichen-Ende direkt weiterleiten
  socket.on('draw-end', data => {
    io.emit('draw-end', data);
  });

  // Glättung / Settings
  socket.on('request-settings', () => {
    socket.emit('settings', { smoothing: 0.5 });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    io.emit('draw-end', { deviceId: socket.deviceId });
  });
});

// Farbvergabe
const COLORS = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6'];
let colorIndex = 0;
function assignColor() {
  return COLORS[colorIndex++ % COLORS.length];
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
