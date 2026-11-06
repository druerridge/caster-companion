import { spawnSync } from 'node:child_process';

interface RunOptions {
  cwd?: string;
  /** Don't echo the arguments (they contain secrets). */
  secretArgs?: boolean;
}

// On Windows, .cmd/.bat shims (npm, npx, gh, gradlew.bat) need a shell; a plain
// executable path (e.g. keytool) must NOT use one, or spaces in args split them.
const needsShell = (command: string) =>
  process.platform === 'win32' && (!/[\\/]/.test(command) || /\.(bat|cmd)$/i.test(command));

/** Run a command, streaming output; throws on non-zero exit. */
export function run(command: string, args: string[], options: RunOptions = {}): void {
  console.log(`\n> ${command} ${options.secretArgs ? '<args hidden>' : args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: 'inherit',
    shell: needsShell(command),
  });
  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status ?? result.signal}`);
  }
}

/** Run a command and return trimmed stdout; throws on non-zero exit. */
export function capture(command: string, args: string[], cwd?: string): string {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: needsShell(command) });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr}`);
  }
  return result.stdout.trim();
}
