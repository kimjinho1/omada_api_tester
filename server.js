const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

function proxyRequest(targetUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const hdrs = { ...headers };
    if (body) hdrs['Content-Length'] = Buffer.byteLength(body);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: hdrs,
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        // Extract cookies from Set-Cookie headers
        const cookies = (res.headers['set-cookie'] || [])
          .map(c => c.split(';')[0]).join('; ');
        resolve({ status: res.statusCode, body: data, cookies });
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

function proxyRequestWithCookie(targetUrl, method, headers, body, cookie) {
  if (cookie) headers['Cookie'] = cookie;
  return proxyRequest(targetUrl, method, headers, body);
}

const server = http.createServer(async (req, res) => {
  // Serve static files
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // API proxy
  if (req.method === 'POST' && req.url === '/proxy') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { url, method, headers, data } = JSON.parse(body);
        const result = await proxyRequest(url, method || 'GET', headers || {}, data ? JSON.stringify(data) : null);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Internal API proxy (login + action in one shot)
  if (req.method === 'POST' && req.url === '/proxy-internal') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { baseUrl, omadacId, siteId, apMac, username, password, wlanId } = JSON.parse(body);

        // Step 1: Internal login
        const loginResult = await proxyRequest(
          `${baseUrl}/${omadacId}/api/v2/login`, 'POST',
          { 'Content-Type': 'application/json' },
          JSON.stringify({ username, password })
        );
        const loginData = JSON.parse(loginResult.body);
        if (loginData.errorCode !== 0) throw new Error(loginData.msg);

        const token = loginData.result.token;
        // Extract session cookie from response
        const cookieHeader = loginResult.headers || '';

        // Step 2: PATCH wlanId
        const patchUrl = `${baseUrl}/${omadacId}/api/v2/sites/${siteId}/eaps/${apMac}`;
        const patchResult = await proxyRequestWithCookie(
          patchUrl, 'PATCH',
          { 'Content-Type': 'application/json', 'Csrf-Token': token },
          JSON.stringify({ wlanId }),
          loginResult.cookies
        );

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: patchResult.status, body: patchResult.body }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Omada API Tester: http://localhost:${PORT}`);
});
