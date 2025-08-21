// server.js
const express = require('express');
const path    = require('path');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);

// Statische Auslieferung aus /public
app.use(express.static(path.join(__dirname, 'public')));

// Defaults für Settings
let settings = {
  maxHor:    20,
  maxVer:    20,
  smoothing: 0.5
};

// Farbpalette für Controls
const COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
  '#f58231', '#911eb4', '#46f0f0', '#f032e6'
];

// Tracking aller Clients
const clients      = {};  // socketId → { role, deviceId, color? }
let controlCount   = 0;

// Client‑Liste an Admins senden
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
  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    let color = null;
    if (role === 'control') {
      color = COLORS[controlCount % COLORS.length];
      controlCount++;
      socket.emit('assign-color', color);
    }
    clients[socket.id] = { role, deviceId, color };
    sendClientList();
  });

  // Admin‑Settings
  socket.on('request-settings', () => socket.emit('settings', settings));
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    for (let [id, c] of Object.entries(clients)) {
      if (c.role === 'display') io.to(id).emit('settings', settings);
    }
  });

  // Draw‑Events weiterleiten
  socket.on('draw',     data => socket.broadcast.emit('draw', data));
  socket.on('draw-end', data => socket.broadcast.emit('draw-end', data));

  // Admin: Client kicken
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

  // Disconnect
  socket.on('disconnect', () => {
    delete clients[socket.id];
    sendClientList();
  });
});

// Server starten
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
