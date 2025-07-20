// server.js
const express = require('express');
const path    = require('path');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);

// Statische Dateien ausliefern
app.use(express.static(path.join(__dirname, 'public')));

// Aktuelle Einstellungen
let settings = {
  maxHor:    20,
  maxVer:    20,
  smoothing: 0.5
};

// Map aller verbundenen Clients
// socket.id => { role, deviceId, ip }
const clients = {};

// Hilfsfunktion: Liste aller Clients an Admins senden
function broadcastClientList() {
  const list = Object.values(clients).map(c => ({
    type:     c.role,      // control, display, admin
    deviceId: c.deviceId,
    ip:       c.ip
  }));
  for (let id in clients) {
    if (clients[id].role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  }
}

io.on('connection', socket => {
  const ip = socket.handshake.address;

  // Identifikation: role & deviceId
  socket.on('identify', ({ role, deviceId }) => {
    clients[socket.id] = { role, deviceId, ip };
    broadcastClientList();

    // Auf Settings-Request initiale Werte schicken
    socket.on('request-settings', () => {
      socket.emit('settings', settings);
    });

    // Admin updatet Settings
    socket.on('update-settings', data => {
      settings = { ...settings, ...data };
      // Neue Settings an alle control/display senden
      Object.entries(clients).forEach(([id, c]) => {
        if (c.role === 'control' || c.role === 'display') {
          io.to(id).emit('settings', settings);
        }
      });
    });

    // Control sendet draw
    socket.on('draw', payload => {
      socket.broadcast.emit('draw', payload);
    });

    // Trennung
    socket.on('disconnect', () => {
      delete clients[socket.id];
      broadcastClientList();
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
