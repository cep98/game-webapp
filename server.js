const express = require("express");
const app     = express();
const http    = require("http").createServer(app);
const io      = require("socket.io")(http);

app.use(express.static("public"));

const clients = {}; // socket.id → { role, deviceId, ip }

function broadcastClientList() {
  const list = Object.values(clients).map(c => ({
    type:     c.role,      // "control", "display" (Game), "admin"
    deviceId: c.deviceId,
    ip:       c.ip
  }));
  // nur an Admins senden
  for (let sid in clients) {
    if (clients[sid].role === "admin") {
      io.to(sid).emit("client-list", list);
    }
  }
}

io.on("connection", socket => {
  const ip = socket.handshake.address;
  clients[socket.id] = { role: null, deviceId: null, ip };

  socket.on("identify", ({ role, deviceId }) => {
    clients[socket.id].role     = role;
    clients[socket.id].deviceId = deviceId;
    broadcastClientList();
  });

  // vom Control einlaufende Pointer‐Daten
  socket.on("draw", data => {
    // data: { x, y, deviceId }
    socket.broadcast.emit("draw", data);
  });

  // Admin löscht Canvas (Game + ggf. Display)
  socket.on("clear", () => {
    io.emit("clear");
  });

  // Admin kickt ein Control‐Gerät
  socket.on("kick", ({ deviceId }) => {
    for (let sid in clients) {
      if (clients[sid].deviceId === deviceId && clients[sid].role === "control") {
        io.sockets.sockets.get(sid)?.disconnect(true);
        break;
      }
    }
    broadcastClientList();
  });

  socket.on("disconnect", () => {
    delete clients[socket.id];
    broadcastClientList();
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
