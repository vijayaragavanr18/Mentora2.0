const express = require('express');
const { createServer } = require('http');
const app = express();
app.get('/test', (req, res) => { console.log('HIT'); res.json({ ok: true }); });
const srv = createServer(app);
srv.listen(5001, '0.0.0.0', () => console.log('Test server on 5001'));
