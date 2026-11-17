# Etapa 10 — Validação de pagamento de faturas e limite disponível

> Execute os testes somente depois de fazer um backup de `fincontrol.db` **com o Electron fechado**. A branch é baseada em `feature/cartoes-parcelas-faturas`, não em `master`.

## Validar build
```powershell
npx.cmd prettier --write .
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

## Preparação para o teste
- Conta A: saldo inicial R$ 2.000,00.
- Conta B: saldo inicial R$ 100,00.
- Cartão C: limite R$ 1.500,00, fechamento dia 25, vencimento dia 5, conta associada A.
- Não lance manualmente no formulário de transações os mesmos gastos já cadastrados no cartão.

## Teste 1 — Limite usado e disponível
1. Cadastre compra de R$ 1.200,00 em 12 vezes no cartão C, em 17/11/2026.
2. O cartão deve mostrar utilizado = R$ 1.200,00, disponível = R$ 300,00.
3. Cadastre compra adicional de R$ 301,00: o sistema deve recusá-la.
4. Cadastre compra adicional de R$ 200,00 em 1 vez: disponível = R$ 100,00.

## Teste 2 — Pagamento integral
1. Fatura 2026-11 deverá somar R$ 300,00 (parcela 1/12 de R$ 100 + compra extra de R$ 200).
2. Selecione conta A e clique em **Pagar fatura**; confirme.
3. Conta A: R$ 1.700,00 (sem outras movimentações).
4. Cartão C: limite utilizado R$ 1.100,00; disponível R$ 400,00.
5. Fatura 2026-11 deve mostrar **Paga** e não oferecer novo botão de pagamento.
6. Tente repetir o pagamento: não deve gerar segunda baixa bancária.
7. Tente adicionar uma compra que cairia na competência 2026-11 já paga: a compra deve ser recusada para preservar o valor da fatura.

## Teste 3 — Relatórios sem duplicar despesa
- No filtro novembro/2026, as parcelas da fatura entram como despesas **por competência**.
- O pagamento de R$ 300,00 reduz o saldo bancário A, mas não deve gerar uma segunda despesa no gráfico financeiro.
- O histórico de transações bancárias não deve mostrar uma despesa fictícia pelo pagamento; os pagamentos ficam em suas faturas.
- Os filtros de receitas e despesas incluem as parcelas por competência no resumo/gráficos; o histórico de lançamentos continua exibindo apenas transações bancárias.
- Em `Todos os meses`, o resultado por competência pode incluir parcelas **futuras**. Não confundir esse indicador com dinheiro disponível nas contas.

## Teste 4 — Casos negativos
- Pagar fatura com saldo insuficiente: erro, nenhum valor debitado.
- Pagar duas vezes: erro, sem débito duplicado.
- Pagar fatura de competência inexistente: erro.
- Compra que excede limite disponível: erro, sem parcelas novas.
- Fechar e abrir o FinControl: pagamentos, saldos e limite persistem.
- Light/Dark Mode, contas salário, transferências, transações e gráficos continuam funcionais.

## Limitações intencionais
- Somente **pagamento integral**. Parcelamentos, estornos, juros, multas, reembolsos, pagamentos parciais e antecipação de parcelas com regras de fechamento ficam para uma versão seguinte.
- Uma fatura quitada é considerada **fechada**: novas parcelas na mesma competência são rejeitadas.
- Contabilização de despesas no cartão é feita por competência, não pela data de pagamento da fatura.
- Esta versão não faz conexão com instituições financeiras, nem movimenta dinheiro real.

**Nunca faça commit do banco `.db`, arquivos `.db-wal` ou `.db-shm`.**
