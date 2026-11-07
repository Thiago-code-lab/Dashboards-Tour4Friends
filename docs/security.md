# Segurança e privacidade

- Dados novos inteiramente sintéticos. Sem e-mails, telefones, passaportes, informações médicas ou nomes de clientes reais.
- Repositórios de referência consultados somente para documentação/código; nenhuma base operacional copiada e nenhuma alteração nesses repositórios.
- Nenhum segredo, token ou credencial no frontend. Nenhuma autenticação simulada.
- JSON validado por Zod e integridade relacional antes de uso. Erros visíveis; carregamento cancelável.
- React escapa textos. Não há `dangerouslySetInnerHTML`, execução de campos importados, `eval` nem callbacks remotos de IA.
- CSV máximo de 1 MB/500 linhas, colunas exatas, tipos e FKs validados, commit atômico em memória. O arquivo não é enviado nem guardado em servidor.
- Exportações prefixam textos iniciados por caracteres de fórmula (`=`, `+`, `-`, `@`, tab e retorno) para prevenir execução em planilhas.
- `localStorage` contém somente filtros, limites e estados de alertas. Leitura inválida volta aos defaults; bloqueio de escrita é explicado na UI e mantém o trabalho em memória.
- Links externos usam `rel=noreferrer`. Sem fontes, imagens, tracking ou scripts de CDN obrigatórios em tempo de execução.
- GitHub Actions usa permissões mínimas; `pages:write` e `id-token:write` apenas no job de deployment. PRs validam, mas não publicam.
- Publicação estática é adequada apenas a dados públicos demonstrativos. Uma integração real exigirá autenticação, autorização, minimização de dados, política de retenção e trilha de auditoria.
