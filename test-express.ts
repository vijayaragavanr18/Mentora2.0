import express from 'express';

const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Express works!' });
});

const server = app.listen(5000, () => {
  console.log('Test server running on http://localhost:5000');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Process still alive after listen');
