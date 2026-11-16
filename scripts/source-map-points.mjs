import { writeFile } from 'node:fs/promises';
const locations = [
  ['sjpp', 'Saint-Jean-Pied-de-Port, France'], ['astorga', 'Astorga, Spain'],
  ['sarria', 'Sarria, Lugo, Spain'], ['lisboa', 'Lisboa, Portugal'],
  ['porto', 'Porto, Portugal'], ['tui', 'Tui, Pontevedra, Spain'],
  ['valenca', 'Valença, Viana do Castelo, Portugal'], ['santiago', 'Santiago de Compostela, Spain'],
];
const points = [];
for (const [id, query] of locations) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' }).toString();
  const response = await fetch(url, { headers: { 'User-Agent': 'T4F-Academic-Map/1.0 (github.com/Thiago-code-lab/Dashboards-Tour4Friends)' } });
  if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
  const result = (await response.json())[0];
  if (!result || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) throw new Error(`No point for ${query}`);
  points.push({ id, query, latitude: Number(result.lat), longitude: Number(result.lon), source: url.href, osmType: result.osm_type, osmId: result.osm_id, retrievedOn: '2026-11-16' });
  process.stdout.write(`${id}: ${result.lat}, ${result.lon}\n`);
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
await writeFile('src/lib/commercial/map-points.json', JSON.stringify({ attribution: '© OpenStreetMap contributors; ODbL', points }, null, 2));
