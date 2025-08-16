// v2.0 Server – Paddle-Line + Rotation (alpha/beta/gamma)
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));
app.get('/control', (req, res) => res.sendFile(path.join(__dirname, 'control.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ---------- State ----------
const COLORS = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#008080','#9a6324','#800000','#469990'];
let colorIndex = 0;

const clients = new Map(); // socketId -> { socket, type, deviceId, ip, color }
let settings = {
  maxHor: 20,       // Grad (links/rechts)
  maxVer: 20,       // Grad (vor/zurück)
  smoothing: 0.5,   // 0..1 (wie gehabt, 0 = keine Glättung)
  paddleLength: 240, // px
  paddleWidth: 14    // px
};

function broadcastClientList() {
  const list = [];
  for (const [socketId, c] of clients.entries()) {
    list.push({
      socketId,
      type: c.type,
      deviceId: c.deviceId || '',
      ip: c.ip || '',
      color: c.color || null
    });
  }
  // Nur an Admins senden
  for (const [_, c] of clients.entries()) {
    if (c.type === 'admin') c.socket.emit('client-list', list);
  }
}

function assignColor() {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

// ---------- Socket.IO ----------
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() || socket.handshake.address;

  // Platzhalter in Map
  clients.set(socket.id, { socket, type: 'unknown', deviceId: null, ip, color: null });

  socket.on('identify', ({ role, deviceId }) => {
    const entry = clients.get(socket.id);
    if (!entry) return;
    entry.type = role || 'unknown';
    entry.deviceId = deviceId || socket.id;

    if (entry.type === 'control') {
      // Farbe zuteilen und an Control schicken
      entry.color = assignColor();
      socket.emit('assign-color', entry.color);
    }
    // Frische Liste an Admins
    broadcastClientList();
  });

  socket.on('request-settings', () => {
    socket.emit('settings', settings);
  });

  socket.on('update-settings', (data) => {
    const entry = clients.get(socket.id);
    if (!entry || entry.type !== 'admin') return; // nur Admin
    settings = {
      ...settings,
      ...Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined))
    };
    // An alle senden
    io.emit('settings', settings);
  });

  socket.on('draw', (payload) => {
    // Durchreichen an alle Displays
    for (const [_, c] of clients.entries()) {
      if (c.type === 'display') {
        c.socket.emit('draw', payload);
      }
    }
  });

  socket.on('draw-end', (payload) => {
    for (const [_, c] of clients.entries()) {
      if (c.type === 'display') {
        c.socket.emit('draw-end', payload);
      }
    }
  });

  socket.on('kill-client', ({ socketId }) => {
    const entry = clients.get(socket.id);
    if (!entry || entry.type !== 'admin') return;
    const victim = clients.get(socketId);
    if (victim) victim.socket.disconnect(true);
  });

  socket.on('disconnect', () => {
    clients.delete(socket.id);
    broadcastClientList();
  });

  // Beim Connect direkt Settings schicken (für schnelle Anzeige)
  socket.emit('settings', settings);
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
