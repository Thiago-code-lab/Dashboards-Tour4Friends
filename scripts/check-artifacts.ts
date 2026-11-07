import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const forbiddenNames = tracked.filter(
  (path) => /(^|\/)\.env($|\.)/.test(path) && !path.endsWith('.env.example'),
);
if (forbiddenNames.length)
  throw new Error(`Configuração privada versionada: ${forbiddenNames.join(', ')}`);
const files = (root: string): string[] =>
  readdirSync(root).flatMap((name) => {
    const path = `${root}/${name}`;
    return statSync(path).isDirectory() ? files(path) : [path];
  });
const secrets: string[] = [];
if (existsSync('backend/.env')) {
  const text = readFileSync('backend/.env', 'utf8');
  const connection = text
    .match(/^DATABASE_URL=(.+)$/m)?.[1]
    ?.trim()
    .replace(/^['"]|['"]$/g, '');
  if (connection) {
    const password = new URL(connection).password;
    if (password.length >= 16) secrets.push(password);
  }
}
const violations = files('dist')
  .filter((path) => /\.(js|html|json|css|map)$/.test(path))
  .filter((path) => {
    const text = readFileSync(path, 'utf8');
    return (
      /-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{35,}|postgresql\+psycopg:\/\//.test(
        text,
      ) || secrets.some((secret) => text.includes(secret))
    );
  });
if (violations.length)
  throw new Error(`Possível segredo no artefato: ${violations.join(', ')}. Conteúdo omitido.`);
process.stdout.write(
  'Artefato estático sem credenciais detectadas; arquivos de ambiente privados fora do Git.\n',
);
