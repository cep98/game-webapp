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

io.on('connection', socket => {
  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    if (role === 'control') {
      // Farbe zuweisen
      const color = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
      clients[socket.id] = { role, deviceId, color };
      // an das Control selbst senden
      socket.emit('assigned-color', { deviceId: socket.id, color });
      // an alle Displays senden
      socket.broadcast.emit('assigned-color', { deviceId: socket.id, color });
    } else {
      clients[socket.id] = { role, deviceId };
    }
  });

  // Admin: Settings anfordern
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  // Admin: Settings updaten
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    // an alle Displays senden
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
  });
});

// Start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
