# Testes de contas e transferências (FinControl)

Antes de testar, feche o Electron e faça backup do arquivo `fincontrol.db` fora do repositório Git.

## Migração

1. Abra o aplicativo com um banco anterior contendo transações e contas.
2. Confirme que o histórico e as contas continuam presentes.
3. Cadastre uma conta com tipo **Conta salário**. Feche e abra: tipo deve continuar.
4. Confirme que transações antigas mostram **Sem conta** até serem editadas.

## Movimentações vinculadas

1. Cadastre conta A com saldo inicial R$ 1.000,00 e conta B com R$ 0,00.
2. Cadastre receita R$ 500,00 para A: saldo de A deve ser R$ 1.500,00.
3. Cadastre despesa R$ 200,00 para A: saldo de A deve ser R$ 1.300,00.
4. Edite despesa de R$ 200,00 para R$ 300,00: A deve passar a R$ 1.200,00.
5. Exclua essa despesa: A deve voltar a R$ 1.500,00.
6. Aplique filtro de mês: indicadores de receitas e despesas mudam, mas o **saldo bancário atual** permanece calculado sobre todo o histórico.

## Transferências

1. Transfira R$ 400,00 de A para B: A = R$ 1.100,00; B = R$ 400,00.
2. Saldo conjunto permanece R$ 1.500,00.
3. Receitas e despesas do dashboard NÃO aumentam com transferência.
4. Teste enviar de A para a mesma conta: operação deve falhar.
5. Teste transferência acima do saldo da origem: operação deve falhar.
6. Teste valor zero/negativo e data inválida: operação deve falhar.
7. Reinicie o aplicativo e confirme que contas, saldos e transferências permanecem.

## Comandos de validação

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

**Observações:** saldos são resultados de saldo inicial + transações vinculadas e transferências. Transações antigas sem `conta_id` não alteram o saldo bancário até serem associadas a uma conta. Não envie o banco `.db` ao GitHub.
