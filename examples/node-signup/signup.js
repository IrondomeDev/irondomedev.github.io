import { APIError, ValidationError } from '@irondome-dev/sdk/node';

const response = (status, error, message) => ({
  status,
  body: { error, message },
});

// keep normal auth validation before this step.
function parseSignup(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => key !== 'email') ||
      typeof input.email !== 'string') return null;

  const email = input.email;
  // reject malformed or oversized payloads.
  if (!email || email.length > 1024 || !email.isWellFormed() ||
      /[\u0000-\u001f\u007f]/u.test(email) ||
      Buffer.byteLength(JSON.stringify({ email }), 'utf8') > 1024) return null;

  return Object.freeze({ email });
}

export function createSignupHandler({ client, continueExistingSignup }) {
  if (typeof client?.check !== 'function' ||
      typeof continueExistingSignup !== 'function') {
    throw new TypeError('A screening client and existing signup continuation are required.');
  }

  return async function signup(input) {
    const validated = parseSignup(input);
    if (!validated) {
      return response(400, 'invalid_signup_input',
        'Provide a valid email address.');
    }

    let result;
    try {
      // one attempt; no automatic retry.
      result = await client.check(validated.email);
    } catch (error) {
      if (error instanceof ValidationError) {
        return response(400, 'invalid_signup_input', 'Provide a valid email address.');
      }
      if (error instanceof APIError && error.code === 'invalid_email') {
        return response(400, 'invalid_email', 'Provide a valid email address.');
      }
      // continue without a classification if screening fails.
    }

    if (result?.valid === true && result.disposable === true) {
      return response(422, 'email_not_allowed',
        'Please use a non-disposable email address.');
    }

    // keep auth errors outside the screening catch.
    return continueExistingSignup(validated);
  };
}
