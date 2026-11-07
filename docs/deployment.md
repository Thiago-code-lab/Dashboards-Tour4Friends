# Publicação no GitHub Pages

Repositório: `Thiago-code-lab/Dashboards-Tour4Friends`.
Destino: `https://thiago-code-lab.github.io/Dashboards-Tour4Friends/`.

1. Envie o código ao branch `main`.
2. Abra **Settings → Pages → Build and deployment** e selecione **Source: GitHub Actions**.
3. Confirme que Actions está permitido no repositório.
4. O workflow **Validate and deploy GitHub Pages** reproduz o JSON, valida dados, executa Vitest, TypeScript/build e testes de interface. PRs executam somente validação.
5. O job `deploy` publica o `dist/` pelo ambiente `github-pages`. Se o ambiente exigir revisão, um responsável precisa aprovar esse job.
6. Depois do sucesso, abra a URL e navegue para `/#/demanda`. Atualize a página. Verifique que JSON e assets retornam HTTP 200.

Sem acesso administrativo à configuração de Pages, o código e o workflow continuam prontos, mas a seleção de fonte deve ser feita pelo proprietário. Não confundir build local bem-sucedido ou workflow versionado com deployment confirmado.

## Diagnóstico

| Sintoma                          | Conferir                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Página branca / assets 404       | `base` exato com maiúsculas e barras em `vite.config.ts`; publicar `dist/`, não `src/`                             |
| JSON 404                         | `import.meta.env.BASE_URL + data/demo.json`; JSON precisa estar no artefato                                        |
| 404 ao atualizar dashboard       | URL deve usar `/#/...`, preservando HashRouter                                                                     |
| Configure Pages falha            | Source GitHub Actions ativado em Settings → Pages; Pages permitido pela conta                                      |
| Deploy aguardando                | Revisão do ambiente `github-pages` ou execução anterior em andamento                                               |
| Teste de reprodutibilidade falha | Reexecute o gerador com seed 42 e versione o JSON correspondente                                                   |
| E2E sem browser                  | `npx playwright install --with-deps chromium` e `CI=true`; localmente instalar Chrome ou ajustar o canal no config |

As instruções seguem a [publicação estática do Vite](https://vite.dev/guide/static-deploy) e a [configuração de Pages do GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
