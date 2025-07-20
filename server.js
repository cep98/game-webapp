// server.js
const express = require('express');
const path    = require('path');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);

// Farb‑Palette für Controls
const COLORS = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
let colorIndex = 0;

// Statische Dateien ausliefern
app.use(express.static(path.join(__dirname, 'public')));

// Aktuelle Einstellungen
let settings = { maxHor:20, maxVer:20, smoothing:0.5 };

// Map aller Clients
const clients = {};

function broadcastClientList() {
  const list = Object.values(clients).map(c => ({
    type:     c.role,
    deviceId: c.deviceId,
    ip:       c.ip,
    color:    c.color
  }));
  for (let id in clients) {
    if (clients[id].role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  }
}

io.on('connection', socket => {
  const ip = socket.handshake.address;

  socket.on('identify', ({ role, deviceId }) => {
    clients[socket.id] = { role, deviceId, ip };
    // Bei Control: Farbe zuweisen
    if (role === 'control') {
      const col = COLORS[colorIndex++ % COLORS.length];
      clients[socket.id].color = col;
      socket.emit('assigned-color', col);           // ans Control selbst
      io.emit('assigned-color', { deviceId, color: col }); // an alle Displays
    }
    broadcastClientList();

    // Settings
    socket.on('request-settings', () => socket.emit('settings', settings));
    socket.on('update-settings', data => {
      settings = { ...settings, ...data };
      // an alle Control & Display
      Object.entries(clients).forEach(([id,c]) => {
        if (c.role==='control' || c.role==='display') {
          io.to(id).emit('settings', settings);
        }
      });
    });

    // Control → Game
    socket.on('draw', payload => socket.broadcast.emit('draw', payload));

    socket.on('disconnect', () => {
      delete clients[socket.id];
      broadcastClientList();
    });
  });
});

const PORT = process.env.PORT||3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
