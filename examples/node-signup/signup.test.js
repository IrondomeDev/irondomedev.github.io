import test from 'node:test';
import assert from 'node:assert/strict';
import { APIError, ValidationError, TimeoutError, TransportError } from '@irondome-dev/sdk/node';
import { createSignupHandler } from './signup.js';

const input = { email: 'person@example.test' };
const allowed = { provider: 'custom', valid: true, disposable: false, reason: 'not_listed' };
const blocked = { ...allowed, disposable: true, reason: 'blocked_domain' };
const continuedCalls = ['check', 'createAccount', 'sendOTP'];
const cases = [
  ['allowed', input, allowed, 202, continuedCalls],
  ['blocked', input, blocked, 422, ['check']],
  ['invalid input', { email: 42 }, allowed, 400, []],
  ['invalid email', input, new APIError(422, 'invalid_email'), 400, ['check']],
  ['local validation', input, new ValidationError('Offline fixture.'), 400, ['check']],
  ['quota exhausted', input, new APIError(429, 'monthly_quota_exceeded'), 202, continuedCalls],
  ['timeout', input, new TimeoutError('Offline fixture.'), 202, continuedCalls],
  ['network failure', input, new TransportError('Offline fixture.'), 202, continuedCalls],
  ['service failure', input, new APIError(500, 'internal_error'), 202, continuedCalls],
  ['unusable response', input, null, 202, continuedCalls],
];

for (const [name, payload, outcome, status, expectedCalls] of cases) {
  test(name, async () => {
    const calls = [];
    const signup = createSignupHandler({
      client: {
        async check(email) {
          assert.equal(email, input.email);
          calls.push('check');
          if (outcome instanceof Error) throw outcome;
          return outcome;
        },
      },
      async continueExistingSignup(validated) {
        assert.deepEqual(validated, input);
        // record effects without creating accounts or sending mail.
        calls.push('createAccount');
        calls.push('sendOTP');
        return { status: 202, body: { status: 'verification_pending' } };
      },
    });

    assert.equal((await signup(payload)).status, status);
    // require the expected call sequence.
    assert.deepEqual(calls, expectedCalls);
  });
}
