// server.js
const express = require('express');
const path    = require('path');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);

// Statische Dateien aus /public
app.use(express.static(path.join(__dirname, 'public')));

// Frontends
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));
app.get('/control',(req, res) => res.sendFile(path.join(__dirname, 'public', 'control.html')));
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const clients = {}; // socket.id → { role, deviceId, ip }

function broadcastClientList() {
  const list = Object.values(clients).map(c => ({
    type:     c.role,
    deviceId: c.deviceId,
    ip:       c.ip
  }));
  // nur an Admins senden, Event-Name muss "client-list" sein
  for (let id in clients) {
    if (clients[id].role === 'admin') {
      io.to(id).emit('client-list', list);
    }
  }
}

io.on('connection', socket => {
  const addr = socket.handshake.address;
  socket.on('identify', ({ role, deviceId }) => {
    clients[socket.id] = { role, deviceId, ip: addr };
    broadcastClientList();
  });

  // Control → Game
  socket.on('draw', data => {
    socket.broadcast.emit('draw', data);
  });

  // Admin-Clearing
  socket.on('clear', () => {
    socket.broadcast.emit('clear');
  });

  // Admin-Kick
  socket.on('kick', ({ deviceId }) => {
    // find matching socket and disconnect
    for (let id in clients) {
      if (clients[id].deviceId === deviceId) {
        io.sockets.sockets.get(id)?.disconnect(true);
      }
    }
  });

  socket.on('disconnect', () => {
    delete clients[socket.id];
    broadcastClientList();
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on *:${PORT}`));
