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
