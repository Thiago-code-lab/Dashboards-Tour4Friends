import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const destination = 'output/apresentacao-professor';
const evidence = 'artifacts/professor/slides';
await mkdir(destination, { recursive: true });
await mkdir(evidence, { recursive: true });
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4181', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
const base = 'http://127.0.0.1:4181/Dashboards-Tour4Friends/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const images = {};
const embed = async (path) => `data:image/${path.endsWith('.jpg') ? 'jpeg' : 'png'};base64,${(await readFile(path)).toString('base64')}`;
async function capture(name, locator) {
  const path = `${evidence}/${name}.png`;
  await locator.screenshot({ path, animations: 'disabled' });
  images[name] = await embed(path);
}
async function captureFirstRow(name, locator) {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  const box = await locator.boundingBox();
  const first = await locator.locator('li').first().boundingBox();
  const path = `${evidence}/${name}.png`;
  await page.screenshot({ path, clip: { x: box.x, y: Math.max(0, box.y), width: box.width, height: first.height }, animations: 'disabled' });
  images[name] = await embed(path);
}
async function visit(route) {
  await page.goto(`${base}#/${route}`);
  await page.locator('h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
}
const panel = (title) => page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch { if (attempt === 39) throw new Error('Preview unavailable'); }
    await new Promise((done) => setTimeout(done, 250));
  }
  await visit('');
  await capture('overview', page.locator('.kpi-grid').first());
  await visit('hospedagens');
  await capture('capacity', page.locator('.kpi-grid').first());
  await visit('experiencia');
  await capture('nps', panel('Distribuição das notas NPS'));
  await visit('financeiro');
  await capture('finance', panel('Receita, custo e contribuição'));
  await visit('catalogo');
  const map = panel('Mapa dos caminhos e riscos por etapa');
  await capture('map', map.locator('figure'));
  await page.getByLabel('Roteiro do mapa').selectOption('astorga');
  await captureFirstRow('stages', map.getByRole('list', { name: 'Riscos das etapas' }));
  await page.getByLabel('Data de início', { exact: true }).fill('2027-05-10');
  await page.getByLabel('Ocupação', { exact: true }).selectOption('duplo');
  await page.getByLabel('Pessoas', { exact: true }).fill('2');
  await capture('quote', panel('Orçamento demonstrativo').locator('div.grid').first());
  await capture('quoteResult', panel('Orçamento demonstrativo').locator('dl'));
  const photoSources = {
    economico: 'https://unsplash.com/photos/ig3TQMJElAw',
    standard: 'https://unsplash.com/photos/8hGJaAJyzIg',
    superior: 'https://unsplash.com/photos/mNdhu5gl_P4',
  };
  for (const name of Object.keys(photoSources)) images[name] = await embed(`public/images/accommodations/${name}.jpg`);
  const screenshot = (name, caption = '') => `<figure><img class="screen" src="${images[name]}" alt="Captura real da versão candidata"/><figcaption>${caption || 'Captura real do build local candidato · dados sintéticos / documentais conforme a tela'}</figcaption></figure>`;
  const notes = (text) => `<aside>${text}</aside>`;
  const slide = (title, content, source = '', className = '') => `<section class="slide ${className}"><h2>${title}</h2>${content}${notes(source)}</section>`;
  const slides = [
    `<section class="slide cover"><p class="brand">T4F PERFORMANCE</p><h1>Decisões para cada<br>jornada do peregrino</h1><p class="lead">Planejamento comercial, capacidade e experiência<br>nos Caminhos Francês e Português</p><p class="small">Projeto Integrador V · Fatec Ipiranga<br>Versão candidata de 16/11/2026 · demonstração acadêmica</p></section>`,
    slide('O problema da Tour4Friends', '<p class="lead">Dados comerciais, financeiros e operacionais fragmentados dificultam antecipar a demanda e avaliar os roteiros.</p><div class="columns"><div><h3>Antes de vender</h3><p>Qual roteiro oferecer e que receita pode gerar?</p></div><div><h3>Antes da saída</h3><p>Em quais etapas a capacidade precisa ser conferida?</p></div><div><h3>Depois da viagem</h3><p>Como a experiência afeta a próxima decisão?</p></div></div><p class="takeaway">A solução reúne essas perguntas em uma visão gerencial.</p>', 'Problema e objetivo fornecidos pelo solicitante. Não há mensuração de ganho real nesta demonstração.'),
    slide('O público e o escopo comercial', '<p class="lead">Brasileiros interessados em peregrinar até Santiago de Compostela.</p><div class="two"><div><h3>Caminho Francês</h3><p>Saint-Jean-Pied-de-Port (SJPP)<br>Astorga<br>Sarria</p></div><div><h3>Caminho Português</h3><p>Lisboa<br>Porto Central · Porto Costa<br>Tui/Valença</p></div></div><p class="takeaway">Sete partidas, dentro de dois caminhos.</p>', 'Escopo solicitado; src/lib/commercial/catalog.ts. Catálogo atual: caminhada autoguiada. Não inferir modalidades comerciais sem documento.'),
    slide('As partidas até Santiago', screenshot('map', 'Captura real do mapa candidato · pontos OpenStreetMap, ligações generalizadas; não é navegação GPS'), 'src/lib/commercial/map-points.json, fontes Nominatim por ponto, consulta 16/11/2026. © OpenStreetMap contributors, ODbL.'),
    slide('0,5% é uma premissa comercial', '<p class="formula">Brasileiros projetados × 0,005</p><p class="lead">Demanda potencial T4F no cenário escolhido</p><div class="two"><div><h3>Base de referência</h3><p>Oficina del Peregrino: filtrar Brasil, período e caminhos, quando o cruzamento estiver disponível.</p></div><div><h3>Limite da interpretação</h3><p>É uma meta de captura. Não comprova participação conquistada nem previsão validada.</p></div></div><p class="small">Série brasileira 2025/2026 ainda não importada. Não comparar ano completo com período parcial.</p>', 'https://oficinadelperegrino.com/estadisticas-2/ consultada em 16/11/2026; a página encaminha a Power BI. Não foi extraída série numérica verificável nesta sessão. Premissa de 0,5% fornecida pelo solicitante.'),
    slide('Dez capítulos de uma única solução', '<div class="two chapters"><div><p>01 · Visão geral</p><p>02 · Demanda e previsões</p><p>03 · Reservas e comercial</p><p>04 · Roteiros e destinos</p><p>05 · Hospedagens e capacidade</p></div><div><p>06 · Operações e alertas</p><p>07 · Experiência do cliente</p><p>08 · Financeiro</p><p>09 · Relatório executivo</p><p>10 · Sobre e metodologia</p></div></div><p class="takeaway">O catálogo e orçamento complementam a jornada comercial.</p>', 'Navegação real: src/components/layout.tsx. Arquitetura existente preservada. Catálogo adicional dos PRs #4/#5.'),
    slide('Ocupação e NPS orientam a leitura', '<p class="lead">Capacidade da operação e percepção dos viajantes aparecem primeiro.</p>' + screenshot('overview', 'Captura real da candidata · histórico sintético em BRL · não representa o desempenho real da agência') + '<p>Conversão e margem completam o contexto comercial e financeiro.</p>', 'Build local candidato, Overview.tsx; integra mudanças do PR #6. Filtros padrão do histórico, inclusive roteiros legados fora do novo catálogo comercial.'),
    slide('Ocupação: conferir capacidade comparável', '<p class="formula smaller">Vagas-noite comprometidas<br>÷ capacidade dos mesmos slots × 100</p>' + screenshot('capacity', 'Captura real: slots a partir de 01/11/2026, distintos do consolidado anterior') + '<p class="small">Comparar a mesma saída, data, etapa e categoria. Folga em outra data não compensa uma falta.</p>', 'docs/kpis.md, src/lib/analytics/metrics.ts. Slots sintéticos não comprovam disponibilidade de hotéis do catálogo documental.'),
    slide('NPS: qualidade com tamanho da amostra', '<div class="split"><div><p class="formula smaller">% promotores<br>− % detratores</p><p>Pontos de −100 a +100</p><p class="small">Promotores: 9–10<br>Neutros: 7–8<br>Detratores: 0–6</p><p>A amostra acompanha a interpretação.</p></div>' + screenshot('nps', 'Captura real · respostas sintéticas vinculadas a viagens concluídas') + '</div>', 'Satisfaction.tsx, métricas centrais e fixture independente de KPIs. Nenhuma pesquisa real foi fornecida.'),
    slide('Riscos por etapa, com evidência explícita', '<p class="lead">A sequência documentada permite localizar o ponto que exige conferência.</p>' + screenshot('stages', 'Astorga · captura real · todas as etapas com disponibilidade desconhecida') + '<p class="small">Verde &lt;75% · amarelo 75–85% · vermelho &gt;85%. Sem inventário comparável e verificado, o status permanece cinza. Demanda e eventos não substituem vagas confirmadas.</p>', 'PR #5: Cópia de ROT FRAAstorga 12E_0P_18D.pdf. availability.ts: política de verificação no dia, mesma data/roteiro/etapa/categoria. Sem disponibilidade ou eventos verificados nesta entrega.'),
    slide('Receita, custos e contribuição gerencial', '<div class="split"><div><p class="lead">O resultado fica visível junto de receita e custos.</p><p>Contribuição = receita − custos</p><p>Margem = contribuição ÷ receita × 100</p><p class="small">Hospedagem, transporte e guias/apoio. Cobertura incompleta de tributos e despesas fixas; não é lucro bruto apurado.</p></div>' + screenshot('finance', 'Captura real · mesmos meses e filtros · BRL sintético') + '</div>', 'PR #6, Finance.tsx e charts.tsx. Receita contratada não deve ser somada a recebimentos ou receita realizada.'),
    slide('Do roteiro ao or\u00e7amento preliminar', '<p class="lead">Partida, data, categoria, pessoas e ocupa\u00e7\u00e3o em uma jornada.</p>' + screenshot('quote', 'Recorte real do formul\u00e1rio: Sarria, Standard duplo, duas pessoas, in\u00edcio em maio/2027') + '<div class="quote-result">' + screenshot('quoteResult', 'Valores documentais em EUR; resultado aguarda custos completos, sem valores presumidos') + '</div><p class="small">Hist\u00f3rico BRL separado. Lisboa, Econ\u00f4mico e datas sem tarifa permanecem sem pre\u00e7o. Conferir os documentos originais antes de usar comercialmente.</p>', 'PR #4; docs/catalogo-comercial-01.md. Tarifas transcritas; original pendente de confer\u00eancia. Maio/junho/setembro/outubro de 2027. Capturas sem custos operacionais inventados.'),
    slide('Três categorias para a conversa comercial', '<div class="columns photos">' + [['economico', 'Econômico'], ['standard', 'Standard'], ['superior', 'Superior']].map(([id, name]) => `<figure><img src="${images[id]}" alt="Fotografia ilustrativa de hospedagem"/><h3>${name}</h3></figure>`).join('') + '</div><p class="lead">Fotografias ilustrativas, sem vínculo comercial com a Tour4Friends.</p><p class="small">As imagens não garantem serviços, preços ou disponibilidade. Categorias históricas não foram convertidas automaticamente.</p>', Object.entries(photoSources).map(([id, source]) => `${id}: ${source}`).join('\n') + '\nLicença Unsplash; Standard: Jenevy Vergara; Superior: Meklay YOTKHAMSAY.'),
    slide('Benefícios esperados para o negócio', '<div class="two"><div><h3>Decisão comercial</h3><p>Comparar roteiros e preparar cenários de demanda com premissas rastreáveis.</p><h3>Planejamento operacional</h3><p>Conferir capacidade e priorizar etapas que precisam de confirmação.</p></div><div><h3>Gestão financeira</h3><p>Acompanhar contribuição e margem dentro do mesmo cenário.</p><h3>Qualidade da experiência</h3><p>Relacionar NPS, amostra e roteiro para orientar melhorias.</p></div></div><p class="takeaway">Benefícios propostos; ganhos reais dependem de adoção e dados homologados.</p>', 'Inferências de valor a partir das funcionalidades implementadas; não são resultados empresariais medidos.'),
    slide('O que já pode ser demonstrado', '<div class="two"><div><h3>Implementado na candidata</h3><p>Dez dashboards, filtros, KPIs, gráfico financeiro, catálogo EUR, orçamento, mapa e cenário de captura.</p><p class="small">React/TypeScript/Recharts; laboratório FastAPI/PostgreSQL preservado. Produção não alterada.</p></div><div><h3>Próxima homologação</h3><p>Documentos originais, estatísticas brasileiras, inventário por etapa e equivalência comercial de categorias.</p><p class="small">Mapa geográfico usa ligações generalizadas; disponibilidade atual permanece desconhecida.</p></div></div><p class="takeaway">Decidir com contexto, antes de assumir receita ou capacidade.</p>', 'Diagnóstico e validação em docs/evolucao-professor-*.md. Candidato em PRs de revisão; referências locais ainda sem commit de hospedagens não integradas. Apresentação anterior de 16 páginas não estava disponível.'),
  ];
  const css = `*{box-sizing:border-box}body{margin:0;background:#dce3eb;font-family:Arial,sans-serif;color:#17253a}.slide{width:1280px;height:720px;position:relative;padding:58px 70px;background:#fafbf9;overflow:hidden;break-after:page;margin:24px auto}.slide h2{font-size:42px;line-height:1.12;margin:0 0 32px;font-weight:700;letter-spacing:-1.1px}.slide h3{font-size:26px;margin:0 0 15px;color:#46694f}.slide p{font-size:24px;line-height:1.42;margin:0 0 22px}.slide .lead{font-size:29px;line-height:1.35;margin-bottom:30px;max-width:1070px}.small,.slide p.small{font-size:18px;line-height:1.5;color:#536173}.columns{display:grid;grid-template-columns:repeat(3,1fr);gap:38px;margin-top:36px}.two{display:grid;grid-template-columns:1fr 1fr;gap:65px}.takeaway{position:absolute;left:70px;right:70px;bottom:64px;font-size:25px!important;color:#46694f;font-weight:700}.brand{font-size:25px!important;letter-spacing:5px;color:#a9bdab}.cover{background:#172e28;color:#fff}.cover h1{font-size:66px;line-height:1.08;letter-spacing:-2px;margin:70px 0 32px}.cover .lead{font-size:28px;color:#dbe5db}.cover p.small{color:#c6d2ca;position:absolute;bottom:45px}.formula{font-size:55px!important;line-height:1.14!important;color:#46694f;font-weight:700;letter-spacing:-1px;margin:40px 0 30px!important}.formula.smaller{font-size:36px!important;margin:10px 0 25px!important}.slide figure{margin:0}.screen{width:100%;max-height:440px;object-fit:contain;object-position:top left}.slide figcaption{font-size:15px;line-height:1.35;color:#536173;margin-top:12px}.split{display:grid;grid-template-columns:420px 1fr;gap:35px}.split .screen{max-height:450px}.split p{font-size:23px}.photos img{width:100%;height:270px;object-fit:cover}.photos h3{margin-top:20px}.quote-result{margin-top:24px;margin-bottom:20px}.quote-result .screen{max-height:110px}.chapters p{font-size:25px;margin-bottom:26px}aside{display:none}.folio{position:absolute;bottom:20px;right:38px;font-size:14px;color:#66768a}.cover .folio{color:#c6d2ca}@page{size:1280px 720px;margin:0}@media print{body{background:none}.slide{margin:0}}`;
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>T4F Performance · apresentação executiva</title><style>${css}</style><body>${slides.map((s, i) => s.replace('</section>', `<div class="folio">${i + 1} / ${slides.length}</div></section>`)).join('')}</body></html>`;
  const htmlPath = resolve(`${destination}/T4F-Performance-Apresentacao-Executiva.html`);
  await writeFile(htmlPath, html);
  await page.goto(pathToFileURL(htmlPath).href);
  const frames = page.locator('.slide');
  const overflow = await frames.evaluateAll((elements) => elements.map((element, index) => ({ slide: index + 1, overflow: element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth })).filter((item) => item.overflow));
  if (overflow.length) throw new Error(`Slide overflow: ${JSON.stringify(overflow)}`);
  for (let index = 0; index < slides.length; index++) await frames.nth(index).screenshot({ path: `${evidence}/slide-${String(index + 1).padStart(2, '0')}.png` });
  await page.pdf({ path: `${destination}/T4F-Performance-Apresentacao-Executiva.pdf`, printBackground: true, preferCSSPageSize: true });
  const narrative = slides.map((s, index) => `## Slide ${index + 1}\n\n${s.replace(/<aside>([\s\S]*?)<\/aside>/, '\n\nFonte e apoio: $1').replace(/<[^>]*>/g, ' ').replace(/data:image[^ ]+/g, '').replace(/ +/g, ' ')}\n`).join('\n');
  await writeFile(`${destination}/Notas-e-fontes.md`, narrative);
  await writeFile(`${evidence}/manifest.json`, JSON.stringify({ createdAt: new Date().toISOString(), slideCount: slides.length, source: 'Build local candidato, não site publicado', screenshots: Object.keys(images), overflow, pptx: 'Não gerado: runtime @oai/artifact-tool / load_workspace_dependencies indisponível nesta sessão.' }, null, 2));
  process.stdout.write(`Created ${slides.length} slides, editable HTML and PDF in ${destination}\n`);
} finally {
  await browser.close();
  preview.kill();
}
