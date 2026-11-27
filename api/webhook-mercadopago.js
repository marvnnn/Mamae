// POST /api/webhook-mercadopago  ←  notificação do Mercado Pago quando um pagamento muda de estado.
// Nunca confiamos no conteúdo da notificação: confirmamos a assinatura e buscamos o pagamento direto na API.
const crypto = require('crypto');
const { env, send, readJson, isUuid, rpc } = require('./_lib');

// Valida o cabeçalho x-signature (Mercado Pago → Webhooks → Assinatura secreta).
function assinaturaValida(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  const sig = String(req.headers['x-signature'] || '');
  const parts = Object.fromEntries(sig.split(',').map(p => p.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${req.headers['x-request-id'] || ''};ts:${parts.ts};`;
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(parts.v1)); } catch { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { erro: 'Use POST' });
  try {
    const url = new URL(req.url, 'http://x');
    const body = await readJson(req).catch(() => ({}));
    const tipo = body.type || url.searchParams.get('type') || url.searchParams.get('topic');
    const dataId = (body.data && body.data.id) || url.searchParams.get('data.id') || url.searchParams.get('id');
    if (tipo !== 'payment' || !dataId) return send(res, 200, { ignorado: true });
    if (!assinaturaValida(req, url.searchParams.get('data.id') || dataId)) return send(res, 401, { erro: 'assinatura inválida' });

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}` },
    });
    if (!r.ok) throw new Error(`Mercado Pago ${r.status}`);
    const pag = await r.json();
    const pedido = pag.external_reference;
    if (!isUuid(pedido)) return send(res, 200, { ignorado: true });

    if (pag.status === 'approved') {
      const resultado = await rpc('confirmar_pagamento', { p_pedido: pedido, p_payment: String(pag.id), p_status: pag.status });
      return send(res, 200, { resultado });
    }
    // Cartão recusado não cancela: a cliente pode tentar outro cartão até a reserva vencer.
    if (['cancelled', 'refunded', 'charged_back'].includes(pag.status)) {
      await rpc('liberar_pedido', { p_pedido: pedido, p_status: pag.status });
    }
    return send(res, 200, { status: pag.status });
  } catch (e) {
    console.error('webhook', e);
    return send(res, 500, { erro: 'falha ao processar' }); // o Mercado Pago tenta de novo
  }
};
