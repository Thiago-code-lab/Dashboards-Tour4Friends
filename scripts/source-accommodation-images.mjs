import { mkdir, writeFile } from 'node:fs/promises';
const images = [
  ['economico', 'https://unsplash.com/photos/a-simple-hotel-room-with-a-bed-nightstand-and-curtains-ig3TQMJElAw'],
  ['standard', 'https://unsplash.com/photos/a-hotel-room-with-a-tv-and-a-bed-8hGJaAJyzIg'],
  ['superior', 'https://unsplash.com/photos/a-neatly-made-bed-in-a-modern-hotel-room-mNdhu5gl_P4'],
];
await mkdir('public/images/accommodations', { recursive: true });
for (const [name, source] of images) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image source HTTP ${response.status}: ${source}`);
  const html = await response.text();
  const description = /<meta[^>]*name="description"[^>]*content="([^"]+)"/i.exec(html)?.[1];
  process.stdout.write(`${name}: ${description}\n`);
  const match = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i.exec(html);
  if (!match) throw new Error(`Source lacks image: ${source}`);
  const url = new URL(match[1].replaceAll('&amp;', '&'));
  if (url.hostname !== 'images.unsplash.com') throw new Error('Unexpected image origin');
  url.search = '';
  url.searchParams.set('w', '1000'); url.searchParams.set('q', '82'); url.searchParams.set('fm', 'jpg');
  const photo = await fetch(url);
  if (!photo.ok || !photo.headers.get('content-type')?.startsWith('image/')) throw new Error('Invalid photo response');
  await writeFile(`public/images/accommodations/${name}.jpg`, new Uint8Array(await photo.arrayBuffer()));
  process.stdout.write(`${name}: downloaded from ${source}\n`);
}
