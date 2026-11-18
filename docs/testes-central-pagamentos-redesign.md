# Etapa 13 — Central de pagamentos e redesign minimalista

## Antes de começar
1. Feche o Electron.
2. Faça backup do arquivo `fincontrol.db` (fora do GitHub).
3. Confira a branch `feature/central-pagamentos-ui-minimalista`.
4. No PowerShell do VS Code execute:

```powershell
npx.cmd prettier --write .
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

Os testes e build precisam ser executados no Windows antes de integrar à branch principal.

## Central única de pagamentos
- Abra **Cartões e faturas**: existe uma seção **Central de pagamentos**.
- Faturas e parcelas não apresentam mais botões de pagamento separados em blocos duplicados.
- Marcar o cabeçalho da fatura seleciona todas as parcelas pendentes daquela competência.
- Marcar só algumas parcelas seleciona o total corretamente.
- Selecione parcelas de cartões e meses diferentes, confira total, escolha uma conta e confirme.
- Saldo bancário diminui pelo valor total exatamente uma vez, limite disponível do cartão aumenta e novas seleções não incluem parcelas pagas.
- Tentar pagar sem saldo ou parcelas já pagas deve ser recusado.
- A aba **Histórico de pagos** lista parcelas quitadas.
- O botão de arquivar oculta a parcela na lista de histórico por padrão.
- **Mostrar parcelas arquivadas** exibe as parcelas ocultas e permite restaurá-las.
- Arquivar não apaga pagamentos, compras, nem relatórios; reiniciar mantém a visibilidade escolhida.
- Parcelas que foram quitadas por **Pagar fatura** em versões anteriores devem aparecer pagas.
- A Central exibe apenas parcelas efetivamente pendentes para pagamento.

## Dashboard minimalista
- Quatro indicadores: saldo nas contas, receitas, despesas e faturas em aberto.
- Dois gráficos no Dashboard: receitas x despesas e despesas por categoria. O relatório completo continua com gráfico de evolução do saldo.
- Abaixo: próximos três vencimentos e até cinco movimentações bancárias.
- O filtro inicial é mês e ano atuais; trocar filtro não altera o saldo bancário total nem o valor de todas as faturas em aberto.
- Pagamentos de faturas não devem aparecer novamente como despesas. As parcelas continuam nos resultados por competência.
- Abrir **Ver todos** da lista de faturas vai para a página Cartões e faturas; movimentações vai para Transações.

## Dark Mode e estilo
- O antigo botão de texto foi trocado por um switch compacto com sol/lua.
- Alternar tema mantém o esquema de cores e persiste após reinício.
- Sidebar, painéis, cards e botões têm estilo mais discreto sem remover as cores configuradas pelo usuário nos bancos.
- Em janelas estreitas, os indicadores e listas se reorganizam.
- Verifique visual e contraste nos dois temas.

## Regressão
- Cadastrar cartão e compra parcelada, cadastrar contas, receitas, salários recorrentes, transferências, editar contas e corrigir saldos.
- Parcelas já pagas no banco continuam intactas.
- Conferir backup antes e depois da atualização.

## Limites
- **Arquivar** é uma exclusão apenas da visualização, reversível. Não há exclusão física de pagamentos e parcelas quitadas.
- Pagamento de uma parcela continua sendo sempre integral; a seleção múltipla permite quitar várias parcelas.
- Nenhuma operação movimenta dinheiro real ou se conecta a instituições financeiras.
