require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8000;

// Service URLs (Docker container hostnames)
const services = {
  '/api/auth': process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  '/api/users': process.env.USER_SERVICE_URL || 'http://user-service:3002',
  '/api/emergencies': process.env.EMERGENCY_SERVICE_URL || 'http://emergency-service:3003',
  '/api/response': process.env.RESPONSE_SERVICE_URL || 'http://response-service:3004',
  '/api/services': process.env.ADMIN_SERVICE_URL || 'http://admin-service:3005'
};

// Generic Native Proxy Handler
Object.keys(services).forEach(routePrefix => {
  const targetUrl = services[routePrefix];

  app.use(routePrefix, (req, res) => {
    const target = new URL(targetUrl);

    // Strip the route prefix (e.g. /api/services/pending -> /pending)
    let path = req.originalUrl.replace(routePrefix, '');
    if (!path.startsWith('/')) path = '/' + path;

    const options = {
      hostname: target.hostname,
      port: target.port,
      path: path,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy error for ${routePrefix}:`, err.message);
      res.status(502).json({ error: 'Bad Gateway - Service unreachable' });
    });

    req.pipe(proxyReq, { end: true });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is running' });
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});