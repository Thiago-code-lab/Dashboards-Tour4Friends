# P2 - Visualização de Dados - T4F Performance

Entrega em branch própria para revisão, baseada em #8, sem merge ou deployment. Dados sintéticos. Avaliação do parceiro pendente. O `P2_VD2026.docx` não foi localizado; este pacote segue o texto solicitado e precisa de conferência literal do documento oficial.

## Entregáveis

- [Auditoria e estado dos PRs](auditoria.md)
- [Planejamento, KPIs e storytelling](planejamento.md)
- [Técnicas, wireframe e capturas](tecnicas-de-visualizacao.md)
- [Análises e insights: sete achados com recorte e limitações](analises-e-insights.md)
- [Manual ilustrado](manual-do-usuario.md)
- [Integração relacional comprovada localmente](integracao-relacional.md)
- [Instrumento de validação do parceiro, ainda pendente](validacao-parceiro.md)
- [Matriz de requisitos e resultados](checklist-entrega.md)
- [Relatório final em PDF](P2_Visualizacao_de_Dados_T4F_Performance.pdf)

## Reproduzir dados, capturas e relatório

Não regenerar o dataset para melhorar os resultados. O script de métricas apenas lê o JSON versionado.

```bash
npm ci
npm run p2:data
npm run build:demo
npm run preview -- --port 4177
```

Com o preview ativo, em outro terminal:

```bash
npm run p2:captures
python -m pip install -r scripts/requirements-delivery.txt
npm run p2:report
```

Chrome local é usado nas capturas. Em CI/Linux, usar `CI=true` e instalar Chromium por `npx playwright install --with-deps chromium`. `P2_BASE_URL` altera a URL de captura. O script salva onze capturas locais, wireframe e consulta pública separada. O PDF final fica em `output/pdf` e é copiado para esta pasta para revisão no PR. A geração exige 12 páginas com texto extraível; renderize e confira o layout antes de atualizar a entrega. A CI gera artefatos P2; não publica a branch.

As métricas e imagens são reproduzíveis, mas o resumo de testes em `evidencias/verificacao.json` é um registro da execução local de 23/11/2026; não é substituído automaticamente por um comando de geração de PDF. Para registrar outra execução, execute as suítes e atualize a matriz com os resultados reais. O feedback nunca é gerado.

Para o laboratório: [procedimento e evidências](integracao-relacional.md). Para detalhes técnicos originais, consulte [arquitetura](../architecture.md), [KPIs](../kpis.md), [validação de modelos](../model-validation.md) e [backend](../../backend/README.md).
