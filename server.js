const express = require('express');
const http    = require('http');
const socket  = require('socket.io');

const app  = express();
const serv = http.createServer(app);
const io   = socket(serv);

app.use(express.static('public'));

io.on('connection', socket => {
  let role = null;

  socket.on('identify', data => {
    role = data.role;
    if (role === 'control') {
      io.emit('assign-color', getRandomColor());
    }
  });

  socket.on('draw', data => {
    if (role === 'control') {
      io.emit('motion', data);
    }
  });

  socket.on('draw-end', data => {
    if (role === 'control') {
      io.emit('draw-end', data);
    }
  });
});

function getRandomColor() {
  const colors = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231'];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
serv.listen(PORT, () => {
  console.log('Server läuft auf Port', PORT);
});
