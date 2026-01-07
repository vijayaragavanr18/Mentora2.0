const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
});

server.on('error', (err) => {
  console.error('[Server Error]:', err);
});

server.on('listening', () => {
  console.log('[Server] Now listening on http://127.0.0.1:5000');
});

server.listen(5000, '127.0.0.1', () => {
  console.log('[Server] Callback: server started');
});

// Keep alive
setInterval(() => {
  console.log('[Heartbeat] Server alive at', new Date().toISOString());
}, 3000);
