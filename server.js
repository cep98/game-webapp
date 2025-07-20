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

// Routen
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));
app.get('/control', (req, res) => res.sendFile(path.join(__dirname, 'public', 'control.html')));
app.get('/admin',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const clients = {};

oi.on('connection', socket => {
  // Hilfsfunktion: Liste der Clients an Admins senden
  function sendClientList() {
    const list = Object.entries(clients).map(([id, { role, deviceId }]) => {
      const sock = io.sockets.sockets.get(id);
      return {
        type: role,
        deviceId: deviceId,
        ip: sock ? sock.handshake.address : null
      };
    });
    // Nur an Admins senden
    for (let adminId in clients) {
      if (clients[adminId].role === 'admin') {
        io.to(adminId).emit('client-list', list);
      }
    }
  }

  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    clients[socket.id] = { role, deviceId };
    // Client-Liste an Admins aktualisieren
    sendClientList();
  });

  // Admin: send settings
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  // Admin: update settings
  socket.on('update-settings', data => {
    // Werte übernehmen
    settings = { ...settings, ...data };
    // An alle Displays senden
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
    // Client-Liste an Admins aktualisieren
    sendClientList();
  });
});

// Start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
