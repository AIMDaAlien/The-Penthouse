import { isProduction } from '../config/env.js';

export function verifyChallenge(payload: string) {
  if (!isProduction) return payload.length > 0;
  return payload.length > 20;
}
