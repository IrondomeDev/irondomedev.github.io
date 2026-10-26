import { APIError, TimeoutError } from '@irondome-dev/sdk/node';
import { createSignupHandler } from './signup.js';

const input = { email: 'person@example.test' };
const allowed = { provider: 'custom', valid: true, disposable: false, reason: 'not_listed' };
const blocked = { provider: 'custom', valid: true, disposable: true, reason: 'blocked_domain' };

// synthetic results, not real domain classifications.
const scenarios = [
  ['allowed', input, async () => allowed],
  ['blocked', input, async () => blocked],
  ['invalid input', { email: 42 }, async () => allowed],
  ['invalid email', input, async () => { throw new APIError(422, 'invalid_email'); }],
  ['quota exhausted', input, async () => { throw new APIError(429, 'monthly_quota_exceeded'); }],
  ['timeout', input, async () => { throw new TimeoutError('Offline timeout fixture.'); }],
];

for (const [scenario, payload, checkResult] of scenarios) {
  const calls = { check: 0, createAccount: 0, sendOTP: 0 };
  const signup = createSignupHandler({
    client: { check: async () => { calls.check++; return checkResult(); } },
    continueExistingSignup: async () => {
      // count calls without performing auth work.
      calls.createAccount++;
      calls.sendOTP++;
      return { status: 202, body: { status: 'verification_pending' } };
    },
  });
  const result = await signup(payload);
  console.log(JSON.stringify({ scenario, status: result.status, calls }));
}
