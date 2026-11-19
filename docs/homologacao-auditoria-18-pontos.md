# FinControl — Roteiro de homologação da auditoria (18 pontos)

**Branch:** `feature/auditoria-correcoes-completas` (PR #9).

## Atenção antes dos testes

1. **Não teste exclusão/restauração com seu banco financeiro real.** Feche o Electron e copie o arquivo `fincontrol.db` para um local seguro. Monte outra base com dados fictícios.
2. Rode:
   ```powershell
   npm.cmd run typecheck
   npm.cmd run lint
   npm.cmd test
   npm.cmd run build
   npm.cmd run dev
   ```
3. A CI GitHub Actions executa os mesmos testes (menos o instalador e os testes interativos no Windows). O resultado do Electron no Windows ainda deve ser homologado.
4. Registre os resultados e prints dos erros antes de mesclar a PR na master.

## Testes por problema da auditoria

| ID | Cenário | Resultado esperado |
|---|---|---|
| 01 | Conta R$ 100 + receita de R$ 500 com data futura | Saldo permanece R$ 100 até a data; relatório Realizado não inclui a receita antecipadamente |
| 02 | Transferir R$ 20 com data futura | Sistema recusa e não altera contas; registro legado futuro só impacta na data |
| 03 | Pagar parcela/fatura com data futura | Sistema recusa; pagamento legado futuro não é tratado como recebido antecipadamente |
| 04 | Excluir conta sem vínculos e saldo inicial R$ 300 | Sistema recusa. Conta com zero e sem vínculos pode ser excluída |
| 05 | Filtrar fevereiro de 2027 em Relatórios | Gráficos usam o mesmo mês/ano dos indicadores |
| 06 | Cartão com apenas parcelas em 2027 | Ano de 2027 aparece no seletor de anos |
| 07 | Despesa na categoria personalizada `Pets` | Valor aparece no total e no gráfico por categoria |
| 08 | Programar salário mensal desde 6 meses atrás | Mostra confirmação explícita de entradas retroativas; recusar deixa tudo igual |
| 09 | Deixar o aplicativo aberto na mudança do dia do salário | Recebimento é gerado uma vez pelo processo principal e aparece na interface |
| 10 | Cadastrar manualmente salário idêntico já gerado no mesmo mês/conta | Sistema alerta e evita duplicidade; salário manual existente antes da recorrência é vinculado quando compatível |
| 11 | Forçar exceção de renderização em ambiente de testes | Exibe tela de recuperação, não janela branca |
| 12 | Fatura com uma parcela individual paga e fechamento ainda aberto | Permite lançar outra compra legítima. Fatura integral quitada continua bloqueada |
| 13 | Estornar parcela ou fatura com motivo | Saldo da conta é recomposto, limite é consumido novamente, estorno fica no histórico e repetição é bloqueada |
| 14 | Tentar abrir URL externa não HTTPS ou host não autorizado | URL é bloqueada; docs HTTPS autorizadas funcionam |
| 15 | Exportar backup em Configurações e restaurar com banco de teste | Arquivo íntegro, confirmação obrigatória; dados são restaurados e o banco atual preservado em snapshot de emergência |
| 16 | Abrir Pull Request | CI verifica TypeScript, ESLint, SQLite isolado e build |
| 17 | Inspecionar `package.json` e `electron-builder.yml` | Metadados do FinControl, sem autor ou publicação em domínio de exemplo |
| 18 | Criar arquivo `teste.db` dentro do projeto e rodar `git status` | Git não sugere o banco para commit |

## Regressões complementares

- Registrar compra parcelada e pagar integralmente, verificar limite disponível e saldo.
- Pagar 2 de 3 parcelas, confirmar que a terceira fica pendente, e registrar nova compra na competência **ainda aberta**.
- Arquivar uma parcela paga, restaurar sua visualização e confirmar que os relatórios não mudam.
- Estornar pagamento de uma **fatura inteira**: conferir que todas as parcelas da fatura voltam a aberto.
- Tentar estornar um pagamento depois de consumir todo o limite liberado: sistema deve bloquear para impedir ultrapassar o limite contratado.
- Reiniciar aplicativo e conferir dados, contas, salários recorrentes, estornos, gráficos e preferência de tema.
- Testar recuperação de um backup legado no SQLite; se falhar a migração, conferir que o backup de segurança preservou os dados.
- Não registrar uma despesa manual **e** um pagamento de cartão para a mesma cobrança, pois são fluxos diferentes e podem gerar duplicidade manual.

## Escopo e limites

- Operações com data futura deixam de atualizar os saldos imediatamente; transferências/pagamentos novos precisam de data atual ou passada.
- O programa não executa salário enquanto está fechado; processa vencidos na abertura e durante o funcionamento.
- A detecção de salário duplicado usa conta, mês, categoria `Salário` e valor. Dois salários reais coincidentes no mesmo mês requerem conferência.
- O estorno é auditável e não apaga o pagamento original; a operação é recusada se ultrapassar o limite.
- Backups são bancos SQLite. Guarde-os fora de pastas públicas e do GitHub.
- A aplicação não movimenta dinheiro real.
