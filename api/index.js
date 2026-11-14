import { app } from '../server/index.js';

// Mantém a rota e os filtros mesmo se o provedor reescrever req.url para /api/index.
export default function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.searchParams.get('__route') ?? req.query?.__route;
  if (typeof path === 'string') {
    if (!/^[a-z0-9/_-]*$/i.test(path)) {
      res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Rota inválida.' }));
    }
    url.searchParams.delete('__route');
    const query = url.searchParams.toString();
    req.url = `/api/${path}${query ? '?' + query : ''}`;
  }
  return app(req, res);
}
