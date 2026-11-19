# Etapa 15 — Gráficos: realizado, previsto e paginação

## Diagnóstico

Anteriormente, `listarParcelasParaRelatorios()` incluía todas as parcelas de cartão nos gráficos, mesmo aquelas previstas para meses futuros. O gráfico "Evolução do saldo" subtraía essas parcelas futuras, parecendo representar um saldo bancário negativo. O pagamento de fatura não era criado como despesa no banco, mas o relatório não diferenciava previsão e realizado.

## Comportamento novo

- **Realizado**: transações bancárias lançadas até hoje + parcelas de cartão efetivamente pagas, na data do pagamento. O pagamento não é somado duas vezes.
- **Previsto**: somente parcelas ainda não pagas, na competência da fatura.
- **Navegação**: páginas com até seis meses. Meses sem movimentações aparecem zerados quando estão entre outros meses com dados.
- **Categoria**: somas apenas dos meses exibidos na página.
- **Resultado acumulado**: sempre calculado a partir de zero para a janela visível. Não equivale ao saldo bancário.
- **Saldo nas contas**: continua sendo calculado no módulo SQLite e não é modificado pelos filtros do gráfico.
- **Receitas e despesas do Dashboard/Relatórios**: por padrão, efetivamente realizadas; faturas pendentes continuam visíveis separadamente.

## Validar no Windows

Antes: feche o Electron e faça backup do `fincontrol.db`.

```powershell
git fetch origin
git switch --track origin/feature/graficos-realizado-previsto-paginacao
npx.cmd prettier --write .
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

## Testes sugeridos

1. Compra de R$ 3.600,00 em 12 vezes: nenhuma parcela futura aparece como despesa no modo **Realizado** antes do pagamento.
2. No modo **Previsto**, todas as parcelas pendentes aparecem distribuídas nos meses corretos.
3. Pagar duas parcelas (R$ 300 + R$ 300): ambas deixam o modo Previsto e passam a constar no Realizado na data do pagamento, uma única vez.
4. Pagar fatura integral: soma do mês realizado corresponde ao total das parcelas pagas da fatura, sem duplicidade de pagamentos.
5. Dar zoom lógico via setas: cada página exibe no máximo seis meses; a categoria reflete somente aquela janela.
6. Testar páginas de 2026 e 2027: meses futuros não afetam o saldo real no gráfico.
7. Testar sem transações, sem faturas e com apenas um mês.
8. Cadastrar receita bancária real e conferir que ela soma ao realizado.
9. Conferir Dashboard, Relatórios, saldos das contas e limite dos cartões antes e depois de pagar.
10. Reiniciar o aplicativo e repetir a consulta.

## Observações

- A opção **Realizado** usa a data de pagamento para despesas de cartão, enquanto **Previsto** usa a competência da fatura. Isso é uma apresentação de **fluxo realizado versus compromissos futuros**, não um demonstrativo contábil formal por competência.
- Se o usuário cadastrou manualmente uma despesa para o pagamento de uma fatura, além do pagamento na Central, ela poderá estar duplicada no histórico manual. Essa versão não tenta remover lançamentos manuais automaticamente.
- Para transações bancárias incluídas com datas futuras, o modo Realizado as omite até a data chegar.
- Ainda é preciso executar os testes reais no ambiente Windows antes do merge.
