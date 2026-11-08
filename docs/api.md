# Contratos HTTP do laboratório

Prefixo `/api/v1`, JSON com nomes `camelCase`, autenticação `Authorization: Bearer` com token recebido do login. A documentação executável fica em `/docs` e `/openapi.json`. Nenhum token deve ser colado em arquivos versionados.

Login recebe `email/password`, retorna `accessToken`, `tokenType=bearer`, `expiresAt` e usuário público. `/auth/me` retorna perfil atual; `/auth/logout` revoga e retorna 204. Usuários inativos e sessões expiradas são recusados.

`GET /dataset` retorna exatamente o formato `Dataset` existente. `/dataset/metadata` inclui origem PostgreSQL, metadados sintéticos e contagens. Os cinco endpoints analíticos são `/analytics/overview`, `/demand`, `/capacity`, `/satisfaction` e `/financial`, com parâmetros `start`, `end`, `route_id`, `modality`, `category`. Todos exigem autenticação.

Listas de reservas, saídas, slots e custos são paginadas: `items/total/page/pageSize`; `page_size` máximo 100. Busca `q` por ID é literal, parâmetros SQL são vinculados e ordenação usa allowlist. A UI mantém sua busca analítica sobre o snapshot inteiro.

## Exemplo de concorrência otimista

1. `GET /bookings/T4F-0001` retorna o registro e `version`.
2. `PATCH /bookings/T4F-0001` com `{"expectedVersion":1,"formComplete":true}` usa a versão realmente consultada, não uma constante da aplicação.
3. Uma gravação concorrente com a mesma versão retorna 409. Reabra/recarregue o registro e revise os valores antes de tentar novamente.

POSTs recebem as entidades completas no contrato do dataset; PATCHs aceitam apenas campos operacionais declarados e `expectedVersion`. Vínculos de reservas existentes não podem ser reatribuídos silenciosamente pelo CSV. Não existe DELETE de reservas. Histórico: `GET /bookings/{id}/history`.

Alertas são calculados a cada consulta. `PATCH /alerts/{id}/status` recebe `expectedVersion` (zero se ainda não revisado), `status` e `note`. A resposta e a próxima consulta preservam responsável, data, versão e condição operacional. `normalizedIds` refere-se à base completa, não à ausência no filtro local.

Importação administrativa: envie arquivo multipart em `/imports/bookings/validate`; receba `batchId`, `validationToken`, validade de 15 minutos e número de linhas. Revise e confirme com `/imports/bookings/commit`. Hash e versões impedem reaplicação e commit de validação obsoleta. O token do lote nunca aparece na auditoria.

Administração: `/admin/users` GET/POST, `/admin/users/{id}` PATCH com versão e `active/role`; `/admin/audit` GET paginado com `entity_type/entity_id`; `/imports` lista os lotes sem expor token de validação.

| HTTP        | Significado                                                              |
| ----------- | ------------------------------------------------------------------------ |
| 200/201/204 | Consulta/alteração, criação, logout concluídos                           |
| 401         | Sessão ausente, inválida, expirada ou revogada                           |
| 403         | Perfil não autorizado                                                    |
| 404         | Recurso ou lote inexistente/inacessível                                  |
| 409         | Concorrência, integridade, lote repetido ou regra operacional impeditiva |
| 413         | Payload/arquivo excessivo                                                |
| 422         | Contrato, valores, relações ou datas inválidos                           |
| 429         | Limite de requisições/tentativas                                         |
| 500         | Falha interna controlada, sem detalhes SQL                               |
| 503         | Banco/base temporariamente indisponível ou não inicializada              |

Erros carregam uma mensagem clara e, nas falhas internas/de banco, request ID. Sessões e consultas autenticadas usam `Cache-Control: no-store`. O processo responde em `/health`; dependências em `/ready`.
