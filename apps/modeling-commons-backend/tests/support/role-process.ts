import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

export const rolePortMarker = 'ROLE_SERVER_PORT=';

const roleServerScript = path.join(import.meta.dirname, '../fixtures/role-server.ts');

export type RoleProcess = {
  child: ChildProcess;
  port: number;
  output: () => string;
  stop: () => Promise<void>;
};

export function startRoleProcess(role: string, timeoutMs: number): Promise<RoleProcess> {
  const child = spawn(process.execPath, [roleServerScript], {
    env: { ...process.env, SERVER_ROLE: role, FASTIFY_AUTOLOAD_TYPESCRIPT: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const killOnExit = () => child.kill('SIGKILL');
  process.once('exit', killOnExit);
  child.once('exit', () => process.off('exit', killOnExit));
  let output = '';
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      void stop();
      reject(
        new Error(`the ${role} role process did not listen within ${timeoutMs}ms:\n${output}`),
      );
    }, timeoutMs);
    const collect = (chunk: Buffer) => {
      output += chunk.toString('utf8');
      const match = output.match(new RegExp(`${rolePortMarker}(\\d+)`));
      if (!match) return;
      clearTimeout(timer);
      resolve({ child, port: Number(match[1]), output: () => output, stop });
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`the ${role} role process exited with ${code}:\n${output}`));
    });
  });
}
