// server.js
const express = require('express');
const path    = require('path');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);

// Statische Auslieferung
app.use(express.static(path.join(__dirname, 'public')));

// Defaults für Settings
let settings = {
  maxHor:    20,
  maxVer:    20,
  smoothing: 0.5
};

const COLORS = [
  '#e6194b','#3cb44b','#ffe119','#4363d8',
  '#f58231','#911eb4','#46f0f0','#f032e6'
];

const clients = {};
let controlCount = 0;

function sendClientList() {
  const list = Object.entries(clients).map(([id, { role, deviceId, color }]) => ({
    socketId: id,
    type:     role,
    deviceId: deviceId || 'n/a',
    ip:       io.sockets.sockets.get(id)?.handshake.address || '–',
    color:    color || null
  }));
  for (let [id, c] of Object.entries(clients)) {
    if (c.role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  }
}

io.on('connection', socket => {
  socket.on('identify', ({ role, deviceId }) => {
    let color = null;
    if (role === 'control') {
      color = COLORS[controlCount++ % COLORS.length];
      socket.emit('assign-color', color);
    }
    clients[socket.id] = { role, deviceId, color };
    sendClientList();
  });

  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    for (let [id, c] of Object.entries(clients)) {
      if (c.role === 'display') {
        io.to(id).emit('settings', settings);
      }
    }
  });

  socket.on('draw', data => socket.broadcast.emit('draw', data));
  socket.on('draw-end', data => socket.broadcast.emit('draw-end', data));

  // NEU: alle Sensordaten an Admins weiterleiten
  socket.on('sensor-data', data => {
    for (let [id, c] of Object.entries(clients)) {
      if (c.role === 'admin') {
        io.to(id).emit('sensor-data', data);
      }
    }
  });

  socket.on('kill-client', ({ socketId }) => {
    const me = clients[socket.id];
    if (!me || me.role !== 'admin') return;
    if (clients[socketId]) {
      const target = io.sockets.sockets.get(socketId);
      if (target) target.disconnect(true);
      delete clients[socketId];
      sendClientList();
    }
  });

  socket.on('disconnect', () => {
    delete clients[socket.id];
    sendClientList();
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
