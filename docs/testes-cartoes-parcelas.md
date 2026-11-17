# Etapa 9 — Testes de cartões, parcelamentos e faturas previstas

## Preparação
- Feche o FinControl e faça uma cópia de `fincontrol.db` para local seguro fora do repositório.
- Esta branch depende de `feature/contas-saldos-transferencias-salario`.
- Execute:
```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

## Casos de teste
1. Cadastre cartão "Cartão principal" com limite R$ 5.000, fechamento dia 25 e vencimento dia 5.
2. Cadastre compra de R$ 3.600,00 em 12x, com data 17/11/2026.
   - Esperado: 12 parcelas de R$ 300,00.
   - Primeira fatura: competência 2026-11 e vencimento 05/12/2026.
   - Última competência: 2027-10.
3. Cadastre compra de R$ 100,00 em 3x. Valor total das parcelas deve fechar em R$ 100,00; diferença de centavos distribuída automaticamente.
4. Cadastre compra em 26/11/2026 (fechamento dia 25).
   - Primeira fatura deve ser competência 2026-12.
5. Confira soma de faturas em cada mês, distinguindo cartões.
6. Feche e abra novamente. Cartões, compras e faturas devem permanecer.
7. Confira que o Dashboard mostra previsão das faturas sem reduzir saldo das contas.
8. Valide erros: cartão inexistente, compra com valor zero, mais parcelas do que centavos disponíveis, fechamento ou vencimento fora de 1–28 e data inválida.
9. Confirme que os módulos anteriores (contas, transferências, receitas e despesas, gráficos, Light/Dark) continuam funcionando.

## Limitação prevista
Neste MVP, **faturas são apenas previstas**. Não há cobrança real, importação bancária, pagamento, estorno ou cálculo de limite disponível. Não registre pagamentos manualmente como despesa comum + despesa de compra: a integração de pagamentos será implementada separadamente para não duplicar gastos.

## Segurança
Nunca faça commit de `*.db`, `*.db-wal`, `*.db-shm` ou arquivos com dados financeiros reais.
