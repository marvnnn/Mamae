// Testes do e-mail de confirmação. Rodar com: node --test api/
const test = require('node:test');
const assert = require('node:assert');

const ID = '11111111-2222-4333-8444-555555555555';
const SITE = 'https://www.lausemijoias.com.br';
const pedidoBase = () => ({
  id: ID,
  numero: 12,
  cliente_nome: 'Ana & Cia',
  cliente_email: 'cliente@ex.com',
  subtotal: '209.90',
  frete: 10,
  total: '219.9',
  entrega: { nome: 'Entrega da Lau em Brumadinho' },
  pedido_itens: [
    { codigo: 'A1', nome: 'Brinco <Lua>', preco: '89.90' },
    { codigo: 'B2', nome: 'Anel', preco: 120 },
  ],
});

// Substitui o fetch global e registra as chamadas.
function fakeFetch(responder) {
  const chamadas = [];
  global.fetch = async (url, opts = {}) => {
    chamadas.push({ url: String(url), opts });
    const { status = 200, body = {} } = responder(String(url), opts) || {};
    return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body), json: async () => body };
  };
  return chamadas;
}

const { montarEmail, enviarEmail, notificarCliente } = require('./_email');

test('pedido confirmado: assunto, peças, valores, WhatsApp e link', () => {
  const { assunto, html, texto } = montarEmail(pedidoBase(), 'ok', SITE);
  assert.match(assunto, /pedido nº 12/i);
  assert.ok(html.includes('A1'));
  assert.ok(html.includes('Brinco &lt;Lua&gt;'));
  assert.ok(!html.includes('<Lua>'));
  assert.ok(html.includes('Ana &amp; Cia'));
  assert.ok(html.includes('R$ 89,90'));
  assert.ok(html.includes('R$ 219,90'));
  assert.ok(html.includes('https://wa.me/5531999431468?text='));
  const wa = html.match(/https:\/\/wa\.me\/5531999431468\?text=([^"&]+)/)[1];
  assert.match(decodeURIComponent(wa), /12/);
  assert.ok(html.includes(`${SITE}/pedido.html?id=${ID}`));
  assert.ok(!html.includes('undefined'));
  assert.ok(texto.includes('Pedido nº 12'));
  assert.ok(texto.includes('A1'));
  assert.ok(texto.includes('R$ 219,90'));
  assert.ok(!texto.includes('undefined'));
});

test('peça já vendida: avisa que a Lau vai entrar em contato', () => {
  const { assunto, html } = montarEmail(pedidoBase(), 'conflito', SITE);
  assert.match(assunto, /nº 12/);
  assert.match(html, /não está mais disponível/);
  assert.match(html, /Lau vai entrar em contato/);
  assert.ok(html.includes('nº 12'));
  assert.ok(html.includes('https://wa.me/5531999431468?text='));
});

test('entrega pelos Correios mostra o endereço', () => {
  const p = pedidoBase();
  p.entrega = { nome: 'Correios PAC', rua: 'Rua X', numero: '10', bairro: 'Centro', cidade: 'Belo Horizonte', uf: 'MG', cep: '30110000' };
  const { html } = montarEmail(p, 'ok', SITE);
  assert.ok(html.includes('Rua X, 10'));
  assert.ok(html.includes('30110-000'));
  assert.ok(!html.includes('undefined'));
});

test('enviarEmail chama o Resend com remetente e resposta certos', async () => {
  process.env.RESEND_API_KEY = 're_teste';
  const chamadas = fakeFetch(() => ({ status: 200, body: { id: 'x' } }));
  await enviarEmail({ para: 'cliente@ex.com', assunto: 'A', html: '<p>h</p>', texto: 't' });
  assert.strictEqual(chamadas.length, 1);
  assert.strictEqual(chamadas[0].url, 'https://api.resend.com/emails');
  assert.strictEqual(chamadas[0].opts.headers.Authorization, 'Bearer re_teste');
  const body = JSON.parse(chamadas[0].opts.body);
  assert.strictEqual(body.from, 'LauSemijoias <pedidos@lausemijoias.com.br>');
  assert.strictEqual(body.reply_to, 'contatolausemi@gmail.com');
  assert.deepStrictEqual(body.to, ['cliente@ex.com']);
});

test('enviarEmail rejeita quando o Resend recusa', async () => {
  process.env.RESEND_API_KEY = 're_teste';
  fakeFetch(() => ({ status: 422, body: { message: 'ruim' } }));
  await assert.rejects(enviarEmail({ para: 'c@ex.com', assunto: 'A', html: 'h', texto: 't' }));
});

test('notificarCliente: repetição do Mercado Pago (ja_pago) não envia nada', async () => {
  process.env.RESEND_API_KEY = 're_teste';
  const chamadas = fakeFetch(() => ({}));
  await notificarCliente(ID, 'ja_pago');
  assert.strictEqual(chamadas.length, 0);
});

test('notificarCliente: sem RESEND_API_KEY não envia nada', async () => {
  delete process.env.RESEND_API_KEY;
  const chamadas = fakeFetch(() => ({}));
  await notificarCliente(ID, 'ok');
  assert.strictEqual(chamadas.length, 0);
});

test('notificarCliente: busca o pedido e envia para a cliente', async () => {
  process.env.RESEND_API_KEY = 're_teste';
  process.env.SUPABASE_URL = 'https://db.ex';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk';
  process.env.SITE_URL = SITE;
  const chamadas = fakeFetch((url) => url.startsWith('https://db.ex') ? { body: [pedidoBase()] } : { body: { id: 'x' } });
  await notificarCliente(ID, 'ok');
  assert.strictEqual(chamadas.length, 2);
  assert.ok(chamadas[0].url.includes(`pedidos?id=eq.${ID}`));
  const body = JSON.parse(chamadas[1].opts.body);
  assert.deepStrictEqual(body.to, ['cliente@ex.com']);
  assert.match(body.subject, /nº 12/);
});

test('notificarCliente: falha do Resend não derruba o webhook', async () => {
  process.env.RESEND_API_KEY = 're_teste';
  process.env.SUPABASE_URL = 'https://db.ex';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk';
  fakeFetch((url) => url.startsWith('https://db.ex') ? { body: [pedidoBase()] } : { status: 500, body: {} });
  const erro = console.error; console.error = () => {};
  try { await notificarCliente(ID, 'ok'); } finally { console.error = erro; }
});
