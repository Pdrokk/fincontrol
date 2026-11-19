/** Consulta única usada tanto no aplicativo como nos testes SQLite. */
export const CONSULTA_SALDOS_CONTAS = `
    SELECT c.id, c.banco, c.nome, c.tipo, c.cor,
      c.saldo_inicial_centavos AS saldoInicialCentavos,
      c.saldo_inicial_centavos
      + COALESCE((SELECT SUM(CASE WHEN t.tipo = 'receita' THEN t.valor_centavos ELSE -t.valor_centavos END)
                   FROM transacoes t WHERE t.conta_id = c.id AND t.data <= date('now', 'localtime')), 0)
      + COALESCE((SELECT SUM(valor_centavos) FROM transferencias WHERE destino_id = c.id AND data <= date('now', 'localtime')), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM transferencias WHERE origem_id = c.id AND data <= date('now', 'localtime')), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM pagamentos_fatura pf WHERE pf.conta_id = c.id
                   AND pf.data_pagamento <= date('now', 'localtime')
                   AND pf.estornado = 0), 0)
      - COALESCE((SELECT SUM(valor_centavos) FROM pagamentos_parcelas pp WHERE pp.conta_id = c.id
                   AND pp.data_pagamento <= date('now', 'localtime')
                   AND pp.estornado = 0), 0)
      + COALESCE((SELECT SUM(diferenca_centavos) FROM ajustes_saldo WHERE conta_id = c.id AND data <= date('now', 'localtime')), 0)
        AS saldoAtualCentavos
    FROM contas c ORDER BY c.criado_em DESC
  `
