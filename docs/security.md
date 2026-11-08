# Segurança e privacidade

- Dados novos inteiramente sintéticos. Sem e-mails, telefones, passaportes, informações médicas ou nomes de clientes reais.
- Repositórios de referência consultados somente para documentação/código; nenhuma base operacional copiada e nenhuma alteração nesses repositórios.
- Nenhum segredo embutido no frontend. O laboratório recebe um token opaco apenas após login real; ele fica em memória, nunca em local/session storage. Senhas usam Argon2id; no banco só o hash SHA-256 do token, prazo e revogação são armazenados.
- JSON validado por Zod e integridade relacional antes de uso. Erros visíveis; carregamento cancelável.
- React escapa textos. Não há `dangerouslySetInnerHTML`, execução de campos importados, `eval` nem callbacks remotos de IA.
- CSV máximo de 1 MB/500 linhas, colunas exatas, tipos/FKs validados. Demonstração: commit local em memória, sem envio. Laboratório: upload somente à API configurada, admin obrigatório, validação seguida de commit atômico, hash normalizado, token de lote com expiração e controle de versões. O lote normalizado fica no banco administrativo para rastreabilidade; retenção automática é pendência.
- Exportações prefixam textos iniciados por caracteres de fórmula (`=`, `+`, `-`, `@`, tab e retorno) para prevenir execução em planilhas.
- `localStorage` contém somente filtros, limites e revisões da demonstração. `sessionStorage` guarda só a escolha pública de modo. Revisões conectadas ficam em `alert_statuses`, com usuário, nota, data e versão. Entrar novamente é obrigatório após recarregar.
- Links externos usam `rel=noreferrer`. Sem fontes, imagens, tracking ou scripts de CDN obrigatórios em tempo de execução.
- GitHub Actions usa permissões mínimas; `pages:write` e `id-token:write` apenas no job de deployment. Upload Pages e deploy exigem evento `push` em `refs/heads/main`; deploy aguarda `build` e `backend`. PRs e execuções manuais, inclusive na `main`, apenas validam. O contrato é verificado automaticamente a partir do YAML real.
- Publicação estática contém somente dados sintéticos. O backend também deve permanecer sintético até homologação, política de retenção e revisão de proteção de dados. Não há dumps, usuários de aplicação ou senhas padrão versionados. `.env` é ignorado; a configuração local gera senha aleatória sem imprimi-la.

## Controles implementados no servidor

- Autorização a cada requisição: admin/gestor escrevem operação; admin cria/desativa usuários, importa e lê auditoria global; analista/visualizador apenas consultam.
- Sessão expira em 60 minutos por padrão; logout revoga no banco. Desativação e alteração de perfil revogam sessões. Último administrador ativo não pode ser removido.
- Login usa mensagem genérica para usuário ausente, senha incorreta ou usuário inativo, com verificação Argon2 de custo equivalente. Cinco falhas em dez minutos por identidade/IP bloqueiam novas tentativas; contagem persiste em auditoria e é serializada por IP no banco. Identidade e endereço são hashes, não texto em logs.
- CORS com origens explícitas, sem `*` e sem cookies. Bearer evita depender de cookies de terceiros; CSRF não usa uma credencial ambiente de cookie. TLS é obrigatório fora de localhost no cliente.
- ORM/SQL parametrizados; `sort` segue allowlist. Limites de paginação, payload de aproximadamente 1,1 MB, upload de 1 MB e taxa de 180 requisições/minuto por processo. Endereços encaminhados não são confiados arbitrariamente.
- Erros SQL não são devolvidos. HTTP 401/403/409/422/500 são diferenciados; indisponibilidade do banco usa 503. Logs estruturados registram request ID, método, caminho, status e latência, sem querystring, corpo, token, senha ou string SQL.
- PKs/FKs/checks, índice parcial de viajante ativo, transações, leitura consistente e concorrência otimista evitam corrupção e atualização perdida. Auditoria participa da mesma transação do negócio.

## Ameaças e limites restantes

XSS ainda poderia comprometer um token em memória: não há HTML bruto nem scripts externos, mas CSP no proxy e revisão de dependências devem acompanhar uma hospedagem real. O rate limit geral é por processo, não um limite distribuído; login é persistente. Não há MFA, recuperação/troca de senha pela UI, detecção de fraude, retenção/expurgo automáticos, backup restaurado em produção ou segregação de papel SQL de migração/runtime no laboratório. A API deve usar HTTPS e proxy confiável antes de acesso público.
