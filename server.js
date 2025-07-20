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

// Farbpalette für Controls (bleibt unverändert)
const COLORS = [
  '#e6194b','#3cb44b','#ffe119','#4363d8',
  '#f58231','#911eb4','#46f0f0','#f032e6'
];

// Tracking aller Clients
const clients      = {};  // socketId → { role, deviceId, color? }
let controlCount   = 0;

// Helper: Liste aller Clients an alle Admin-Sockets senden
function sendClientList() {
  const list = Object.entries(clients).map(([id, { role, deviceId, color }]) => ({
    type:     role,
    deviceId: deviceId || 'n/a',
    ip:       (io.sockets.sockets.get(id)?.handshake.address) || '–',
    color:    color || null
  }));
  // Debug in Console
  console.log('Aktuelle Clients:', list);
  // An jeden Admin senden
  Object.entries(clients).forEach(([id, c]) => {
    if (c.role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  });
}

io.on('connection', socket => {
  // Wenn sich ein Client identifiziert
  socket.on('identify', ({ role, deviceId }) => {
    // Farbzuweisung nur für Controls
    let color = null;
    if (role === 'control') {
      color = COLORS[controlCount % COLORS.length];
      controlCount++;
      // direkt an den Control-Client senden
      socket.emit('assign-color', color);
    }
    clients[socket.id] = { role, deviceId, color };
    sendClientList();
  });

  // Admin fordert Settings an
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  // Admin ändert Settings
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    // an alle Displays weiterschicken
    Object.entries(clients).forEach(([id, c]) => {
      if (c.role === 'display') {
        io.to(id).emit('settings', settings);
      }
    });
  });

  // Steuersignale von Controls weiterleiten
  socket.on('draw', data => {
    socket.broadcast.emit('draw', data);
  });

  // Bei Trennung aus Liste entfernen und Admins benachrichtigen
  socket.on('disconnect', () => {
    delete clients[socket.id];
    sendClientList();
  });
});

// Server-Start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
