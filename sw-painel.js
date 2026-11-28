/* Service worker do app do painel. Não guarda dados: peças, vendas e pedidos vêm sempre do servidor.
   Só existe para o celular reconhecer o painel como aplicativo e mostrar um aviso quando estiver sem internet. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return; // o resto segue direto para a rede, sem passar por aqui
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#050403;color:#EFE8D8;font:16px system-ui;text-align:center;padding:24px">' +
    '<div><p style="font-size:20px;color:#E8D08A">Sem internet</p><p>O painel precisa de internet para mostrar as peças e as vendas.</p>' +
    '<button onclick="location.reload()" style="margin-top:12px;padding:12px 20px;border:0;border-radius:10px;background:#C9A84C;color:#1a1408;font-weight:700">Tentar de novo</button></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
