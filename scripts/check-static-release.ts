import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { validateDataset } from '../src/lib/validation/dataset';
import { fingerprint } from '../src/lib/analytics/numerical';

const base = '/Dashboards-Tour4Friends/';
const dist = resolve('dist');
const sha256 = (content: Buffer): string => createHash('sha256').update(content).digest('hex');
const sourceSha =
  process.env.RELEASE_SOURCE_SHA ??
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('Revisão de origem inválida.');
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
if (!references.length || !references.some((reference) => reference.endsWith('.css')))
  throw new Error('index.html sem os assets esperados.');
for (const reference of references) {
  if (!reference.startsWith(base)) throw new Error(`Asset fora do prefixo Pages: ${reference}`);
  const file = resolve(dist, reference.slice(base.length));
  if (relative(dist, file).startsWith('..')) throw new Error('Asset fora do pacote estático.');
  readFileSync(file);
}
const source = readFileSync('public/data/demo.json');
const published = readFileSync(resolve(dist, 'data/demo.json'));
if (!source.equals(published)) throw new Error('O snapshot de dist difere do JSON versionado.');
const dataset = validateDataset(JSON.parse(published.toString('utf8')));
const assets = readdirSync(resolve(dist, 'assets'), { withFileTypes: true })
  .filter((file) => file.isFile())
  .map((file) => {
    const content = readFileSync(resolve(dist, 'assets', file.name));
    return { path: `assets/${file.name}`, bytes: content.length, sha256: sha256(content) };
  });
if (!assets.some((asset) => asset.path.endsWith('.js'))) throw new Error('JavaScript ausente.');
mkdirSync('artifacts/release-05', { recursive: true });
writeFileSync(
  'artifacts/release-05/static-package.json',
  JSON.stringify(
    {
      sourceSha,
      generatedAt: new Date().toISOString(),
      base,
      indexSha256: sha256(Buffer.from(html)),
      datasetSha256: sha256(source),
      datasetFingerprint: fingerprint(dataset),
      counts: Object.fromEntries(
        Object.entries(dataset)
          .filter(([, value]) => Array.isArray(value))
          .map(([key, value]) => [key, (value as unknown[]).length]),
      ),
      references,
      assets,
    },
    null,
    2,
  ),
);
process.stdout.write(
  'Pacote estático íntegro, prefixo Pages e JSON idêntico; manifesto em artifacts/release-05/static-package.json.\n',
);
