import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ID_PATTERN } from './id.ts';

// `.default` is needed because Ajv and ajv-formats are CJS packages.
// Under `"module": "NodeNext"`, TypeScript resolves the default import as
// the CJS `module.exports` wrapper, requiring `.default` to reach the
// actual constructor / function at the type level.
export const ajv = addFormats.default(new Ajv.default({}), [
  'date-time',
  'time',
  'date',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
]);

// Fastify compiles route schemas with its own Ajv instance, not the one above,
// so both must be given the format. Anything that validates an idSchema has to
// call this or it fails at boot with `unknown format "nanoid"`.
export function addIdFormat(instance: InstanceType<typeof Ajv.default>): void {
  instance.addFormat('nanoid', new RegExp(ID_PATTERN));
}

addIdFormat(ajv);
