# Manual de operação do ambiente sintético

1. Inicie PostgreSQL/API conforme o README do backend; crie admin pelo comando local seguro. Nunca use dados reais neste laboratório.
2. Configure `VITE_API_BASE_URL`, execute Vite e escolha **Entrar no laboratório**. Confira o identificador de fonte; na demonstração não há gravação no servidor.
3. Autentique com o perfil provisionado. Depois de recarregar, entre novamente. **Sair** revoga a sessão; voltar à demonstração é uma escolha explícita.
4. Em Reservas, Hospedagens, Financeiro ou Roteiros, admin/gestor vê **Gerenciar**. Abra o registro e confira sua versão. Formulários são modais; os dashboards não foram substituídos.
5. Em reservas, crie com titular/lead/saída existentes, valor total e categoria. Nova reserva tem o titular como participante inicial; a API também suporta múltiplos participantes. Alterar status sincroniza o lead. Para confirmar, resolva falta física de capacidade e ficha exigível. Cancelar uma saída futura não apaga o registro nem recebimentos anteriores.
6. Em hospedagens, ajuste capacidade/contratação por slot; não compense datas distintas. Em Roteiros, gerencie saídas e transferência. Datas incompatíveis com custos/slots são recusadas. Em Financeiro, atualize custo, orçamento, tipo e status coerente com a data do cenário.
7. Salve no PostgreSQL. Aguarde a confirmação e os indicadores recalculados. Falha não aplica valores otimistas. Em conflito 409, reabra o registro e revise antes de salvar.
8. Em Operações, **Revisar alerta** permite aberto/revisado/resolvido e observação. Responsável e data ficam persistidos. Uma condição ainda ativa permanece visível como resolvida administrativamente; revisão não substitui contratação ou ficha.
9. Admin usa **Usuários e auditoria** na barra de conexão para criar/desativar contas e ler eventos paginados. Gestor pode consultar histórico de uma reserva no seu editor; analista/visualizador não escrevem.
10. CSV: baixe o modelo técnico. No conectado, somente admin importa. Primeiro valide; confira a quantidade e confirme a transação. Arquivo inválido ou lote alterado não modifica registros. Na demonstração, a importação segue local, sem envio.
11. Os mesmos filtros, relatórios e motor Ridge usam o snapshot atualizado. Outros usuários veem as mudanças ao atualizar ou pela sincronização de até 30 segundos/retorno à janela.

O corte sintético continua em novembro de 2026. A data de contratação deve respeitar a referência, e a confirmação histórica é preservada no cancelamento. A aplicação não simula notificações, estornos, disponibilidade comercial atual ou integração com dados operacionais.
