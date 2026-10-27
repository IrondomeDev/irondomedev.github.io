# Block disposable-email signups in Node.js

A small **server-side screening integration**, not an authentication system. It
uses the published, unchanged `@irondome-dev/sdk@0.2.0` API. The offline demo and
tests need no API key and make no live requests, create no accounts, and send no
verification emails.

Read the companion tutorial: [Block disposable email signups in Node.js](https://irondome.dev/blogs/block-disposable-email-signups-nodejs).
It explains the signup boundary and walks through the implementation and tests below.

## Run

Requires Node.js 22 or newer. Verified locally with Node.js 24.22.1 and npm 11.9.0.

```sh
npm ci --ignore-scripts
npm test
npm run demo
```

`npm test` runs the ten reader-facing cases in `signup.test.js`, plus boundary
and SDK-contract tests. To run only the tutorial's compact test file:

```sh
node --test signup.test.js
```

The demo prints only scenario names, application HTTP statuses, and mock call
counts. Its fixture email is not submitted anywhere, and the classifications
are not claims about that domain.

| Scenario | Application status | Check calls | Account / OTP calls |
| --- | --- | --- | --- |
| Allowed | 202 from the stub | 1 | 1 / 1 |
| Disposable | 422 | 1 | 0 / 0 |
| Invalid complete input | 400 | 0 | 0 / 0 |
| API rejects email syntax | 400 | 1 | 0 / 0 |
| Quota exhausted | 202 from the stub | 1 | 1 / 1 |
| Timeout | 202 from the stub | 1 | 1 / 1 |

## Integrate at your existing auth boundary

This narrow passwordless example accepts `{ email }` only and preserves the
submitted address. Its coarse shape/size checks are not an email parser. Run your existing auth
validation for email syntax and all other required fields before this screening
step; an unavailable API cannot provide a syntax verdict. Apply your existing request-body limit and abuse/rate
controls before invoking this handler; this example does not implement them.

Use one client per Node.js process/warm instance. This composition code is a
template: `continueExistingSignup` must be supplied by your existing auth system.

```js
import { IronDome } from '@irondome-dev/sdk/node';
import { createSignupHandler } from './signup.js';

export const screeningClient = new IronDome({
  apiKey: process.env.IRONDOME_API_KEY,
  timeoutMs: 1500,
});

// wire once during server startup.
export function wireSignup(continueExistingSignup) {
  return createSignupHandler({ client: screeningClient, continueExistingSignup });
}
```

Keep `IRONDOME_API_KEY` in server-side secret configuration. The SDK defaults to
`https://api.irondome.dev`. A missing or invalid key configuration throws at
construction; do not turn that startup error into an allow result. The 1,500 ms
timeout is this example's policy, not a latency guarantee. Close the client with
`screeningClient.close()` only during final process shutdown, never after each request.

Wire the returned handler inside the operation that **actually creates the user**.
Its continuation must own both account creation and verification delivery and
return your application's `{ status, body }` response. Adapt that result to your
framework's response API. Keep your existing duplicate-account, transactional,
delivery, and authentication behavior. This example does not implement passwords,
sessions, storage, OTP generation, or production auth.

A browser pre-check is bypassable. If a managed auth provider exposes another
public signup endpoint, route-level screening does not protect it: enforce the
policy in a provider-supported pre-user-creation hook or otherwise ensure that
every creation path passes this server-side boundary.

## Policy and failure behavior

1. Retain normal auth validation, then call `client.check(email)` once.
2. Local input failures, SDK `ValidationError`, and known `invalid_email` errors
   become application `400`; a confirmed disposable result becomes `422`.
3. A non-disposable result proceeds to the existing signup flow. Timeout, network,
   quota, service, and unusable-response failures also continue, without inventing
   a non-disposable classification.
4. The continuation runs at most once, outside the screening catch. Its own
   errors and rejection responses remain the auth system's responsibility.

This is a deliberate **fail-open** policy. It keeps screening outages from
blocking registrations, but disposable addresses may pass unchecked while
screening is unavailable. Do not describe unavailable checks as allowed detector
results. The callback still performs normal auth and ownership verification.

Upstream statuses differ: disposable classification is HTTP `200`; `invalid_email`
is HTTP `422`; quota exhaustion is HTTP `429`. The app rejects invalid email with
`400` but continues on quota exhaustion. A continued flow's response comes from
your auth system; the demo's `202` is only a stub response.

The configured timeout bounds how long this check can delay signup. No automatic
retry is added: a timed-out check may already have counted toward usage. Monitor
aggregate failure counts so a persistent quota or credential problem does not
silently disable screening. Do not log email addresses, API keys, or raw errors.

`valid: true` describes syntax, not ownership or deliverability. Preserve normal
email syntax checks, verification, request limits, and other abuse controls even
when screening is unavailable. Review framework/APM body and header capture
separately; this policy module performs no logging.

## What the tests establish

- Invalid input and confirmed disposable results never invoke the mock account/OTP
  continuation. Dependency failures invoke it exactly once after the check settles.
- No handler retry; auth failures propagate once after both allowed and fail-open
  outcomes. Auth rejection responses are preserved. Requests reuse the supplied
  client without closing it.
- Exact installed Node SDK exports and local preflight errors work; a synthetic
  transport exercises the published shared parser's typed quota error.

The tests do **not** verify live classification accuracy, real billing, production
Node transport behavior, auth-provider hooks, delivery, deployment, or absence of
an alternate signup path. Those remain integration acceptance checks.

## Sources (checked 2026-10-26)

- [Published SDK](https://www.npmjs.com/package/@irondome-dev/sdk/v/0.2.0)
- [Official SDK source at the reviewed revision](https://github.com/IrondomeDev/sdks/tree/98e204607a866b0deda485b089e603315815bf99/javascript)
- [Node.js guide](https://irondome.dev/docs/guides/node)
- [Check API](https://irondome.dev/docs/api/check)
- [Error reference](https://irondome.dev/docs/errors)
