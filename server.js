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
  maxHor:     20,
  maxVer:     20,
  smoothing:  0.5
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

// Routen
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));
app.get('/control', (req, res) => res.sendFile(path.join(__dirname, 'public', 'control.html')));
app.get('/admin',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Aktive Clients: socketId -> { role, deviceId, color? }
const clients = {};

oi.on('connection', socket => {
  // Hilfsfunktion: Liste der Clients an Admins senden
  function sendClientList() {
    const list = Object.entries(clients).map(([id, { role, deviceId, color }]) => {
      const sock = io.sockets.sockets.get(id);
      return {
        type: role,
        deviceId,
        ip: sock ? sock.handshake.address : null,
        ...(color ? { color } : {})
      };
    });
    for (let adminId in clients) {
      if (clients[adminId].role === 'admin') {
        io.to(adminId).emit('client-list', list);
      }
    }
  }

  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    // Farbzuweisung nur für Control-Rolle
    let color;
    if (role === 'control') {
      const controlCount = Object.values(clients).filter(c => c.role === 'control').length;
      color = COLORS[controlCount % COLORS.length];
    }
    clients[socket.id] = { role, deviceId, ...(color ? { color } : {}) };

    // Farbe an Control-Client senden
    if (color) {
      socket.emit('assign-color', color);
    }

    // Client-Liste an Admins aktualisieren
    sendClientList();
  });

  // Admin: send settings
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  // Admin: update settings
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    for (let id in clients) {
      if (clients[id].role === 'display') {
        io.to(id).emit('settings', settings);
      }
    }
  });

  // Control-Input weiterleiten
  socket.on('draw', data => socket.broadcast.emit('draw', data));

  // Disconnect
  socket.on('disconnect', () => {
    delete clients[socket.id];
    sendClientList();
  });
});

// Start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
