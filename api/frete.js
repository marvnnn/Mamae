// POST /api/frete  { cep, itens: [produto_id] }  →  { opcoes: [{ id, nome, prazo, preco }] }
const { send, readJson, produtosPorIds, cotarFrete } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { erro: 'Use POST' });
  try {
    const { cep, itens } = await readJson(req);
    if (!Array.isArray(itens) || !itens.length) return send(res, 400, { erro: 'A sacola está vazia.' });
    const produtos = await produtosPorIds(itens);
    const r = await cotarFrete(cep, produtos);
    if (r.erro) return send(res, 400, { erro: r.erro });
    return send(res, 200, { opcoes: r.opcoes });
  } catch (e) {
    console.error('frete', e);
    return send(res, 500, { erro: 'Não conseguimos calcular o frete agora.' });
  }
};
