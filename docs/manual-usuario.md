# Manual de utilização — FinControl 1.6.4

## Primeiro acesso

Baixe e abra o EXE portátil conforme o [README](../README.md). Em Minhas contas, clique em Nova conta e informe instituição, nome, tipo e saldo inicial. O saldo inicial representa a situação já existente, não uma receita do mês. Use o botão de tema no rodapé do menu.

## Controle do dia a dia

1. Em Transações, preencha descrição, valor, tipo, categoria, conta e data. Confira a movimentação no histórico.
2. Use os filtros do histórico para localizar registros, editar ou excluir com confirmação. Os filtros de mês e ano definem o período exibido.
3. Em Minhas contas, registre transferências entre contas; elas não são receitas/despesas. Use ajuste de saldo para corrigir divergências, com histórico. Configure salário recorrente se necessário; não registre manualmente o mesmo recebimento.
4. Em Visão Geral e Relatórios, compare Realizado (receitas e despesas efetivas) e Previsto (parcelas ainda abertas). Confira período e tabela dos gráficos.

## Cartões

Clique em Novo cartão, informe instituição, nome, limite, dias de fechamento/vencimento e conta opcional. Em Compras e parcelas, registre a compra com número de parcelas. Em Pagamentos e faturas, selecione cartão e parcelas, confira o total e a conta de pagamento. Use estorno com justificativa se houver pagamento incorreto. Não cadastre a mesma compra e seu pagamento como despesas separadas. A exclusão de cartão exige parcelas quitadas e preserva histórico.

## Investimentos

Em Investimentos, clique em Adicionar ativo. Escolha posição com cotação de mercado (quando suportada) ou manual, informe código, nome, instituição e quantidade existente. Essa posição inicial não altera o saldo bancário. Para registrar dinheiro realmente aplicado ou resgatado no controle pessoal, use Comprar ou Vender na linha do ativo, informe conta, quantidade, valor bruto, taxas e data. Confira a prévia do débito/crédito antes de confirmar. Proventos creditam a conta sem alterar a quantidade.

A rosca mostra participação pelo valor conhecido; posições zeradas e arquivadas não entram na distribuição. Se houver mais de seis ativos, parte é agrupada em Outros. Busca e filtro de categoria não alteram o patrimônio total. Clique no código para abrir a ficha e consultar histórico, resultado quando calculável e fundamentos (ações/FIIs, quando fornecidos). Configure a chave BRAPI somente se necessário pelo controle da fonte; nunca compartilhe essa chave. Em caso de cotação indisponível, confira a fonte e a data. Não use a cotação como promessa de execução ou rentabilidade.

Se houver falha de recarga após salvar, use Recarregar carteira antes de repetir qualquer registro. Em caso de dúvidas, consulte o histórico. Posições legadas de valor total precisam de quantidade antes de comprar ou vender.

## Backup e migração

Em Configurações, escolha Exportar backup e salve em local privado. Para restaurar, selecione um backup válido e confirme a substituição dos dados correntes. Existe cópia de emergência; mesmo assim, exporte uma cópia separada antes da operação. Não teste restauração no banco real durante a apresentação. Para mover de computador, leve o backup e o executável, e configure novamente a chave de API, se necessário.

## Problemas comuns

| Situação | Ação |
|---|---|
| EXE não abre | Confira se é Windows x64, se o ZIP foi extraído e se o arquivo vem do GitHub do projeto |
| Artefato expirado | Gere novo EXE a partir da versão validada |
| Cotação indisponível | Verifique internet, símbolo e cobertura do provedor; use registro manual quando adequado |
| Saldo divergente | Confira conta, data, taxas, transferências, pagamentos e duplicidades antes de corrigir |
| Falha após operação | Recarregue e confira histórico antes de repetir |
| Mudança de computador | Exporte/restaure backup; copiar o EXE não transfere o banco |

O aplicativo registra informações fornecidas pelo usuário e não movimenta recursos reais.
