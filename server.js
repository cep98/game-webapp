// server.js - Hauptserver
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

oi.on('connection', socket => {
  console.log('Client verbunden:', socket.id);
  socket.on('identify', data => { /* ... */ });
  socket.on('request-settings', () => { /* ... */ });
  // Weitere Event-Handler...
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
