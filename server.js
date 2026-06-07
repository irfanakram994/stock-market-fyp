const { createServer } = require('http');
const net = require('net');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const startPort = parseInt(process.env.PORT || '3000', 10);

function canUsePort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', (error) => {
      resolve(error.code !== 'EADDRINUSE' ? port : null);
    });

    tester.once('listening', () => {
      tester.close(() => resolve(port));
    });

    tester.listen(port, hostname);
  });
}

async function findAvailablePort(port) {
  const availablePort = await canUsePort(port);
  if (availablePort) return availablePort;
  return findAvailablePort(port + 1);
}

async function main() {
  const port = await findAvailablePort(startPort);
  if (port !== startPort) {
    console.log(`> Port ${startPort} is in use; using ${port} instead`);
  }

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      // Set larger header size limits
      const parsed = parse(req.url, true);
      await handle(req, res, parsed);
    } catch (err) {
      console.error('Request handler error:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Configure server to accept larger headers
  server.maxHeaderSize = 16 * 1024; // 16 KB (default is 8 KB)
  server.maxHeadersCount = 200;

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
