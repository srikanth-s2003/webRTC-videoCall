const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// SSL certificates
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.svg': 'application/image/svg+xml'
};

const server = https.createServer(options, (req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // CORS headers for WebRTC
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let filePath = url.parse(req.url).pathname;
  
  // Default to index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  const fullPath = path.join(__dirname, 'public', filePath);
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = process.env.PORT || 8088;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`HTTPS Server running at https://${HOST}:${PORT}/`);
  console.log(`Access from mobile: https://YOUR_IP_ADDRESS:${PORT}/`);
  console.log('Note: You may need to accept the self-signed certificate');
});