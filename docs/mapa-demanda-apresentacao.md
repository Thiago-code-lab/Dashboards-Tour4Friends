# Mapa, demanda brasileira e apresentação executiva

Incremento encadeado ao [PR #7](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/7).
Nenhuma integração na main ou publicação foi executada.

## O que existe nesta branch

- **Mapa:** no catálogo, seleção das sete partidas e pontos geocodificados
  via Nominatim/OpenStreetMap em 16/11/2026. JSON versionado com consulta,
  identificador OSM e coordenadas; sem API ou tiles obrigatórios no navegador.
  Linhas generalizadas entre cidades de referência, explicitamente distintas
  de trajetos GPS e de uma lista completa de etapas. A projeção é esquemática;
  não usar para navegação ou distâncias. Porto Central/Costa têm a mesma
  partida geográfica e sequências documentais diferentes.
- **Etapas:** reutiliza exclusivamente as quatro sequências do #5, sem
  importar automaticamente o trabalho local de hospedagens. Outros percursos
  mostram ausência de sequência nesta branch. Não representa ausência dos
  documentos no acervo da empresa.
- **Disponibilidade:** todos os status atuais são cinza/desconhecido. O motor
  de classificação testado exige escopo idêntico, capacidade positiva,
  comprometimento não negativo, fonte e verificação no dia da consulta.
  Política: <75% favorável, 75–85% atenção, >85% elevado; falta de evidência
  prevalece sobre qualquer cor. Não há probabilidade estatística implícita.
  Não existe feed de inventário, eventos ou demanda por etapa homologado;
  essas integrações permanecem pendentes, sem cores inferidas.
- **Demanda:** formulário separado em Demanda e previsões. Entrada manual
  brasileira, período, recorte dos caminhos e fonte/método obrigatórios;
  resultado fracionário = entrada × 0,005. Nenhum valor pré-preenchido,
  scraping de dados individuais ou uso da carteira BRL como público oficial.
  O formulário é um cenário, não uma ingestão/validação de estatística oficial.
- **Categorias:** galeria Econômico/Standard/Superior com fotos locais
  ilustrativas, carregadas sob demanda. Não comprova categoria de hotel,
  serviço, parceria, preço ou vaga. Orçamento/documentação de #4 continuam.

## Fotografias e atribuição

Fotografias obtidas de páginas identificadas como gratuitas sob a licença
[Unsplash](https://unsplash.com/license), consultadas em 16/11/2026:

| Uso ilustrativo | Página de origem |
| --- | --- |
| Econômico | https://unsplash.com/photos/ig3TQMJElAw |
| Standard · Jenevy Vergara | https://unsplash.com/photos/8hGJaAJyzIg |
| Superior · Meklay YOTKHAMSAY | https://unsplash.com/photos/mNdhu5gl_P4 |

O enquadramento é ilustrativo; não é classificação hoteleira da Tour4Friends.
`source-accommodation-images.mjs` permite recuperar as fontes e `source-map-points.mjs`
registra geocodificação com intervalo conservador entre consultas. Nenhum
desses scripts roda na navegação ou requer serviço pago.

## Apresentação

15 slides: problema, público, mapa, mercado/premissa, dez capítulos, visão
geral, ocupação, NPS, etapas, contribuição, orçamento, tiers e benefícios.
Capturas reais do **build local candidato**, nunca anunciadas como telas já
publicadas. Valores sintéticos e comerciais têm legendas distintas; resultados
empresariais não medidos aparecem como benefícios esperados.

Reprodução: `npm run build:demo` e `npm run presentation:executive`.
Chrome local é necessário para capturas/print. Saída em
`output/apresentacao-professor`: HTML autocontido editável, PDF de 15 páginas
e notas/fontes Markdown. Imagens e capturas estão incorporadas ao HTML;
nenhuma rede é necessária para ler a apresentação exportada.

Os textos do HTML são editáveis no arquivo e na fonte do gerador; não se trata
de um editor visual com persistência. As fontes por slide estão em notas
ocultas no HTML e no Markdown. Evidências da geração/inspeção ficam em
`artifacts/professor/slides` e renderizações do PDF em `pdf-render`.

**PPTX não gerado:** não há sessão documental conectada, ferramenta
`load_workspace_dependencies`, nem pacote `@oai/artifact-tool` disponível.
A skill de apresentações exige esse runtime e proíbe substituição por
python-pptx; não foi anunciado um arquivo editável de PowerPoint inexistente.
A apresentação anterior de 16 páginas também permanece ausente; esta é uma
nova narrativa executiva baseada na aplicação auditada, sem presumir o PDF.

## Validação efetivamente executada

- 182 Vitest aprovados: acrescenta validação de cenário e dos limiares,
  origem, validade e escopo do semáforo.
- Build demo/TypeScript aprovados; sem alterações no JSON histórico ou lockfile.
- 37 Playwright aprovados e uma dispensa móvel preexistente. Os seis novos
  cenários de navegador cobrem caminho/NPS/denominador/contribuição, mapa,
  etapas desconhecidas, fotos, acessibilidade e cenário brasileiro em
  desktop/celular. Suíte completa continua cobrindo dez dashboards e API bloqueada.
- Uma execução inicial do teste novo de fotos falhou por conferir a imagem
  antes de terminar o lazy loading. A espera foi corrigida para observar
  `complete/naturalWidth`; a suíte final passou sem desabilitar lazy loading.
- O primeiro render de slides detectou overflow no slide de etapas; foi
  corrigido com recorte real da primeira linha e nova geração. Todos os 15
  slides foram inspecionados; formulário e gráfico NPS tiveram recortes
  melhorados. PDF: 15 páginas, texto extraível e renderização conferida.
- Backend não mudou neste incremento. A validação do #7 permanece: 27 Pytest,
  oito conectados, PostgreSQL temporário encerrado e Ruff aprovado.

## Pendências que limitam a entrega

Série oficial brasileira 2025/2026 com período/filtros, documento comercial
original 2027 e planilhas originais, apresentação anterior, disponibilidade e
eventos por etapa, trajetos completos georreferenciados, equivalência de tiers
validada pela empresa e integração revisada do WIP local de hospedagens.
O mapa e o cenário estão funcionais dentro desses limites; não são uma
consulta de vagas em tempo real nem previsão oficial de demanda.
