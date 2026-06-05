const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
