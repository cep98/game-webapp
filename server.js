// v2.2.1 – accepts websocket *and* polling again + /display alias
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: { origin: '*' },
  // WICHTIG: beides zulassen, damit auch ältere/andere Clients (Admin) verbinden
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  perMessageDeflate: false,
  httpCompression: false,
  maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC));

// Routen (Kompatibilität: /, /game und /display zeigen auf game.html)
app.get('/',        (req, res) => res.sendFile(path.join(PUBLIC, 'game.html')));
app.get('/game',    (req, res) => res.sendFile(path.join(PUBLIC, 'game.html')));
app.get('/display', (req, res) => res.sendFile(path.join(PUBLIC, 'game.html')));
app.get('/control', (req, res) => res.sendFile(path.join(PUBLIC, 'control.html')));
app.get('/admin',   (req, res) => res.sendFile(path.join(PUBLIC, 'admin.html')));

const COLORS = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#008080','#9a6324','#800000','#469990'];
let colorIndex = 0;

const clients = new Map(); // socketId -> { socket, type, deviceId, ip, color }
let settings = { maxHor: 20, maxVer: 20, smoothing: 0.5, paddleLength: 240, paddleWidth: 14 };

// Mapping: Control-Socket <-> kompakter deviceKey (uint32)
let nextDeviceKey = 1;
const idToKey = new Map();   // socket.id -> key
const keyToId = new Map();   // key -> socket.id

function ensureDeviceKey(socketId) {
  if (!idToKey.has(socketId)) {
    const key = nextDeviceKey++;
    idToKey.set(socketId, key);
    keyToId.set(key, socketId);
  }
  return idToKey.get(socketId);
}

function broadcastClientList() {
  const list = [];
  for (const [socketId, c] of clients.entries()) {
    list.push({ socketId, type: c.type, deviceId: c.deviceId || '', ip: c.ip || '', color: c.color || null });
  }
  for (const [_, c] of clients.entries()) if (c.type === 'admin') c.socket.emit('client-list', list);
}
function assignColor() { const color = COLORS[colorIndex % COLORS.length]; colorIndex++; return color; }

io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() || socket.handshake.address;
  clients.set(socket.id, { socket, type: 'unknown', deviceId: null, ip, color: null });

  socket.on('identify', ({ role, deviceId }) => {
    const entry = clients.get(socket.id);
    if (!entry) return;
    entry.type = role || 'unknown';
    entry.deviceId = deviceId || socket.id;
    if (entry.type === 'control') {
      ensureDeviceKey(socket.id);
      entry.color = assignColor();
      socket.emit('assign-color', entry.color);
    }
    broadcastClientList();
  });

  socket.on('request-settings', () => socket.emit('settings', settings));

  socket.on('update-settings', (data) => {
    const entry = clients.get(socket.id);
    if (!entry || entry.type !== 'admin') return;
    settings = { ...settings, ...Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined)) };
    io.emit('settings', settings);
  });

  // Draw vom Control -> an Displays (JSON oder Binär)
  socket.on('draw', (payload) => {
    const key = ensureDeviceKey(socket.id);

    // Binär: prefix (uint32 deviceKey) + 20 Bytes (x,y,angle,seq,flags)
    if (payload instanceof ArrayBuffer || Buffer.isBuffer(payload) || ArrayBuffer.isView(payload)) {
      const src = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      if (src.length >= 20) {
        const out = Buffer.allocUnsafe(24);
        out.writeUInt32LE(key, 0);
        src.copy(out, 4, 0, 20);
        for (const [_, c] of clients.entries()) if (c.type === 'display') {
          // volatile: lieber droppen als puffern
          c.socket.compress(false).volatile.emit('draw', out);
        }
        return;
      }
    }

    // JSON (Fallback): deviceKey anhängen
    const jsonPayload = { ...payload, deviceKey: key };
    for (const [_, c] of clients.entries()) if (c.type === 'display') {
      c.socket.compress(false).volatile.emit('draw', jsonPayload);
    }
  });

  // Ende vom Control -> an Displays (mit deviceKey)
  socket.on('draw-end', () => {
    const key = ensureDeviceKey(socket.id);
    for (const [_, c] of clients.entries()) if (c.type === 'display') {
      c.socket.emit('draw-end', { deviceKey: key });
    }
  });

  // ACK vom Display -> zurück zum passenden Control
  socket.on('draw-ack', ({ deviceKey, seq }) => {
    const controlId = keyToId.get(deviceKey);
    const target = controlId && clients.get(controlId);
    if (target?.socket) target.socket.emit('draw-ack', { seq });
  });

  // Display schlägt Rate vor -> an Control weiterreichen
  socket.on('rate-suggest', ({ deviceKey, targetFps }) => {
    const controlId = keyToId.get(deviceKey);
    const target = controlId && clients.get(controlId);
    if (target?.socket) target.socket.emit('rate-suggest', { targetFps });
  });

  socket.on('kill-client', ({ socketId }) => {
    const entry = clients.get(socket.id);
    if (!entry || entry.type !== 'admin') return;
    const victim = clients.get(socketId);
    if (victim) victim.socket.disconnect(true);
  });

  socket.on('disconnect', () => {
    // Mappings absichtlich behalten (kurze Reconnects)
    clients.delete(socket.id);
    broadcastClientList();
  });

  socket.emit('settings', settings);
});

server.listen(PORT, () => console.log('Server running on port', PORT));
