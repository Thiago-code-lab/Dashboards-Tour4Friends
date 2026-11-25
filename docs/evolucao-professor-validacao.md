# Validação incremental · feedback do professor

## Incremento 1 · indicadores, financeiro e filtros

Preservados: dez dashboards, base sintética, categorias/IDs históricos, fórmulas,
catálogo EUR e quatro roteiros de #4/#5, arquitetura React/Recharts e FastAPI/PostgreSQL.
Reaproveitado integralmente o trabalho do #6 por ancestralidade na branch isolada.

Alterações: `Overview.tsx` mostra ocupação e denominador em vagas-noite e NPS
em pontos; `Finance.tsx` e `charts.tsx` explicam contribuição e cobertura dos
custos. `layout.tsx`, `route-scope.ts`, contratos/preferências, analytics e série
de previsão compartilham caminho, roteiro e modalidade. API e alertas Python
aceitam o mesmo caminho opcional. Nenhum schema de banco ou dado foi migrado.

Verificações executadas em 16/11/2026:

- 161 Vitest aprovados; novos testes reconciliam receitas, slots e série de
  previsão por caminho e verificam dependências/combinações inválidas.
- Build demo (inclui TypeScript) aprovado; avisos do Rollup sobre comentários
  em Zod, sem falha de build.
- `data:validate` aprovado; JSON histórico preservado.
- Ruff aprovado; 27 Pytest aprovados em PostgreSQL 18 descartável na porta
  55449. Paridade estendida a Francês, Português/bicicleta e combinação vazia.
- Oito testes de navegador conectados aprovados. Cluster temporário encerrado;
  `.env` e banco existentes preservados. Logs em `artifacts/feedback-professor`.
- Suíte Playwright completa: 31 aprovados, uma dispensa móvel preexistente,
  zero falhas; dez módulos, desktop/celular, acessibilidade e bloqueio de API.
  O caso de filtro foi atualizado para o comportamento requerido: trocar para
  bicicleta limpa o roteiro incompatível e oferece somente roteiros válidos.

Auditoria pública atual: HTTP 200, quatro KPIs anteriores (reservas, atendidos,
receita realizada, NPS) e nenhum link Catálogo. Confirma a ausência de #4/#5/#6
na navegação publicada; não confundir o candidato local com produção.
Evidências: `artifacts/professor/published-audit.json` e captura pública.

Pendências externas: equivalência de tiers históricos/comerciais; conferir
documentos originais; recortes oficiais brasileiros; disponibilidade real.
As alterações locais de hospedagens da branch original continuam intactas.
