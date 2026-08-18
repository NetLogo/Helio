import { ID_PATTERN } from '#src/shared/utils/id.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NANOID_RE = new RegExp(ID_PATTERN);
const MAX_LENGTH = 36;

// This is the only place in the codebase that still accepts a UUID after the
// NanoID migration, and it stays that way on purpose. x-correlation-id and
// request-id headers routinely arrive as UUIDs from upstream proxies and
// tracing systems, so rejecting them would discard a usable trace id and
// break the correlation chain. This is deliberate upstream interop, not
// leftover backward compatibility, so a later UUID sweep should skip it.
export function validateRequestId(value: string | undefined): boolean {
  return typeof value === 'string' && value.length <= MAX_LENGTH && (UUID_RE.test(value) || NANOID_RE.test(value));
}
