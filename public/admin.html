<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin</title>
  <style>
    body { margin:0; background:#111; color:#fff; font-family:sans-serif; }
    header, section { padding:1em; }
    header { display:flex; align-items:center; justify-content:space-between; background:#222; }
    #settings { display:flex; gap:1em; align-items:center; }
    label { font-size:0.9em; }
    input[type=number], input[type=range] { width:4em; }
    #clients { list-style:none; padding:0; margin:1em; }
    #clients li { padding:0.5em; border-bottom:1px solid #333; }
  </style>
</head>
<body>
  <header>
    <h1>Admin-Panel</h1>
    <div id="settings">
      <label>Max. Winkel H:<input id="maxHor" type="number" min="0" max="180" value="20" />°</label>
      <label>Max. Winkel V:<input id="maxVer" type="number" min="0" max="180" value="20" />°</label>
      <label>Glättung:<input id="smoothing" type="range" min="0" max="100" value="50" /> <span id="smoothingVal">50%</span></label>
    </div>
  </header>

  <section>
    <h2>Angeschlossene Clients</h2>
    <ul id="clients"></ul>
  </section>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    socket.on('connect', () => {
      socket.emit('identify', { role:'admin', deviceId: null });
    });

    // UI-Elemente
    const maxHorInput    = document.getElementById('maxHor');
    const maxVerInput    = document.getElementById('maxVer');
    const smoothingInput = document.getElementById('smoothing');
    const smoothingVal   = document.getElementById('smoothingVal');
    const clientsList    = document.getElementById('clients');

    // Änderungen senden
    function sendSettings() {
      const maxHor    = parseFloat(maxHorInput.value);
      const maxVer    = parseFloat(maxVerInput.value);
      const smoothing = parseFloat(smoothingInput.value) / 100;
      socket.emit('update-settings', { maxHor, maxVer, smoothing });
    }
    maxHorInput.addEventListener('change', sendSettings);
    maxVerInput.addEventListener('change', sendSettings);
    smoothingInput.addEventListener('input', () => {
      smoothingVal.textContent = smoothingInput.value + '%';
      sendSettings();
    });

    // Client-Liste aktualisieren
    socket.on('client-list', list => {
      clientsList.innerHTML = '';
      list.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `${c.type} - ${c.deviceId || 'n/a'} - ${c.ip}`;
        clientsList.appendChild(li);
      });
    });
  </script>
</body>
</html>
