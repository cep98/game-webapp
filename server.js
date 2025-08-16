const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', socket => {
  console.log('Neue Verbindung:', socket.id);

  socket.on('identify', data => {
    socket.role = data.role;
    socket.deviceId = data.deviceId;

    if (socket.role === 'control') {
      // Farbe zufällig zuweisen und an Control schicken
      const color = getRandomColor();
      socket.emit('assign-color', color);
    }
  });

  socket.on('draw', data => {
    io.emit('motion', {
      deviceId: data.deviceId,
      x: data.x,
      y: data.y,
      color: data.color
    });
  });

  socket.on('draw-end', data => {
    io.emit('motion', {
      deviceId: data.deviceId,
      x: -1, y: -1
    });
  });

  socket.on('disconnect', () => {
    console.log('Verbindung getrennt:', socket.id);
  });
});

function getRandomColor() {
  const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0'];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
