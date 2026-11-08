# Publicação futura · executar somente após autorização

Repositório: `Thiago-code-lab/Dashboards-Tour4Friends`. URL preservada: <https://thiago-code-lab.github.io/Dashboards-Tour4Friends/>. Na entrega 04, `main` continua em `5ea96ab`, versão demonstrativa da Etapa 01. A candidata completa está em `feature/final-quality-and-delivery-v1`. Nenhum passo de integração abaixo foi executado automaticamente.

## Cadeia e ordem segura

```text
main
└── feature/backend-postgresql-v1                  PR #1 → main
    └── feature/advanced-analytics-v1               PR #2 → backend
        └── feature/final-quality-and-delivery-v1   PR de QA → Analytics
```

Antes de cada merge, obter aprovação específica e confirmar base, HEAD, CI e diff. A aprovação de um PR não autoriza os demais. Evitar publicação parcial: após aprovação das etapas, integrar primeiro QA em Analytics, depois Analytics no backend, e só então a versão consolidada em `main`. Cada atualização deve repetir a CI. Preservar a ancestralidade da cadeia; não fazer force push ou apagar histórico para ajustar PRs.

**Atenção ao efeito concreto:** o workflow publica após push/merge em `main` e validações aprovadas. Portanto o último merge é também autorização de publicação; não o executar como simples “organização de branches”. PRs e suas validações não publicam.

## Contrato de deployment

O upload do artefato Pages e o job `deploy` exigem exatamente `github.event_name == 'push' && github.ref == 'refs/heads/main'`. O deploy depende dos jobs `build` e `backend` aprovados. Execuções manuais em qualquer branch, inclusive `main`, apenas validam; push em branches de trabalho não aciona este workflow. O teste `tests/workflow-contract.test.ts` lê o YAML real e verifica os cinco cenários, dependências e permissões. Executar com `npm test`.

O artefato comum `release-candidate-static` guarda `dist/` e seu manifesto por 14 dias, sem usar o mecanismo de deployment do Pages. Evidências analíticas e PDF têm retenção de sete dias. Copiar o PDF e o manifesto do workspace para armazenamento durável antes da submissão; esses arquivos locais não são downloads públicos.

## Checklist antes de publicar

- Registrar SHA da `main` e do último deployment saudável. Comparar o conteúdo da candidata com o que foi revisado.
- Confirmar que os três PRs contêm todas as alterações esperadas e nenhuma alteração em repositórios históricos.
- CI aprovada: testes, migrações PostgreSQL descartáveis, perfis, persistência, paridade, build, acessibilidade, responsividade e artefatos.
- Reproduzir o JSON; diferença em `public/data/demo.json` ou seed deve ser zero.
- Build com `VITE_DATA_MODE=demo`, `VITE_API_BASE_URL=''`, `base=/Dashboards-Tour4Friends/` e HashRouter. Localmente: `npm run build:demo`.
- Conferir `dist/index.html`, JS/CSS e `dist/data/demo.json`; executar verificador de credenciais e abrir preview. Nenhuma API externa é necessária à demonstração.
- Conferir PDF final, imagens, integrantes, links, limitações e identificação da revisão. Guardar a versão revisada.
- Confirmar Settings → Pages → Source: GitHub Actions e permissões do ambiente `github-pages`. Qualquer bloqueio administrativo deve ser resolvido pelo proprietário, sem simular deployment.

## Depois da publicação autorizada

1. Confirmar sucesso do job `deploy` e URL registrada no ambiente.
2. Conferir HTTP 200 do HTML, assets e JSON. Navegar nos dez módulos e recarregar `/#/demanda` sem 404.
3. Confirmar fonte demo e ausência de chamadas obrigatórias à API; limpar preferências de apresentação ao conferir o cenário padrão.
4. Exercitar filtro, CSV, cenário e impressão; conferir console e celular.
5. Registrar SHA, execução da CI, horário e evidências do deployment efetivamente observado. Build local e workflow versionado não comprovam publicação.

## Rollback

Se a validação pós-publicação falhar, preparar PR que reverta o merge de release aprovado, preservando histórico. Validar a CI e obter autorização para publicar a reversão pelo mesmo workflow. Usar o SHA saudável registrado, sem reset/force push. Não apagar volumes PostgreSQL ou desfazer migrações de bases operacionais como parte de rollback do site estático.

## API e banco

A API permanece de laboratório, com dados sintéticos. Publicá-la exige infraestrutura e aprovação separadas, HTTPS, CORS explícito, credenciais próprias, migrações controladas, backup/recuperação e homologação. Não criar recursos faturáveis nem usuários padrão. Só configurar o frontend público para API depois de uma integração externa homologada; até lá, manter demo independente.

## Diagnóstico

| Sintoma                     | Conferir                                                                   |
| --------------------------- | -------------------------------------------------------------------------- |
| Página branca ou assets 404 | Prefixo `base`, publicação de `dist/` e nomes com maiúsculas corretas.     |
| JSON 404                    | `BASE_URL + data/demo.json` e presença do JSON no artefato.                |
| 404 ao recarregar um módulo | Uso de `/#/...` pelo HashRouter.                                           |
| Pages aguardando            | Aprovação do ambiente ou execução anterior; conferir status real.          |
| Reprodutibilidade falha     | Comparar gerador e seed; não alterar expectativas para mascarar mudança.   |
| E2E sem navegador           | Instalar Chromium na CI; Chrome local conforme configuração do Playwright. |

Referências: [Vite, publicação estática](https://vite.dev/guide/static-deploy) e [GitHub Pages com Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
