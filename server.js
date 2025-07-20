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

// Alle verbundenen Clients
const clients = {};

// Hilfs-Funktion: Client-Liste an alle Admins senden
function emitClientList() {
  const list = Object.entries(clients).map(([id, c]) => ({
    type: c.role,
    deviceId: c.deviceId || null,
    ip: c.ip || null
  }));
  // sende nur an Admin-Clients
  for (const [id, c] of Object.entries(clients)) {
    if (c.role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  }
}

io.on('connection', socket => {
  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    // Client speichern inklusive IP
    clients[socket.id] = { role, deviceId: deviceId || null, ip: socket.handshake.address };

    if (role === 'control') {
      // Farbe zuweisen
      const color = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
      clients[socket.id].color = color;

      // an das Control selbst senden
      socket.emit('assigned-color', { deviceId: socket.id, color });
      // an alle Displays senden
      socket.broadcast.emit('assigned-color', { deviceId: socket.id, color });
    } else if (role === 'display') {
      // Bestehende Controls an neues Display senden
      for (const [id, c] of Object.entries(clients)) {
        if (c.role === 'control' && c.color) {
          socket.emit('assigned-color', { deviceId: id, color: c.color });
        }
      }
      // Settings an neues Display senden
      socket.emit('settings', settings);
    }

    // Aktualisiere Client-Liste in Admin
    emitClientList();
  });

  // Admin: Settings anfordern
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  // Admin: Settings updaten
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    // an alle Displays senden
    for (const [id, c] of Object.entries(clients)) {
      if (c.role === 'display') {
        io.to(id).emit('settings', settings);
      }
    }
  });

  // Control-Input weiterleiten
  socket.on('draw', data => socket.broadcast.emit('draw', data));

  // Disconnect
  socket.on('disconnect', () => {
    delete clients[socket.id];
    emitClientList();
  });
});

// Start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
