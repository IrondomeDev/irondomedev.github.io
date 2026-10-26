import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IronDome as NodeIronDome, ValidationError, CancelledError, ClosedError, APIError,
} from '@irondome-dev/sdk/node';
import { IronDome as PortableIronDome } from '@irondome-dev/sdk';

test('published Node entry supports timeout configuration and local preflight errors', async () => {
  const client = new NodeIronDome({ apiKey: 'offline-test-placeholder', timeoutMs: 1500 });
  try {
    await assert.rejects(client.check('\ud800@example.test'), ValidationError);
    await assert.rejects(client.check('person@example.test', { signal: AbortSignal.abort() }), CancelledError);
  } finally {
    client.close();
  }
  await assert.rejects(client.check('person@example.test'), ClosedError);
});

test('published shared response parser produces typed quota errors with no retry', async () => {
  let requests = 0;
  const client = new PortableIronDome({
    apiKey: 'offline-test-placeholder',
    // synthetic transport; no network calls.
    fetch: async () => {
      requests++;
      return new Response(JSON.stringify({ error: { code: 'monthly_quota_exceeded' } }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '60' },
      });
    },
  });
  try {
    await assert.rejects(client.check('person@example.test'), error =>
      error instanceof APIError && error.status === 429 &&
      error.code === 'monthly_quota_exceeded' && error.retryAfterSeconds === 60);
    assert.equal(requests, 1);
  } finally {
    client.close();
  }
});

test('production wiring rejects invalid input and continues once if the client is closed', async () => {
  const previous = process.env.IRONDOME_API_KEY;
  process.env.IRONDOME_API_KEY = 'offline-test-placeholder';
  try {
    const { wireSignup, screeningClient } = await import('./server-integration.js');
    let authCalls = 0;
    const signup = wireSignup(async () => { authCalls++; return { status: 202 }; });
    assert.equal((await signup({})).status, 400);
    screeningClient.close();
    assert.equal(authCalls, 0);
    assert.equal((await signup({ email: 'person@example.test' })).status, 202);
    assert.equal(authCalls, 1);
  } finally {
    if (previous === undefined) delete process.env.IRONDOME_API_KEY;
    else process.env.IRONDOME_API_KEY = previous;
  }
});
