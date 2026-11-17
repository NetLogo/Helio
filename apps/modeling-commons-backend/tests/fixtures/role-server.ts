import type { AddressInfo } from 'node:net';
import { rolePortMarker } from '../support/role-process.ts';
import { buildApp } from '../support/server.ts';

const app = await buildApp({ logLevel: 'info' });
await app.listen({ port: 0, host: '127.0.0.1' });
process.stdout.write(`\n${rolePortMarker}${(app.server.address() as AddressInfo).port}\n`);

const shutdown = () => {
  void app.close().finally(() => process.exit(0));
};
process.once('SIGTERM', shutdown);
process.stdin.once('end', shutdown);
process.stdin.resume();
