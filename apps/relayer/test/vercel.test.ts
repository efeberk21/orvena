import assert from 'node:assert/strict';
import { after, test } from 'node:test';

process.env.ORVENA_DEPLOYMENT = 'vercel';
process.env.VITE_CHAIN_ID = '10143';
process.env.APP_ORIGIN = 'https://orvena.test';
process.env.RELAYER_READ_ONLY = '1';
const { default: api } = await import('../src/vercel.js');
const { default: server } = await import('../src/index.js');
after(() => server.close());

test('serverless health exposes public configuration without a signing key', async () => {
  const response = await api.fetch(new Request('https://orvena.test/api/health'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.chainId, 10143);
  assert.equal(body.sponsorshipReady, false);
  assert.equal(body.reservedWei, null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(body).includes('privateKey'));
});
test('serverless adapter preserves origin and strict protocol request validation', async () => {
  const request = (origin: string, body: unknown) => new Request('https://orvena.test/api/relay', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await api.fetch(request('https://evil.test', { data: '0x00' }))).status, 403);
  assert.equal((await api.fetch(request('https://orvena.test', { data: '0x00', to: '0x1234' }))).status, 400);
  assert.equal((await api.fetch(request('https://orvena.test', { data: '0x00' }))).status, 503);
});
test('serverless adapter rejects unknown routes and bounds actual streamed body size', async () => {
  assert.equal((await api.fetch(new Request('https://orvena.test/api/other'))).status, 404);
  const request = new Request('https://orvena.test/api/relay', { method: 'POST', body: 'x'.repeat(70001) });
  assert.equal((await api.fetch(request)).status, 413);
});
