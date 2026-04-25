// Polyfills required by the uuid package on Node.js < 20 running under vitest.
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
