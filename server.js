const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;
app.use(express.static('public'));

const COLORS = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231'];
let colorIndex = 0;

io.on('connection', socket => {
  let role = null;
  let deviceId = null;

  socket.on('identify', data => {
    role = data.role;
    deviceId = data.deviceId || socket.id;
    if (role === 'control') {
      const color = COLORS[colorIndex++ % COLORS.length];
      io.emit('assign-color', color); // Direkt an alle für Einfachheit
    }
  });

  socket.on('draw', data => {
    if (!data || !data.deviceId) return;
    io.emit('draw', data);
  });

  socket.on('draw-end', data => {
    if (!data || !data.deviceId) return;
    io.emit('draw-end', data);
  });

  socket.on('disconnect', () => {
    if (role === 'control') {
      io.emit('draw-end', { deviceId });
    }
  });
});

http.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
