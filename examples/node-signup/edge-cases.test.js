import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APIError, ValidationError, ProtocolError, BusyError, ClosedError, CancelledError, TimeoutError,
} from '@irondome-dev/sdk/node';
import { createSignupHandler } from './signup.js';

const input = { email: 'person@example.test' };
const allowed = { provider: 'custom', valid: true, disposable: false, reason: 'not_listed' };

test('missing integration dependencies fail at wiring time', () => {
  for (const config of [{}, { client: {} }, { client: { check() {} } }]) {
    assert.throws(() => createSignupHandler(config), TypeError);
  }
});

function fixture(outcome, continuation = async () => ({ status: 202 })) {
  if (arguments.length === 0) outcome = allowed;
  const calls = { check: 0, continuation: 0, close: 0 };
  const signup = createSignupHandler({
    client: {
      async check() {
        calls.check++;
        if (outcome instanceof Error) throw outcome;
        return outcome;
      },
      close() { calls.close++; },
    },
    async continueExistingSignup(validated) {
      calls.continuation++;
      return continuation(validated);
    },
  });
  return { signup, calls };
}

test('all malformed complete inputs stop before the dependency and auth', async () => {
  const invalid = [null, [], 'email', {}, { ...input, email: 42 },
    { email: '' },
    { ...input, unknown: true }, { ...input, email: 'a\u0000@example.test' },
    { ...input, email: '\ud800@example.test' },
    { ...input, email: 'a'.repeat(1025) },
    { ...input, email: `${'é'.repeat(510)}@example.test` }];
  for (const payload of invalid) {
    const { signup, calls } = fixture();
    assert.equal((await signup(payload)).status, 400);
    assert.deepEqual(calls, { check: 0, continuation: 0, close: 0 });
  }
});

test('unusable screening results continue signup once without retry', async () => {
  for (const result of [undefined, null, {}, { valid: true },
    { valid: false, disposable: false }, { valid: false, disposable: true },
    { valid: true, disposable: 'false' }, { valid: true, disposable: 'true' }]) {
    const { signup, calls } = fixture(result);
    assert.equal((await signup(input)).status, 202);
    assert.deepEqual(calls, { check: 1, continuation: 1, close: 0 });
  }
});

test('validation rejects while dependency failures continue without echoing errors', async () => {
  const errors = [new ValidationError('Synthetic private detail.'),
    new ProtocolError('Synthetic private detail.'), new BusyError('Synthetic private detail.'),
    new ClosedError('Synthetic private detail.'), new CancelledError('Synthetic private detail.'),
    new APIError(401, 'invalid_api_key'), new APIError(500, 'internal_error'),
    new Error('Synthetic private detail.')];
  for (const error of errors) {
    const { signup, calls } = fixture(error);
    const result = await signup(input);
    assert.equal(result.status, error instanceof ValidationError ? 400 : 202);
    assert.equal(calls.check, 1);
    assert.equal(calls.continuation, error instanceof ValidationError ? 0 : 1);
    assert.doesNotMatch(JSON.stringify(result), /Synthetic|private|example\.test|invalid_api_key/);
  }
});

test('auth failures propagate once after allowed, unavailable, and unusable checks', async () => {
  for (const outcome of [allowed, null, new TimeoutError('Offline fixture.'),
    new APIError(429, 'monthly_quota_exceeded')]) {
    const failure = new Error('Existing auth flow failure.');
    const { signup, calls } = fixture(outcome, async () => { throw failure; });
    await assert.rejects(signup(input), error => error === failure);
    assert.deepEqual(calls, { check: 1, continuation: 1, close: 0 });
  }
});

test('signup waits for the check to settle before continuing after a timeout', async () => {
  let rejectCheck;
  const calls = [];
  const signup = createSignupHandler({
    client: {
      check() {
        calls.push('check');
        return new Promise((resolve, reject) => { rejectCheck = reject; });
      },
    },
    async continueExistingSignup() {
      calls.push('auth');
      return { status: 202 };
    },
  });
  const pending = signup(input);
  assert.deepEqual(calls, ['check']);
  rejectCheck(new TimeoutError('Offline fixture.'));
  assert.equal((await pending).status, 202);
  assert.deepEqual(calls, ['check', 'auth']);
});

test('same reused client serves two requests without being closed', async () => {
  const { signup, calls } = fixture();
  await signup(input);
  await signup(input);
  assert.deepEqual(calls, { check: 2, continuation: 2, close: 0 });
});

test('check and auth receive the same immutable original-email snapshot', async () => {
  const original = { email: 'Person+tag@Example.test' };
  const mutableInput = { ...original };
  let checked;
  let continued;
  const signup = createSignupHandler({
    client: { async check(email) { checked = email; return allowed; } },
    async continueExistingSignup(validated) { continued = validated; return { status: 202 }; },
  });
  const pending = signup(mutableInput);
  mutableInput.email = 'changed@example.test';
  await pending;
  assert.equal(checked, original.email);
  assert.deepEqual(continued, original);
  assert.equal(Object.isFrozen(continued), true);
});


test('fail-open preserves a rejection returned by the existing auth flow', async () => {
  const authRejection = { status: 400, body: { error: 'existing_auth_validation' } };
  const { signup, calls } = fixture(new TimeoutError('Offline fixture.'),
    async () => authRejection);
  assert.equal(await signup(input), authRejection);
  assert.deepEqual(calls, { check: 1, continuation: 1, close: 0 });
});
