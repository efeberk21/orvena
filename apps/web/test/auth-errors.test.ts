import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MeraError } from '@category-labs/mera';
import { authError } from '../src/auth-errors';
test('passkey failures expose the cause category without claiming the user cancelled', () => {
  assert.match(authError(new MeraError('PASSKEY_OPERATION_FAILED', 'Failed', { cause: new DOMException('Not allowed', 'NotAllowedError') })), /NotAllowedError/);
  assert.match(authError(new MeraError('PASSKEY_OPERATION_FAILED', 'Failed', { cause: new DOMException('Interrupted', 'AbortError') })), /interrupted/);
  assert.match(authError(new MeraError('PASSKEY_OPERATION_FAILED', 'Failed', { cause: new DOMException('Bad origin', 'SecurityError') })), /domain/);
  assert.match(authError(new MeraError('PRF_UNAVAILABLE', 'No PRF')), /Windows Hello/);
});
