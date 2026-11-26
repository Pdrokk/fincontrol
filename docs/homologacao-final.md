# Matriz de homologação final — FinControl 1.6.4

Revisão de evidências: 25/11/2026 (Brasília). Escopo congelado: Windows x64 portátil, dados fictícios, sete páginas.

## Candidata e evidências

- Develop após PR 48: `407f72b40a460ca35764dd089eda71037c45a235`.
- SHA testado: `d862bafc5a4f2d1be4dedd0681a1906cb6d93320`.
- Ambos possuem árvore Git `a930ab77571dd4de1d0f4606aab998c900cb0d59`, conforme API. Não houve execução direta no SHA de merge consultado.
- [Qualidade](https://github.com/Pdrokk/fincontrol/actions/runs/45733822723) e [Windows](https://github.com/Pdrokk/fincontrol/actions/runs/45733822820): sucesso. PR 47 também aprovado nos runs 45732201810 e 45732201964.
- [Artefato portátil ZIP](https://github.com/Pdrokk/fincontrol/actions/runs/45733822820/artifacts/15078142692), com expiração indicada em 10/12/2026. Digest do ZIP informado pela API: `sha256:9b6657c71575ca403a026e3d3bbabb458a74b80faa492fce8eed56a7359e0ba0`. Não é o hash do EXE extraído.

| Grupo | Evidência | Estado |
|---|---|---|
| Tipagem, lint e build | Jobs Linux e Windows; 0 erros, 1.719 avisos de lint | Aprovado |
| Testes isolados | Log Windows: 45 testes, 45 aprovados, 0 falhas | Aprovado |
| Contas e transações | Transferência, receita, edição, exclusão, ajustes e datas futuras | Aprovado automatizado |
| Cartões | Parcelas, pagamentos, estornos, limite, histórico e duplicidade | Aprovado automatizado |
| Salário | Idempotência por competência | Aprovado automatizado |
| Investimentos | Quantidade, taxas, cotação, custos, proventos, histórico, falhas e rosca | Aprovado automatizado |
| Migração e backup | Integridade, referências, restauração, rejeição de backup inválido | Aprovado automatizado |
| Interface | FINCONTROL_UI_SMOKE_OK: sete páginas, tema, scrollbar, paginação e ações | Aprovado automatizado |
| Larguras | FINCONTROL_RESPONSIVO_OK: 630, 758, 890, 1270, 1910, 2550 px, 14 combinações cada | Aprovado automatizado |
| Executável | Build e smoke do empacotado e portátil | Aprovado automatizado |

Não se trata de cobertura integral, certificação de segurança ou inspeção visual humana.

## Matriz manual

Usar perfil Windows separado ou outra máquina, banco novo e dados fictícios. Nunca restaurar backup de teste sobre banco pessoal. Operações imediatas usam a data local atual. Os casos H02–H07 são sequenciais, sem movimentações adicionais; os demais podem usar contas independentes. Registrar resultados reais, divergências e capturas sem dados sensíveis.

| ID | Procedimento | Resultado esperado | Estado |
|---|---|---|---|
| H01 | Abrir EXE extraído em Windows x64 sem Node/VS Code | Abre e exibe 1.6.4 | Pendente |
| H02 | A = R$ 2.000, B = R$ 0; receita R$ 500 e despesa R$ 100 em A | A = R$ 2.400, B = R$ 0 | Pendente |
| H03 | Transferir R$ 300 de A para B | A = R$ 2.100, B = R$ 300; total inalterado | Pendente |
| H04 | Buscar, filtrar, editar descrição, ordenar, paginar e cancelar exclusão | Histórico preservado, filtros corretos | Pendente |
| H05 | Cartão de limite R$ 1.000; compra R$ 600 em 3 parcelas | 3 x R$ 200; disponível R$ 400; sem débito imediato | Pendente |
| H06 | Pagar duas parcelas em lote pela conta A, hoje | A = R$ 1.700; limite R$ 800; uma parcela pendente | Pendente |
| H07 | Estornar uma parcela com justificativa | A = R$ 1.900; limite R$ 600; histórico mantido | Pendente |
| H08 | Salário recorrente em conta separada; reabrir duas vezes | Um recebimento por competência | Pendente |
| H09 | Conta C = R$ 1.000; ativo manual zerado; comprar 10 unidades por R$ 200 brutos + R$ 2 taxas | C = R$ 798; quantidade 10; custo R$ 202 quando conhecido | Pendente |
| H10 | Vender 4 unidades por R$ 100 brutos - R$ 1 taxa; provento R$ 10 sem taxa | C = R$ 907; quantidade 6; histórico preservado | Pendente |
| H11 | Tentar venda acima da quantidade e compra acima do saldo; cancelar ação destrutiva | Bloqueio sem alterar saldo ou histórico | Pendente |
| H12 | Ficha, rosca, histórico e filtro de categoria | Percentuais coerentes; filtro não altera patrimônio | Pendente |
| H13 | Desconectar internet; cadastrar posição manual | Registros offline funcionam; valor desconhecido não vira zero | Pendente |
| H14 | Conferir Realizado/Previsto, mês selecionado, temas e tabelas | Sem dupla contagem, sem grades pontilhadas, eixos legíveis | Pendente |
| H15 | Sete páginas; Tab/Shift+Tab; 640px, resolução habitual e ultrawide | Foco visível, sem ações cortadas ou rolagem horizontal global indevida | Pendente |
| H16 | Exportar backup fictício, alterar registro, restaurar e reiniciar | Snapshot restaurado, vínculos íntegros | Pendente |
| H17 | Escolher arquivo inválido e cancelar restauração válida | Banco preservado | Pendente |
| H18 | Fechar e reabrir; conferir persistência e cache | Sem erro impeditivo ou perda de dados | Pendente |
| H19 | Consultar cotação opcional com internet; conferir data, origem e falhas | Limitações explícitas; cache preservado em erro | Pendente |
| H20 | Calcular SHA-256 do EXE efetivamente entregue | Hash, versão, ambiente e artefato registrados | Pendente |

Se uma operação não estiver disponível na forma indicada, registrar divergência e investigar. Não forçar aprovação.

## Registro

| ID | Data e ambiente | Resultado observado | Evidência | Responsável |
|---|---|---|---|---|
| A preencher | | | | |

## Pendências

- Execução manual, capturas reais e SHA-256 do EXE não realizados nesta revisão remota.
- 1.719 avisos de lint, sem métrica consolidada de cobertura.
- Sandbox Electron desabilitada; EXE sem assinatura e banco sem criptografia integral documentada. Avaliar riscos; não alegar certificação comercial.
- Abertura no computador do usuário após tratamento do cache foi relatada, mas não substitui teste independente.
- Validar documentação e versão de release após aceite; não ampliar escopo.

**Estado: aprovado nos testes automatizados; aceite manual pendente.** Nenhuma mudança funcional integra este relatório.
