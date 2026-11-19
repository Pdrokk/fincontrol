# Etapa 12 — Validação: várias parcelas, exclusão de contas, cores e salários

## Antes de executar

1. Feche o FinControl.
2. Faça backup do banco `fincontrol.db` (fora do Git). Bancos reais não devem ser enviados ao GitHub.
3. Confira que está na branch `feature/parcelas-contas-coloridas-salario`.
4. Rode:

```powershell
npx.cmd prettier --write .
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

O código da branch não foi compilado/testado no Windows durante a criação.

## 1. Pagamento de várias parcelas

- Crie cartão de limite R$ 2.000 e conta com saldo R$ 1.000.
- Compre R$ 600 em 3x (R$ 200 cada).
- Em **Selecionar parcelas para pagar**, marque a 1ª e a 3ª (total R$ 400); escolha a conta e confirme.
- Resultado: saldo da conta cai R$ 400; limite do cartão aumenta R$ 400; 1ª e 3ª ficam pagas; 2ª continua em aberto.
- Faturas devem exibir os valores **pago** e **pendente**. Pagamento de uma parcela da fatura impede que se use o botão de **pagar fatura integralmente** na mesma competência; use a seleção de parcelas para quitar o restante.
- Tente pagar novamente a mesma parcela, pagar sem saldo e marcar parcela já paga: recusar sem novo débito.
- Selecione parcelas de cartões diferentes numa única operação: todas devem debitar a mesma conta exatamente uma vez.
- Após pagar uma parcela, tentar cadastrar outra compra que cairia na mesma competência parcialmente quitada deve falhar para preservar o fechamento.

## 2. Excluir contas bancárias com segurança

- Crie conta vazia sem transações nem outros vínculos. Clique em **Excluir** e confirme: desaparece e não volta após reiniciar.
- Tente excluir conta que tem receitas, transferências, ajustes, pagamentos de cartão, cartões associados ou salário agendado: o sistema **deve bloquear** com mensagem para preservar o histórico.
- A exclusão em cascata de contas com histórico não é oferecida nesta versão. Desvincular ou migrar histórico exige funcionalidade específica.

## 3. Cor das contas

- Ao cadastrar, escolha cor (por exemplo, azul ou verde), confirme e reabra: o cartão mantém a cor.
- Use **Editar** para escolher uma cor diferente: o restante da conta permanece igual.
- Contas antigas devem usar cor-padrão após migração não destrutiva.

## 4. Salário recorrente

- Cadastre conta salarial e um salário mensal R$ 1.500, dia 5, mês inicial corrente, 6 meses.
- Se o dia 5 já passou, o lançamento do mês deve aparecer em **Transações**, categoria **Salário**, e somar R$ 1.500 à conta.
- Se o dia 5 ainda não chegou, o dinheiro **não** deve ser creditado antecipadamente.
- Feche/reabra: não deve duplicar o salário já lançado.
- O salário deve gerar uma receita no dia programado dos meses seguintes (até a duração escolhida). Se o app estiver fechado nessa data, processará lançamentos vencidos na próxima abertura.
- Clique **Parar**: lançamentos anteriores continuam, meses futuros não serão gerados.
- Tente editar/excluir manualmente lançamento gerado por programação: bloqueio para preservar idempotência.

## 5. Regressões

- Pagamento de fatura integral continua funcionando onde nenhuma parcela da fatura foi paga.
- Transferências, contas salário, ajustes de saldo, receitas, despesas, filtros, dashboard, relatórios, persistência e temas continuam.
- Faturas já quitadas na etapa anterior não aparecem como parcelas selecionáveis.
- Nenhum pagamento é somado uma segunda vez às despesas.

## Limitações declaradas

- Não há pagamentos fracionados dentro de **uma mesma parcela** (a seleção quita parcelas inteiras).
- Não há exclusão destrutiva em cascata para contas com histórico; é bloqueada para proteger os dados.
- Recorrência do salário é mensal e por uma duração definida (1 a 120 meses); não executa em segundo plano com o programa fechado.
- Não há integração com bancos reais. O salário recorrente é um lançamento manual programado e deve ser usado apenas se o usuário desejar reconhecer a entrada no dia escolhido.
