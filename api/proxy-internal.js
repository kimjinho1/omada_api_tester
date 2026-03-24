const https = require('https');

function req(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = { hostname: parsed.hostname, port: parsed.port || 443, path: parsed.pathname + parsed.search, method, headers, rejectUnauthorized: false };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
        resolve({ status: res.statusCode, body: data, cookies });
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

module.exports = async (request, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') { res.status(200).end(); return; }
  if (request.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { baseUrl, omadacId, siteId, apMac, username, password, wlanId } = request.body;

    // Step 1: Internal login
    const login = await req(`${baseUrl}/${omadacId}/api/v2/login`, 'POST', { 'Content-Type': 'application/json' }, JSON.stringify({ username, password }));
    const loginData = JSON.parse(login.body);
    if (loginData.errorCode !== 0) throw new Error(loginData.msg);

    // Step 2: PATCH wlanId
    const patch = await req(`${baseUrl}/${omadacId}/api/v2/sites/${siteId}/eaps/${apMac}`, 'PATCH',
      { 'Content-Type': 'application/json', 'Csrf-Token': loginData.result.token, 'Cookie': login.cookies },
      JSON.stringify({ wlanId }));

    res.status(200).json({ status: patch.status, body: patch.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
