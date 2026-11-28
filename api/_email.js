// E-mail para a cliente quando o pagamento é confirmado (enviado pelo Resend).
// Sem RESEND_API_KEY configurada, nada é enviado e o resto do site funciona igual.
const { db, isUuid, digits, LOJA_WHATSAPP, EMAIL_RESPOSTA, EMAIL_REMETENTE } = require('./_lib');

const OURO = '#c9a24a';
const PRETO = '#0b0b0b';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const brl = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  .format(Number(n) || 0).replace(/\s/g, ' ');
const primeiroNome = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const cep = (s) => { const d = digits(s); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

// Linhas do endereço de entrega; vazio na entrega local, que é combinada pelo WhatsApp.
function enderecoLinhas(e = {}) {
  if (!e.rua) return [];
  const l1 = [e.rua, e.numero].filter(Boolean).join(', ') + (e.complemento ? ` — ${e.complemento}` : '');
  const l2 = [e.bairro, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(', ');
  return [l1, l2, e.cep ? `CEP ${cep(e.cep)}` : ''].filter(Boolean);
}

function montarEmail(pedido, tipo, siteUrl) {
  const n = pedido.numero;
  const conflito = tipo === 'conflito';
  const itens = pedido.pedido_itens || [];
  const entrega = pedido.entrega || {};
  const end = enderecoLinhas(entrega);
  const nome = primeiroNome(pedido.cliente_nome);
  const wa = `https://wa.me/${LOJA_WHATSAPP}?text=${encodeURIComponent(`Olá, Lau! Meu pedido é o nº ${n}.`)}`;
  const acompanhar = `${String(siteUrl || '').replace(/\/$/, '')}/pedido.html?id=${pedido.id}`;

  const assunto = conflito
    ? `Pedido nº ${n}: uma peça não está mais disponível`
    : `Recebemos seu pedido nº ${n} · LauSemijoias`;
  const intro = conflito
    ? `Recebemos o seu pagamento, mas uma das peças do pedido não está mais disponível (ela foi vendida um pouco antes). A Lau vai entrar em contato para devolver o valor ou combinar uma troca.`
    : `Seu pagamento foi confirmado e a Lau já está separando suas peças com carinho.`;
  const ajuda = `Se precisar de alguma coisa, fale com a Lau e informe o código do pedido: nº ${n}.`;

  const linhaItem = (i) => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#f3efe6;font-size:15px">${esc(i.nome)}<br><span style="color:#8d8577;font-size:12px">Cód. ${esc(i.codigo)}</span></td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#f3efe6;font-size:15px;text-align:right;white-space:nowrap">${brl(i.preco)}</td>
    </tr>`;
  const linhaValor = (rotulo, v, forte) => `<tr>
      <td style="padding:4px 0;color:${forte ? OURO : '#b8b0a2'};font-size:${forte ? 17 : 14}px;${forte ? 'font-weight:bold' : ''}">${rotulo}</td>
      <td style="padding:4px 0;color:${forte ? OURO : '#b8b0a2'};font-size:${forte ? 17 : 14}px;text-align:right;${forte ? 'font-weight:bold' : ''}">${brl(v)}</td>
    </tr>`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:${PRETO}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PRETO}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141414;border:1px solid #2a2a2a;font-family:Georgia,'Times New Roman',serif">
  <tr><td style="padding:28px 28px 8px;text-align:center;border-bottom:1px solid ${OURO}">
    <div style="color:${OURO};font-size:26px;letter-spacing:2px">LauSemijoias</div>
    <div style="color:#8d8577;font-size:12px;letter-spacing:3px;padding:6px 0 18px">PRATA 925 · SEMIJOIAS</div>
  </td></tr>
  <tr><td style="padding:28px">
    <p style="margin:0 0 6px;color:#8d8577;font-size:12px;letter-spacing:2px">CÓDIGO DO PEDIDO</p>
    <p style="margin:0 0 20px;color:${OURO};font-size:30px">nº ${esc(n)}</p>
    <p style="margin:0 0 12px;color:#f3efe6;font-size:16px">${nome ? `Olá, ${esc(pedido.cliente_nome)}!` : 'Olá!'}</p>
    <p style="margin:0 0 24px;color:#d6cfc2;font-size:15px;line-height:1.6">${esc(intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itens.map(linhaItem).join('')}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
      ${linhaValor('Subtotal', pedido.subtotal)}${linhaValor('Frete', pedido.frete)}${linhaValor('Total', pedido.total, true)}
    </table>
    <p style="margin:24px 0 4px;color:#8d8577;font-size:12px;letter-spacing:2px">ENTREGA</p>
    <p style="margin:0;color:#d6cfc2;font-size:14px;line-height:1.6">${[entrega.nome, entrega.prazo, ...end].filter(Boolean).map(esc).join('<br>')}</p>
    <p style="margin:28px 0 12px;color:#d6cfc2;font-size:14px;line-height:1.6">${esc(ajuda)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="background:${OURO};border-radius:2px">
      <a href="${esc(wa)}" style="display:inline-block;padding:14px 26px;color:${PRETO};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none">Falar com a Lau no WhatsApp</a>
    </td></tr></table>
    ${pedido.id ? `<p style="margin:18px 0 0;text-align:center"><a href="${esc(acompanhar)}" style="color:${OURO};font-size:13px">Acompanhar o pedido</a></p>` : ''}
  </td></tr>
  <tr><td style="padding:18px 28px;border-top:1px solid #2a2a2a;color:#6f685d;font-size:12px;text-align:center;line-height:1.6">
    LauSemijoias · Brumadinho (MG)<br>Responda este e-mail ou escreva para ${esc(EMAIL_RESPOSTA)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const texto = [
    'LauSemijoias',
    '',
    `Pedido nº ${n}`,
    '',
    nome ? `Olá, ${pedido.cliente_nome}!` : 'Olá!',
    intro,
    '',
    ...itens.map(i => `- ${i.nome} (cód. ${i.codigo}): ${brl(i.preco)}`),
    '',
    `Subtotal: ${brl(pedido.subtotal)}`,
    `Frete: ${brl(pedido.frete)}`,
    `Total: ${brl(pedido.total)}`,
    '',
    'Entrega:',
    ...[entrega.nome, entrega.prazo, ...end].filter(Boolean),
    '',
    ajuda,
    `WhatsApp: ${wa}`,
    pedido.id ? `Acompanhar o pedido: ${acompanhar}` : '',
    `E-mail: ${EMAIL_RESPOSTA}`,
  ].join('\n');

  return { assunto, html, texto };
}

async function enviarEmail({ para, assunto, html, texto }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_REMETENTE, to: [para], reply_to: EMAIL_RESPOSTA, subject: assunto, html, text: texto }),
    signal: AbortSignal.timeout(5000), // o webhook não pode passar do limite da Vercel
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`);
}

// Chamada pelo webhook depois de confirmar_pagamento. Nunca lança: o pedido já está confirmado.
async function notificarCliente(pedidoId, resultado) {
  if (resultado !== 'ok' && resultado !== 'conflito') return;
  if (!process.env.RESEND_API_KEY || !isUuid(pedidoId)) return;
  try {
    const rows = await db(`pedidos?id=eq.${pedidoId}&select=id,numero,cliente_nome,cliente_email,subtotal,frete,total,entrega,pedido_itens(codigo,nome,preco)`);
    const pedido = rows && rows[0];
    if (!pedido || !pedido.cliente_email) return;
    const email = montarEmail(pedido, resultado, process.env.SITE_URL);
    await enviarEmail({ para: pedido.cliente_email, ...email });
  } catch (e) {
    console.error('email', e);
  }
}

module.exports = { montarEmail, enviarEmail, notificarCliente };
