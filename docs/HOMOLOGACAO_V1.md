# Homologação atual — FinControl 1.6.4 (Windows x64 portátil)

## Evidência da versão aprovada

| Item | Resultado |
|---|---|
| PR 44 | Mesclado na develop |
| SHA testado | `f92af6ea1ddbec1f6aa49550ec0d45790f2cead2` |
| Qualidade | [Run 45729602315](https://github.com/Pdrokk/fincontrol/actions/runs/45729602315) — sucesso |
| Windows | [Run 45729602359](https://github.com/Pdrokk/fincontrol/actions/runs/45729602359) — sucesso |
| Testes unitários | 45 aprovados; 0 falhas |
| ESLint | 0 erros; 1.721 avisos de formatação/análise, não tratados como falhas |
| Build | EXE portátil gerado |
| Smoke financeiro | Pagamentos, estornos, migrações e backup no EXE empacotado; regressão portátil aprovada |
| Smoke de interface | Sete páginas; tema, scrollbar, paginação e ações aprovados |
| Responsividade | Seis larguras solicitadas, 14 combinações página/tema por largura |
| Artefato | [FinControl-Correcoes-Validacao-Windows-44](https://github.com/Pdrokk/fincontrol/actions/runs/45729602359/artifacts/15076108412) |

Os valores de viewport observados nos logs foram 630, 758, 890, 1270, 1910 e 2550px. São testes automatizados, não avaliação visual humana ou certificação de acessibilidade. Os resultados se referem ao SHA acima, não a futuras alterações.

## Roteiro manual obrigatório para a versão final

Use dados fictícios e um perfil de Windows separado quando possível. Não restaure backup sobre dados pessoais para testar.

- [ ] Executar o EXE em Windows x64 sem ambiente de desenvolvimento; confirmar versão, abertura, fechamento e reabertura.
- [ ] Criar duas contas, receita, despesa, transferência e ajuste; reconciliar os saldos.
- [ ] Cadastrar cartão, compra parcelada, pagamento em lote, estorno e conferir limites.
- [ ] Cadastrar investimento manual, compra/venda e provento; conferir caixa, quantidade, rosca e histórico.
- [ ] Verificar prévia com taxas, saldo insuficiente e recuperação de falhas.
- [ ] Conferir filtros, paginação, relatórios e temas claro/escuro com teclado.
- [ ] Exportar backup, alterar dados fictícios, restaurar e confirmar persistência após reiniciar.
- [ ] Confirmar que o EXE não depende de internet para registros; se consultar mercado, verificar data/fonte e falhas.
- [ ] Conferir visualmente 640px, resolução habitual e ultrawide.

Registre data, versão, ambiente e resultado real de cada item. Não marque como aprovado sem execução. A distribuição acadêmica definitiva exige homologação da versão final, verificação do arquivo entregue e aprovação da equipe. O EXE não possui assinatura digital.
