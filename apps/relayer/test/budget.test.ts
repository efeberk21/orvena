import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BudgetLedger } from '../src/budget.js';
test('the sponsor budget survives restarts and fails closed for a different wallet', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orvena-budget-test-'));
  const file = join(directory, 'budget.json');
  const initial = new BudgetLedger(file, '10143:wallet-a', 100n);
  await initial.load(); await initial.reserve(60n);
  const restarted = new BudgetLedger(file, '10143:wallet-a', 100n);
  await restarted.load(); assert.equal(restarted.used, 60n);
  await assert.rejects(restarted.reserve(41n));
  await assert.rejects(restarted.reserve(-1n));
  await restarted.reserve(40n); assert.equal(restarted.used, 100n);
  await assert.rejects(new BudgetLedger(file, '10143:wallet-b', 100n).load());
});
