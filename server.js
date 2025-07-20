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

// Farbpalette für Controls
const COLORS = [
  '#e6194b', // rot
  '#3cb44b', // grün
  '#ffe119', // gelb
  '#4363d8', // blau
  '#f58231', // orange
  '#911eb4', // lila
  '#46f0f0', // türkis
  '#f032e6'  // magenta
];

// Tracking aller Clients
const clients    = {};  // socketId → { role, deviceId, color? }
let controlCount = 0;

// Hilfsfunktion: Client-Liste an alle Admins senden
function sendClientList() {
  const list = Object.entries(clients).map(([id, { role, deviceId, color }]) => ({
    type:     role,
    deviceId: deviceId || 'n/a',
    ip:       io.sockets.sockets.get(id)?.handshake.address || '–',
    color:    color || null
  }));
  Object.entries(clients).forEach(([id, c]) => {
    if (c.role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  });
}

io.on('connection', socket => {
  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    let color = null;
    if (role === 'control') {
      // Zyklische Zuweisung
      color = COLORS[controlCount % COLORS.length];
      controlCount++;
      // Farbe direkt zurücksenden
      socket.emit('assign-color', color);
    }
    clients[socket.id] = { role, deviceId, color };
    sendClientList();
  });

  // Admin-Settings
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    // an alle Displays weiterschicken
    Object.entries(clients).forEach(([id, c]) => {
      if (c.role === 'display') {
        io.to(id).emit('settings', settings);
      }
    });
  });

  // Control‑Input weiterleiten
  socket.on('draw', data => {
    socket.broadcast.emit('draw', data);
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
