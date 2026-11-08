import { spawnSync } from 'node:child_process';
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Execute este script com npm run build:demo.');
const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DATA_MODE: 'demo', VITE_API_BASE_URL: '' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
