# Evolução e ficha do ativo — FinControl 1.6.4

Desde a v1.5.0, a carteira registra uma observação por dia local em que é consultada; a observação do mesmo dia é atualizada. Não reconstrói preços/posições anteriores nem preenche dias ausentes. Valores totais desconhecidos permanecem nulos; valores parciais conhecidos são registrados separadamente. Patrimônio inclui aportes/retiradas e não equivale à rentabilidade.

Desde a v1.6.1, a tela principal apresenta apenas a rosca de composição por ativo; o histórico patrimonial continua no SQLite, sem gráfico geral na interface. A ficha individual conserva gráfico de cotações (até 730 observações recentes, filtros de 30/90 dias ou todas), quantidade, custo quando conhecido, resultados e proventos. A cotação automática usa a data do provedor; a manual usa a data observada.

Fundamentos de ações e FIIs via BRAPI sob demanda podem incluir P/L (ações), P/VP, dividend yield e outros indicadores de acordo com cobertura e plano. Ausência é explícita. A consulta não modifica saldo. Os links CVM, SEC EDGAR e BCB são consultas públicas externas, não integração automática de documentos.

Operações e posição inicial têm funções distintas: somente compra/venda/provento registrados movimentam caixa. O Harden inclui prévia de valor líquido e quantidade. O Optimize pagina os históricos em 25 linhas. Todo histórico persistido integra o backup SQLite; a chave BRAPI fica fora dele.
