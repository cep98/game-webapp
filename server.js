// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// statische Dateien aus /public/ bereitstellen
app.use(express.static('public'));

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.on('draw', msg => socket.broadcast.emit('draw', msg));
  socket.on('motion', msg => socket.broadcast.emit('motion', msg));
  socket.on('identify', msg => { /* … */ });
  socket.on('updateSettings', cfg => { io.emit('updateSettings', cfg); });
  socket.on('clear', () => io.emit('clear'));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
