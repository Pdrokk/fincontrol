# FinControl — Testes de gestão das contas bancárias

## Antes de testar
Feche o Electron. Faça uma cópia de segurança de `fincontrol.db` fora do Git. Esta branch depende de `feature/pagamento-faturas-limite`.

```powershell
npx.cmd prettier --write .
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

## Cenário 1 — Editar conta
1. Abra **Minhas contas** e clique em **Editar**.
2. Renomeie "Conta principal" para "Conta do dia a dia", altere o banco e o tipo para **Conta salário**.
3. Confirme: nome, banco e tipo mudam; o saldo e o histórico de pagamentos/transações não se alteram.
4. Feche e reabra o aplicativo; alterações permanecem.

## Cenário 2 — Adicionar dinheiro (receita de verdade)
1. Em uma conta que tem R$ 100,00, clique **Adicionar dinheiro**.
2. Registre R$ 500,00 com descrição "Salário recebido", categoria Salário e data.
3. Esperado: saldo R$ 600,00, um lançamento de receita no histórico e R$ 500,00 na receita do mês.
4. Pague uma fatura de até R$ 600,00 com essa conta. O pagamento deve ser possível e o saldo cair corretamente.
5. Volte ao Dashboard e verifique os indicadores e gráficos atualizados.

## Cenário 3 — Corrigir saldo sem receita fictícia
1. Com saldo R$ 600,00, clique em **Corrigir saldo** e informe R$ 570,00 e motivo "Conciliação com extrato".
2. O saldo deve mudar para R$ 570,00, mas o total de receitas e despesas permanece igual.
3. Não deve existir um segundo lançamento de receita ou despesa.
4. O ajuste deve persistir após reinício e poder ser identificado na tabela `ajustes_saldo`.
5. Um ajuste igual ao saldo atual, motivo vazio, data inválida e saldo negativo devem ser rejeitados.

## Cenário 4 — Regressões
- Cadastros e transferências de contas anteriores devem permanecer.
- Pagamentos de faturas existentes permanecem associados às contas, mesmo após renomeá-las.
- Cartões continuam calculando limite disponível.
- Reinício da aplicação não apaga contas, ajustes, transferências ou receitas.
- Light/Dark Mode não deve quebrar o layout dos botões.

## Regra financeira
**Adicionar dinheiro** registra receita. Use apenas para entrada real que ainda não foi registrada (salário recebido, entrada de caixa etc.). Para dinheiro movido entre duas contas já cadastradas, use **Transferir entre contas**. Para diferenças entre o app e o extrato (saldo inicial digitado incorretamente, transações faltantes etc.), use **Corrigir saldo**; isso não é receita nem despesa.

Nesta fase, por segurança, o saldo inicial histórico **não é editado diretamente**. Correções ficam gravadas separadamente em `ajustes_saldo`, com motivo e diferença. Não recomendamos "corrigir saldo" para esconder uma despesa real que deve entrar no relatório.

**Não envie arquivos `.db`, `.db-wal` ou `.db-shm` ao GitHub.**
