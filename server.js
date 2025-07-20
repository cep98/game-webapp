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
let controlCount = 0;

// Verbindungen
io.on('connection', socket => {
  // Hilfsfunktion: Liste der Clients an Admins senden
  function sendClientList() {
    const list = Object.entries(clients).map(([id, { role, deviceId, color }]) => ({
      type: role,
      deviceId,
      ip: io.sockets.sockets.get(id)?.handshake.address || null,
      color
    }));
    // Nur an Admins senden
    for (let [id, c] of Object.entries(clients)) {
      if (c.role === 'admin') io.to(id).emit('client-list', list);
    }
  }

  // Identifikation
  socket.on('identify', ({ role, deviceId }) => {
    let color;
    if (role === 'control') {
      color = COLORS[controlCount % COLORS.length];
      controlCount++;
    }
    clients[socket.id] = { role, deviceId, color };
    // Farbe an Control-Client senden
    if (color) socket.emit('assign-color', color);
    // Client-Liste an Admins aktualisieren
    sendClientList();
  });

  // Admin: Settings anfordern
  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  // Admin: Settings aktualisieren
  socket.on('update-settings', data => {
    settings = { ...settings, ...data };
    for (let [id, c] of Object.entries(clients)) {
      if (c.role === 'display') io.to(id).emit('settings', settings);
    }
  });

  // Control-Input weiterleiten
  socket.on('draw', data => socket.broadcast.emit('draw', data));

  // Trennung
  socket.on('disconnect', () => {
    delete clients[socket.id];
    sendClientList();
  });
});

// Server starten
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
