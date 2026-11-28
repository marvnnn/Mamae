// Funções compartilhadas pelas rotas da pasta /api (Vercel, Node 18+). Arquivos com "_" não viram rota.
// Variáveis de ambiente (configurar na Vercel → Settings → Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY        banco de dados (a service role NUNCA vai para o navegador)
//   MP_ACCESS_TOKEN                                 Mercado Pago → Suas integrações → Credenciais de produção
//   MP_WEBHOOK_SECRET                               assinatura secreta das notificações (Webhooks) do Mercado Pago
//   MELHOR_ENVIO_TOKEN                              token do Melhor Envio (permissão shipping-calculate)
//   MELHOR_ENVIO_SANDBOX=1                          opcional, para testar no ambiente de teste do Melhor Envio
//   CEP_ORIGEM                                      CEP de onde a Lau posta as encomendas
//   CONTATO_EMAIL                                   e-mail técnico exigido pelo Melhor Envio no User-Agent
//   SITE_URL                                        ex.: https://lausemijoias.com.br (sem barra no fim)

const CIDADE_LOCAL = { nome: 'Brumadinho', uf: 'MG', taxa: 0 }; // TESTE: voltar para 10 depois
const RESERVA_MINUTOS = 30;
const PARCELAS_MAX = 6;
// Caixa pequena para joias (mínimo aceito pelos Correios), em cm.
const CAIXA = { width: 11, height: 4, length: 16 };
const EMBALAGEM_G = 120;

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável ${name} não configurada`);
  return v;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.length > 20000) throw new Error('payload grande demais');
  return raw ? JSON.parse(raw) : {};
}

const digits = (s) => String(s || '').replace(/\D/g, '');
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
const round2 = (n) => Math.round(n * 100) / 100;

// ---------- Supabase (REST com a service role) ----------
async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${data && data.message ? data.message : text}`);
  return data;
}
const rpc = (fn, args) => db(`rpc/${fn}`, { method: 'POST', body: args });

// Busca as peças pedidas direto do banco: o preço que vale é sempre o daqui.
async function produtosPorIds(ids) {
  const unique = [...new Set(ids)].filter(isUuid);
  if (!unique.length || unique.length !== ids.length || unique.length > 30) throw new Error('itens inválidos');
  return db(`produtos?id=in.(${unique.join(',')})&select=id,codigo,nome,material,preco,peso_g,status,reservado_ate`);
}

// ---------- CEP ----------
async function enderecoDoCep(cep) {
  const d = digits(cep);
  if (d.length !== 8) return null;
  const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.erro ? null : { cep: d, cidade: j.localidade, uf: j.uf };
}

const ehLocal = (end) => end && norm(end.cidade) === norm(CIDADE_LOCAL.nome) && end.uf === CIDADE_LOCAL.uf;

// ---------- Frete ----------
// Devolve as opções de entrega para o CEP e as peças: entrega local em Brumadinho ou PAC/SEDEX pelo Melhor Envio.
async function cotarFrete(cep, produtos) {
  const end = await enderecoDoCep(cep);
  if (!end) return { erro: 'CEP não encontrado' };
  if (ehLocal(end)) {
    return { endereco: end, opcoes: [{ id: 'local', nome: `Entrega da Lau em ${CIDADE_LOCAL.nome}`, prazo: 'Combinada pelo WhatsApp depois do pagamento', preco: CIDADE_LOCAL.taxa }] };
  }

  const base = process.env.MELHOR_ENVIO_SANDBOX ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
  const pesoKg = (produtos.reduce((s, p) => s + (p.peso_g || 30), 0) + EMBALAGEM_G) / 1000;
  const valor = produtos.reduce((s, p) => s + Number(p.preco), 0);
  const r = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env('MELHOR_ENVIO_TOKEN')}`,
      'User-Agent': `LauSemijoias (${env('CONTATO_EMAIL')})`,
    },
    body: JSON.stringify({
      from: { postal_code: digits(env('CEP_ORIGEM')) },
      to: { postal_code: end.cep },
      package: { ...CAIXA, weight: Math.max(pesoKg, 0.3) },
      options: { insurance_value: round2(valor), receipt: false, own_hand: false },
      services: '1,2', // 1 = PAC, 2 = SEDEX (Correios)
    }),
  });
  if (!r.ok) throw new Error(`Melhor Envio ${r.status}`);
  const lista = await r.json();
  const opcoes = (Array.isArray(lista) ? lista : [])
    .filter(s => !s.error && s.price)
    .map(s => {
      const dias = Number(s.custom_delivery_time || s.delivery_time) + 1; // +1 dia útil para a Lau postar
      return { id: `me-${s.id}`, nome: `Correios ${s.name}`, prazo: `Chega em até ${dias} dias úteis`, preco: round2(Number(s.custom_price || s.price)) };
    })
    .sort((a, b) => a.preco - b.preco);
  return { endereco: end, opcoes };
}

module.exports = {
  CIDADE_LOCAL, RESERVA_MINUTOS, PARCELAS_MAX,
  env, send, readJson, digits, isUuid, round2, db, rpc, produtosPorIds, cotarFrete,
};
