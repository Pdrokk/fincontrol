# FinControl — Etapa 14: navegação e identidade visual dos bancos

## Preparação

Feche o Electron e faça backup do `fincontrol.db` fora do Git. Esta branch é baseada em `feature/central-pagamentos-ui-minimalista` (PR #6), não na master.

No terminal do VS Code:

```powershell
git fetch origin
git switch --track origin/feature/tema-sidebar-editar-cartoes-cores-bancos
npx.cmd prettier --write .
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run dev
```

## Testes principais

1. **Tema lateral:** o botão de sol/lua deve estar no rodapé da barra lateral, não no topo. Alternar tema deve persistir após reinício.
2. **Categorias:** não existe mais ícone Categorias na barra lateral; as categorias de receitas e despesas aparecem dentro de Configurações.
3. **Editar cartões:** criar cartão novo; clicar Editar; verificar preenchimento do formulário, alteração de nome, banco, conta associada e limite; confirmar persistência após reiniciar.
4. **Cancelamento:** clicar Editar e depois Cancelar edição. O cartão original deve permanecer inalterado.
5. **Proteção de limite:** após compras, tentar reduzir o limite abaixo do valor já utilizado. O sistema deve recusar sem alterar o cartão.
6. **Fechamento/vencimento:** mudar dias em cartão sem compras deve ser permitido. Em cartão com compras existentes, deve ser bloqueado para preservar as competências das faturas.
7. **Contas coloridas:** Nubank roxo, Santander vermelho, Itaú azul/laranja, Inter laranja. Outras instituições reconhecidas devem usar cores correspondentes e bancos desconhecidos devem usar cor neutra.
8. **Cor automática após renomear:** editar banco de uma conta ou cartão para outro reconhecido: o cartão visual deve assumir a cor nova automaticamente. As cores antigas armazenadas na tabela de contas não devem forçar a apresentação.
9. **Regressão financeira:** Central de Pagamentos, seleção múltipla, histórico, salários, transferências e relatórios continuam funcionando. Editar um cartão não deve apagar compras, parcelas ou pagamentos.
10. **Visual:** conferir comportamento nas duas opções de tema e com janela menor.

## Observações

- As cores são interpretações aproximadas da identidade visual das instituições; não reproduzem os elementos oficiais de marca.
- A tela de Categorias continua como lista informativa, não como editor de categorias.
- Não se altera o calendário de compras existentes ao editar o cartão: datas ficam bloqueadas se já houver compras.
- A aplicação ainda não foi compilada nem testada localmente no Windows nesta branch. Não fazer merge antes dos testes.
