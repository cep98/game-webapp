// server.js für Motion-Modus
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

io.on('connection', socket => {
  let role = null;
  let deviceId = socket.id;
  let assignedColor = null;

  socket.on('identify', data => {
    role = data.role;
    deviceId = data.deviceId || socket.id;

    if (role === 'control') {
      assignedColor = getColor(deviceId);
      socket.emit('assign-color', assignedColor);
    }
  });

  socket.on('motion', data => {
    data.deviceId = deviceId;
    if (!data.color && assignedColor) {
      data.color = assignedColor;
    }
    socket.broadcast.emit('motion', data);
  });

  socket.on('disconnect', () => {
    if (role === 'control') {
      io.emit('draw-end', { deviceId });
    }
  });
});

const COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];
const colorMap = {};
let colorIndex = 0;
function getColor(id) {
  if (!colorMap[id]) {
    colorMap[id] = COLORS[colorIndex++ % COLORS.length];
  }
  return colorMap[id];
}

server.listen(PORT, () => console.log('Server läuft auf Port', PORT));
