import { isIP } from 'node:net';
import server from './index.js';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!['/api/health', '/api/relay'].includes(url.pathname)) return Response.json({ error: 'Route not found.' }, { status: 404 });
    let payload: string | undefined;
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 70000) {
          await reader.cancel();
          return Response.json({ error: 'Request too large.' }, { status: 413 });
        }
        chunks.push(value);
      }
      payload = Buffer.concat(chunks).toString('utf8');
    }
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    const result = await server.inject({ method: request.method as 'GET' | 'POST', url: url.pathname, headers: Object.fromEntries(request.headers), payload, remoteAddress: ip && isIP(ip) ? ip : '127.0.0.1' });
    const headers = new Headers();
    for (const [key, value] of Object.entries(result.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    headers.set('Cache-Control', 'no-store');
    return new Response(result.body, { status: result.statusCode, headers });
  }
};
