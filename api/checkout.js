// POST /api/checkout  →  cria o pedido, reserva as peças e devolve o link de pagamento do Mercado Pago.
// O navegador manda só ids das peças, o serviço de entrega escolhido e os dados da cliente.
// Preço, frete e disponibilidade são recalculados aqui, a partir do banco e do Melhor Envio.
const {
  RESERVA_MINUTOS, PARCELAS_MAX, env, send, readJson, digits, round2, db, rpc, produtosPorIds, cotarFrete,
} = require('./_lib');

const limpa = (s, max = 120) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);

function validar(body) {
  const c = body.cliente || {};
  const e = body.entrega || {};
  const cliente = { nome: limpa(c.nome, 100), whatsapp: digits(c.whatsapp).slice(0, 13), email: limpa(c.email, 120).toLowerCase() };
  const entrega = {
    servico: limpa(e.servico, 20), cep: digits(e.cep), rua: limpa(e.rua), numero: limpa(e.numero, 20),
    complemento: limpa(e.complemento, 60), bairro: limpa(e.bairro, 80),
  };
  if (cliente.nome.split(/\s+/).length < 2) return 'Informe nome e sobrenome.';
  if (cliente.whatsapp.length < 10) return 'Informe o WhatsApp com DDD.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) return 'Confira o e-mail.';
  if (entrega.cep.length !== 8 || !entrega.rua || !entrega.numero || !entrega.bairro) return 'Complete o endereço de entrega.';
  if (!Array.isArray(body.itens) || !body.itens.length) return 'A sacola está vazia.';
  return { cliente, entrega, itens: body.itens };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { erro: 'Use POST' });
  let pedidoId = null;
  try {
    const v = validar(await readJson(req));
    if (typeof v === 'string') return send(res, 400, { erro: v });

    const produtos = await produtosPorIds(v.itens);
    if (produtos.length !== v.itens.length) {
      const achados = produtos.map(p => p.id);
      return send(res, 409, { indisponiveis: v.itens.filter(id => !achados.includes(id)) });
    }

    // Frete recalculado: o preço que a cliente viu na tela não é confiável.
    const cot = await cotarFrete(v.entrega.cep, produtos);
    if (cot.erro) return send(res, 400, { erro: cot.erro });
    const opcao = cot.opcoes.find(o => o.id === v.entrega.servico);
    if (!opcao) return send(res, 400, { erro: 'Essa forma de entrega não está disponível para o CEP. Escolha de novo.' });

    // Reserva tudo ou nada, para ninguém pagar por peça já vendida.
    const faltando = await rpc('reservar_produtos', { ids: v.itens, minutos: RESERVA_MINUTOS });
    if (faltando && faltando.length) return send(res, 409, { indisponiveis: faltando });

    const subtotal = round2(produtos.reduce((s, p) => s + Number(p.preco), 0));
    const total = round2(subtotal + opcao.preco);
    const expira = new Date(Date.now() + RESERVA_MINUTOS * 60000).toISOString();

    const [pedido] = await db('pedidos', {
      method: 'POST', prefer: 'return=representation',
      body: {
        cliente_nome: v.cliente.nome, cliente_whatsapp: v.cliente.whatsapp, cliente_email: v.cliente.email,
        entrega: { ...v.entrega, cidade: cot.endereco.cidade, uf: cot.endereco.uf, nome: opcao.nome, prazo: opcao.prazo },
        subtotal, frete: opcao.preco, total, expira_em: expira,
      },
    });
    pedidoId = pedido.id;
    await db('pedido_itens', {
      method: 'POST',
      body: produtos.map(p => ({ pedido_id: pedido.id, produto_id: p.id, codigo: p.codigo, nome: p.nome, preco: p.preco })),
    });

    const site = env('SITE_URL');
    const [nome, ...resto] = v.cliente.nome.split(/\s+/);
    const pref = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': pedido.id },
      body: JSON.stringify({
        items: [
          ...produtos.map(p => ({ id: p.codigo, title: `${p.nome} (${p.material})`, quantity: 1, unit_price: Number(p.preco), currency_id: 'BRL' })),
          ...(opcao.preco > 0 ? [{ id: 'frete', title: opcao.nome, quantity: 1, unit_price: opcao.preco, currency_id: 'BRL' }] : []),
        ],
        payer: { name: nome, surname: resto.join(' '), email: v.cliente.email },
        external_reference: pedido.id,
        statement_descriptor: 'LAUSEMIJOIAS',
        notification_url: `${site}/api/webhook-mercadopago`,
        back_urls: {
          success: `${site}/pedido.html?id=${pedido.id}`,
          pending: `${site}/pedido.html?id=${pedido.id}`,
          failure: `${site}/pedido.html?id=${pedido.id}`,
        },
        auto_return: 'approved',
        payment_methods: { installments: PARCELAS_MAX, excluded_payment_types: [{ id: 'ticket' }] }, // sem boleto: demora para compensar
        expires: true,
        expiration_date_to: expira,
        date_of_expiration: expira,
      }),
    });
    const prefJson = await pref.json();
    if (!pref.ok) throw new Error(`Mercado Pago ${pref.status}: ${JSON.stringify(prefJson).slice(0, 300)}`);

    await db(`pedidos?id=eq.${pedido.id}`, { method: 'PATCH', body: { mp_preference_id: prefJson.id } });
    return send(res, 200, { pedidoId: pedido.id, numero: pedido.numero, pagamentoUrl: prefJson.init_point });
  } catch (e) {
    console.error('checkout', e);
    if (pedidoId) { try { await rpc('liberar_pedido', { p_pedido: pedidoId, p_status: 'erro_checkout' }); } catch (_) { /* ignora */ } }
    return send(res, 500, { erro: 'Não foi possível abrir o pagamento.' });
  }
};
