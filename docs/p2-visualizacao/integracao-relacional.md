# Evidências reproduzíveis do laboratório relacional

O Pages serve arquivos estáticos. **Não utiliza PostgreSQL remoto.** O laboratório local existente usa React → cliente autenticado → FastAPI → SQLAlchemy assíncrono/psycopg → PostgreSQL. Migração Alembic cria tabelas com vínculos; seed importa a mesma base sintética; perfis restringem escrita.

## Execução desta entrega

`python scripts/verify-p2-lab.py --pg-bin "C:/Program Files/PostgreSQL/18/bin"`

Pré-requisitos: dependências de `backend/requirements.txt`, Node/npm instalados com `npm ci`, Chrome local (ou `CI=true` e Chromium Playwright instalado), PostgreSQL binários disponíveis. Em Linux, fornecer o diretório de binários ao mesmo parâmetro. Porta padrão 55439 deve estar livre; pode ser alterada por `--port`. Serviços conectados de teste usam 8001/4174.

Utilize o mesmo ambiente Python na instalação e na execução. No PowerShell, uma opção isolada é:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
.venv/Scripts/python.exe scripts/verify-p2-lab.py --pg-bin "C:/Program Files/PostgreSQL/18/bin"
```

O resultado atual fica em `artifacts/p2-lab/results.json`. Exija `status: passed`, todas as suítes `passed` e `stopped: true`; um log antigo isolado não comprova uma nova execução. O runner invalida sucesso anterior antes da verificação das dependências e registra falhas. Cinco regressões sem banco podem ser executadas com `python -m unittest discover -s scripts/tests -p "test_*.py"`.

O runner cria diretório temporário novo com senha aleatória, autenticação SCRAM, banco `t4f_p2_test` e escuta em 127.0.0.1. Não altera `.env`, usuários ou banco existentes. Cluster é encerrado no `finally`; dados do cluster ficam na pasta temporária para inspeção local, sem credenciais no repositório. Tokens e usuários E2E são descartáveis. Não há serviços pagos ou API pública.

Resultado repetido em 24 e 25/11/2026: **27 Pytest**, **8 testes conectados Playwright**, Ruff aprovado. Os testes aplicaram migrações e seed reais. Cluster encerrado. Resumos e logs sanitizados da execução de 25/11 em [evidências](evidencias/laboratorio.json), [Pytest](evidencias/laboratorio-pytest.txt) e [navegador](evidencias/laboratorio-conectado.txt). A [revalidação](revalidacao.md) registra a falha inicial de dependência e sua resolução.

## O que foi comprovado

| Capacidade             | Procedimento existente                                                      | Evidência                                                                |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Leitura e vínculos     | Migração/seed, `GET /dataset`, snapshot validado e paridade de KPIs         | `backend/tests/test_integration.py`, `test_reference_kpis.py`            |
| Filtros                | Comparação Python/TypeScript, caminho/roteiro/modalidade/categoria          | `test_reference_kpis.py` e `tests/route-scope.test.ts`                   |
| Escrita                | Autenticação, alteração de reserva/capacidade/custos, controle de versão    | `test_operations.py`, `test_concurrency.py`, teste conectado de gravação |
| Atualização            | Após escrita, snapshot e indicadores refletem a alteração                   | `tests/connected/api.spec.ts` primeiro teste                             |
| Persistência           | Nova sessão lê alteração; revisão de alerta sobrevive a nova sessão         | Primeiro e quarto testes conectados                                      |
| Segurança e erros      | Perfis, 401, falha de serviço, dados inválidos e conflito sem fallback demo | Suítes API/operações/conectada                                           |
| Importação e auditoria | Lote validado, transação e eventos                                          | `test_operations.py`, teste conectado de administração                   |

Filtragem no frontend ocorre sobre snapshot carregado e validado; os filtros não devem ser descritos como SQL por painel. O backend também expõe análises com filtros e testes de paridade. Não há dez consultas duplicadas por rota; o contexto compartilha a análise memoizada.

## Limites

Testes comprovam comportamentos específicos no ambiente local descartável, não disponibilidade cloud, desempenho sob carga, conformidade contábil ou aprovação empresarial. Integração não exige publicar API. Alterações desta P2 no laboratório estatístico são frontend; backend e schema foram preservados.
