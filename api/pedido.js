// GET /api/pedido?id=<uuid>  →  situação do pedido para a página de retorno.
// Não devolve dados pessoais: só número, situação, peças, entrega e valores.
const { send, isUuid, db } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { erro: 'Use GET' });
  const id = new URL(req.url, 'http://x').searchParams.get('id');
  if (!isUuid(id)) return send(res, 400, { erro: 'Pedido inválido' });
  try {
    const rows = await db(`pedidos?id=eq.${id}&select=numero,status,subtotal,frete,total,entrega->>nome,rastreio,pedido_itens(codigo,nome,preco)`);
    if (!rows.length) return send(res, 404, { erro: 'Pedido não encontrado' });
    const p = rows[0];
    return send(res, 200, {
      numero: p.numero, status: p.status, subtotal: p.subtotal, frete: p.frete, total: p.total,
      entrega: p.nome, rastreio: p.rastreio, itens: p.pedido_itens,
    });
  } catch (e) {
    console.error('pedido', e);
    return send(res, 500, { erro: 'Não foi possível consultar o pedido.' });
  }
};
