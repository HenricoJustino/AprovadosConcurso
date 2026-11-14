import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';

export function request(app, url, options = {}) {
  return new Promise((resolve, reject) => {
    const output = [];
    const socket = new Duplex({ read() {}, write(chunk, encoding, callback) { output.push(Buffer.from(chunk)); callback(); } });
    socket.remoteAddress = '127.0.0.1';
    const req = new IncomingMessage(socket);
    req.method = options.method || 'GET'; req.url = url; req.httpVersionMajor = 1; req.httpVersionMinor = 1; req.complete = true;
    req.headers = { host: 'localhost', ...Object.fromEntries(Object.entries(options.headers || {}).map(([k,v]) => [k.toLowerCase(),v])) };
    if (options.body) req.headers['content-length'] = String(Buffer.byteLength(options.body));
    const res = new ServerResponse(req); res.assignSocket(socket);
    const timeout = setTimeout(() => reject(new Error(`Tempo excedido: ${url}`)), 3000);
    res.on('finish', () => {
      clearTimeout(timeout);
      const raw = Buffer.concat(output).toString('utf8');
      const body = raw.slice(raw.indexOf('\r\n\r\n') + 4);
      resolve({ status: res.statusCode, json: async () => JSON.parse(body) });
      socket.destroy();
    });
    res.on('error', reject);
    if (options.body) req.push(options.body);
    req.push(null);
    app.handle(req, res);
  });
}
