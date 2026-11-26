# Entrega e apresentação do TCC — FinControl

## Pacote recomendado

- EXE portátil Windows x64 da versão final aprovada.
- Código-fonte no GitHub, com referência ao commit e à versão exata da apresentação.
- README, manual, arquitetura, design system, histórico de versões e relatório de testes.
- Banco de demonstração apenas com dados fictícios, se a equipe optar por fornecê-lo; não é obrigatório. Não distribuir banco pessoal.
- Monografia e apresentação acadêmica são entregáveis separados; este documento não substitui a estrutura exigida pelo orientador.

## Roteiro de demonstração

1. Apresente o problema: acompanhar receitas, despesas, contas, compromissos e investimentos de forma organizada.
2. Abra a Visão Geral e mostre filtro de período, saldos e gráficos.
3. Cadastre duas contas de exemplo e uma movimentação; demonstre transferência sem dupla contagem.
4. Registre compra parcelada e pagamento; confira a atualização de saldo e limite.
5. Cadastre ativo de cotação manual para demonstrar operação offline, mostre a rosca e a prévia de compra/venda.
6. Mostre backup, temas e persistência; consulte a documentação de arquitetura e os logs da CI.
7. Explique os limites: registros pessoais, ausência de conexão bancária real, cobertura das fontes externas e trabalhos futuros.

## Checklist de fechamento

- [x] v1.6.4: PR 44 mesclado e CI aprovada.
- [x] Concluir Polish sem ampliar escopo (PR 47) e corrigir grades (PR 48).
- [x] Confirmar CI do PR 48, 45 testes aprovados e equivalência da árvore Git à develop após merge.
- [ ] Executar [matriz de homologação manual](homologacao-final.md) em ambiente isolado e registrar evidências.
- [ ] Aprovar testes e revisão manual da versão final.
- [ ] Promover o código homologado à main conforme fluxo do projeto; não sobrescrever a branch.
- [ ] Identificar versão/commit final e publicar o arquivo de entrega.
- [ ] Gerar hash SHA-256 do EXE efetivamente entregue e registrar ao lado do arquivo.
- [ ] Validar abertura do arquivo em outro Windows e registrar resultados.
- [ ] Conferir links, versões, documentação e monografia antes do envio.

Para gerar hash no PowerShell: `Get-FileHash .\dist\FinControl-<versão>-portable.exe -Algorithm SHA256` (substitua <versão> pelo número real). Não existe hash final registrado neste documento. A v1.6.4 é a referência aprovada atual; o artefato definitivo ainda depende da etapa de fechamento.

## Evidências

[Homologação e logs](HOMOLOGACAO_V1.md) · [Manual](manual-usuario.md) · [Arquitetura](arquitetura.md) · [Design system](../DESIGN.md). Os relatórios de testes antigos em docs são registros históricos e não substituem a validação da versão final.
