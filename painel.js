/* LauSemijoias · painel da Lau (peças, venda no balcão, pedidos online, resumo e ajustes). */
(function () {
  'use strict';

  const D = window.PainelDados;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = (v) => BRL.format(Number(v) || 0);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const parseMoney = (s) => { const t = String(s || '').trim().replace(/\s|R\$/g, ''); const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); return Number.isFinite(n) ? n : NaN; };
  const moneyInput = (v) => (v || v === 0) && Number(v) > 0 ? Number(v).toFixed(2).replace('.', ',') : '';
  const data = (iso, o) => iso ? new Date(iso).toLocaleDateString('pt-BR', o || { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const hora = (iso) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  // Link de convite ou de "esqueci minha senha": a pessoa chega logada e precisa criar a senha.
  const RECUPERANDO = /type=(recovery|invite)/.test(location.hash);

  const ic = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    pecas: ic('<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 5 3-5M12 20 9 9m3 11 3-11"/>'),
    vender: ic('<path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>'),
    pedidos: ic('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'),
    resumo: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    ajustes: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    mais: ic('<path d="M12 5v14M5 12h14"/>'),
    busca: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    lixo: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    capa: ic('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    foto: ic('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    ant: ic('<path d="m15 6-6 6 6 6"/>'),
    prox: ic('<path d="m9 6 6 6-6 6"/>'),
  };
  // Desenho de linha por tipo, para peça sem foto.
  const ART = {
    Brinco: '<circle cx="9" cy="7" r="3"/><circle cx="23" cy="7" r="3"/><path d="M9 10v6m14-6v6"/><circle cx="9" cy="19" r="2.4"/><circle cx="23" cy="19" r="2.4"/>',
    Colar: '<path d="M5 5c2 10 7 14 11 14s9-4 11-14"/><path d="m16 19-2.5 3.5L16 27l2.5-4.5z"/>',
    Anel: '<circle cx="16" cy="19" r="8"/><path d="m12.5 8.5 3.5-4 3.5 4-3.5 3z"/>',
    Pulseira: '<ellipse cx="16" cy="16" rx="12" ry="6"/><ellipse cx="16" cy="16" rx="9" ry="3.6"/>',
    Bracelete: '<path d="M4 16a12 7 0 0 1 24 0"/><path d="M7.5 16a8.5 4.5 0 0 1 17 0"/>',
    Conjunto: '<path d="M6 5c2 8 6 11 10 11s8-3 10-11"/><circle cx="7" cy="24" r="2.6"/><circle cx="25" cy="24" r="2.6"/>',
    Piercing: '<path d="M10 16a6 6 0 1 0 12 0 6 6 0 0 0-6-6"/><circle cx="16" cy="10" r="1.8"/>',
  };
  const thumb = (p) => p.fotos && p.fotos[0]
    ? `<span class="thumb"><img src="${esc(p.fotos[0])}" alt="" loading="lazy"></span>`
    : `<span class="thumb"><svg viewBox="0 0 32 32" aria-hidden="true">${ART[p.tipo] || ART.Anel}</svg></span>`;

  const PAGES = [
    { id: 'pecas', label: 'Peças' },
    { id: 'vender', label: 'Vender' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'resumo', label: 'Resumo' },
    { id: 'ajustes', label: 'Ajustes' },
  ];
  const ST_PECA = { disponivel: 'À venda', reservado: 'Reservada', vendido: 'Vendida' };
  const ST_PED = { aguardando_pagamento: 'Aguardando pagamento', pago: 'Pago, para enviar', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado', problema: 'Com problema' };

  let db = null;
  const S = {
    sessao: null, produtos: [], vendas: [], pedidos: [], pagina: 'pecas',
    filtro: { q: '', tipo: '', st: 'disponivel' },
    venda: { ids: [], desconto: '', descTipo: 'R$', cliente: '', pagamento: 'Pix', parcelas: 1, q: '' },
    pedFiltro: 'enviar',
    mes: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  };
  const nuvem = () => db && db.modo === 'nuvem';
  const efetivo = (p) => (p.status === 'reservado' && p.reservado_ate && new Date(p.reservado_ate) < new Date()) ? 'disponivel' : p.status;
  const porId = (id) => S.produtos.find(p => p.id === id);

  /* ---------- Avisos ---------- */
  let toastT;
  function toast(msg, ruim) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast on' + (ruim ? ' bad' : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.className = 'toast' + (ruim ? ' bad' : ''); }, ruim ? 5200 : 3200);
  }
  const falha = (e) => toast((e && e.message) || 'Algo deu errado. Tente de novo.', true);

  /* ---------- Entrada (login) ---------- */
  function gate(html) {
    $('boot').hidden = true;
    $('app').hidden = true;
    $('gate').hidden = false;
    $('gate').innerHTML = html;
  }

  function telaLogin(msg) {
    gate(`<form id="login" novalidate>
      <img class="mark" src="img/marca.svg" alt="LauSemijoias">
      <h1>Painel da Lau</h1>
      <label class="field"><span>E-mail</span><input class="inp" type="email" id="lEmail" autocomplete="username" required></label>
      <label class="field"><span>Senha</span><input class="inp" type="password" id="lSenha" autocomplete="current-password" required></label>
      <p class="msg" id="lMsg">${esc(msg || '')}</p>
      <button class="btn gold wide" type="submit">Entrar</button>
      <button class="btn quiet" type="button" id="lEsqueci">Esqueci minha senha</button>
    </form>`);
    $('lEmail').focus();
    $('login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('lEmail').value.trim(), senha = $('lSenha').value;
      if (!email || !senha) { $('lMsg').textContent = 'Informe o e-mail e a senha.'; return; }
      const b = e.submitter || $('login').querySelector('[type=submit]');
      b.disabled = true; b.textContent = 'Entrando…';
      try { S.sessao = await db.entrar(email, senha); depoisDoLogin(); }
      catch (err) { $('lMsg').textContent = err.message; b.disabled = false; b.textContent = 'Entrar'; }
    });
    $('lEsqueci').addEventListener('click', async () => {
      const email = $('lEmail').value.trim();
      if (!email) { $('lMsg').textContent = 'Escreva seu e-mail acima e toque de novo em "Esqueci minha senha".'; return; }
      try { await db.lembrarSenha(email); $('lMsg').className = 'msg ok'; $('lMsg').textContent = 'Enviamos um link para criar uma senha nova. Confira seu e-mail.'; }
      catch (err) { $('lMsg').className = 'msg'; $('lMsg').textContent = err.message; }
    });
  }

  function telaNovaSenha() {
    gate(`<form id="nova" novalidate>
      <img class="mark" src="img/marca.svg" alt="LauSemijoias">
      <h1>Crie uma senha nova</h1>
      <label class="field"><span>Senha nova</span><input class="inp" type="password" id="nSenha" autocomplete="new-password" minlength="8"><small>Pelo menos 8 caracteres.</small></label>
      <p class="msg" id="nMsg"></p>
      <button class="btn gold wide" type="submit">Salvar senha</button>
    </form>`);
    $('nSenha').focus();
    $('nova').addEventListener('submit', async (e) => {
      e.preventDefault();
      const s = $('nSenha').value;
      if (s.length < 8) { $('nMsg').textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
      try { await db.novaSenha(s); history.replaceState(null, '', location.pathname); S.sessao = await db.sessao(); depoisDoLogin(); toast('Senha nova salva.'); }
      catch (err) { $('nMsg').textContent = err.message; }
    });
  }

  function telaSemAcesso() {
    gate(`<div class="box" style="border:0;background:none">
      <img class="mark" src="img/marca.svg" alt="LauSemijoias">
      <h1>Esta conta não tem acesso ao painel</h1>
      <p>Você entrou como ${esc(S.sessao.email)}. Para liberar, rode o comando <code>insert into admins</code> do fim do arquivo <code>supabase/schema.sql</code> com este e-mail.</p>
      <button class="btn line wide" id="sSair">Entrar com outra conta</button>
    </div>`);
    $('sSair').addEventListener('click', async () => { await db.sair(); S.sessao = null; telaLogin(); });
  }

  function depoisDoLogin() {
    if (!S.sessao) return telaLogin();
    if (!S.sessao.admin) return telaSemAcesso();
    entrarNoApp();
  }

  /* ---------- Estrutura ---------- */
  function pendentes() { return S.pedidos.filter(p => p.status === 'pago' || p.status === 'problema').length; }

  function renderNav() {
    const n = pendentes();
    const link = (p) => `<a href="#${p.id}" ${S.pagina === p.id ? 'aria-current="page"' : ''}>${I[p.id]}<span>${p.label}</span>${p.id === 'pedidos' && n ? `<span class="dot" aria-label="${n} para enviar">${n}</span>` : ''}</a>`;
    $('nav').innerHTML = PAGES.map(link).join('');
    $('tabbar').innerHTML = PAGES.map(link).join('');
    const quem = nuvem() ? `Conectado como<b>${esc(S.sessao.email)}</b>` : `Salvo<b>neste navegador</b>`;
    $('who').innerHTML = quem;
    $('whoMob').textContent = nuvem() ? '' : 'Salvo neste navegador';
  }

  async function carregar(partes) {
    const p = partes || ['produtos', 'vendas', 'pedidos'];
    const fn = { produtos: () => db.listarProdutos(), vendas: () => db.listarVendas(), pedidos: () => db.listarPedidos() };
    const res = await Promise.allSettled(p.map(k => fn[k]()));
    res.forEach((r, i) => { if (r.status === 'fulfilled') S[p[i]] = r.value; else falha(r.reason); });
  }

  async function entrarNoApp() {
    $('gate').hidden = true;
    $('boot').hidden = false;
    await carregar();
    $('boot').hidden = true;
    $('app').hidden = false;
    rota();
  }

  function rota() {
    const h = location.hash.replace('#', '');
    S.pagina = PAGES.some(p => p.id === h) ? h : 'pecas';
    fecharGaveta(true);
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderNav();
    const v = $('view');
    v.innerHTML = ({ pecas: pgPecas, vender: pgVender, pedidos: pgPedidos, resumo: pgResumo, ajustes: pgAjustes })[S.pagina]();
    if (S.pagina === 'pecas') renderLista();
    if (S.pagina === 'vender') { renderResultados(); renderTicket(); }
    if (S.pagina === 'pedidos') renderPedidos();
  }

  /* ================================================================== */
  /* Peças                                                               */
  /* ================================================================== */
  function pgPecas() {
    const f = S.filtro;
    const aVenda = S.produtos.filter(p => efetivo(p) === 'disponivel');
    const valor = aVenda.reduce((s, p) => s + p.preco, 0);
    const seg = [['disponivel', 'À venda'], ['reservado', 'Reservadas'], ['vendido', 'Vendidas'], ['', 'Todas']];
    return `<div class="head"><div><h1>Peças</h1><p>${aVenda.length} ${aVenda.length === 1 ? 'peça' : 'peças'} à venda, somando ${money(valor)}.</p></div>
        <button class="btn gold" data-act="nova">${I.mais}Nova peça</button></div>
      <div class="toolbar">
        <label class="search"><span class="sr">Buscar peça</span>${I.busca}<input class="inp" id="q" type="search" placeholder="Buscar por código ou nome" value="${esc(f.q)}"></label>
        <select class="inp" id="fTipo" aria-label="Tipo"><option value="">Todos os tipos</option>${D.TIPOS.map(t => `<option ${f.tipo === t.label ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Situação">${seg.map(([k, l]) => `<button data-act="fst" data-k="${k}" aria-pressed="${f.st === k}">${l}</button>`).join('')}</div>
      </div>
      <div id="lista"></div>`;
  }

  function renderLista() {
    const f = S.filtro, q = norm(f.q);
    const itens = S.produtos.filter(p => (!f.tipo || p.tipo === f.tipo) && (!f.st || efetivo(p) === f.st) && (!q || norm(p.codigo + ' ' + p.nome).includes(q)));
    const el = $('lista');
    if (!itens.length) {
      const nada = !S.produtos.length;
      el.innerHTML = `<div class="empty"><h3>${nada ? 'Nenhuma peça cadastrada' : 'Nenhuma peça encontrada'}</h3>
        <p>${nada ? 'Cadastre a primeira peça com foto, preço e descrição. Ela aparece na loja assim que você salvar.' : 'Mude a busca, o tipo ou a situação para ver outras peças.'}</p>
        ${nada ? `<button class="btn gold" data-act="nova">${I.mais}Cadastrar peça</button>` : ''}</div>`;
      return;
    }
    el.innerHTML = `<div class="list">${itens.map(p => {
      const st = efetivo(p);
      return `<button class="item ${st === 'vendido' ? 'sold' : ''}" data-act="editar" data-id="${esc(p.id)}">${thumb(p)}
        <span class="t"><b><span class="code">${esc(p.codigo)}</span>${esc(p.nome)}</b><span>${esc(p.tipo)}, ${esc(p.material)}${p.fotos.length ? '' : ' · sem foto'}</span></span>
        <span class="r"><b>${money(p.preco)}</b><span class="st ${st}">${ST_PECA[st]}</span></span></button>`;
    }).join('')}</div>`;
  }

  /* ---------- Editor de peça ---------- */
  let E = null;

  function abrirEditor(p) {
    const novo = !p;
    const id = novo ? (nuvem() ? crypto.randomUUID() : Date.now().toString()) : p.id;
    E = {
      novo, enviadas: [], removidas: [], salvando: false,
      p: novo ? { id, nome: '', tipo: 'Brinco', material: 'Prata 925', descricao: '', preco: 0, custo: 0, fotos: [], peso_g: 30, status: 'disponivel' } : { ...p, fotos: [...p.fotos] },
    };
    const st = efetivo(E.p);
    const aviso = st === 'vendido' ? `<p class="alert info">Esta peça foi vendida e não aparece na loja. Para devolvê-la à venda, desfaça a venda em Resumo.</p>`
      : st === 'reservado' ? `<p class="alert info">Reservada por uma cliente que está pagando no site, até ${hora(E.p.reservado_ate)}. Se o pagamento não cair, ela volta para a loja sozinha.</p>` : '';
    abrirGaveta(novo ? 'Nova peça' : `<span class="code">${esc(E.p.codigo)}</span>${esc(E.p.nome)}`, `
      ${aviso}
      <div class="field"><span>Fotos</span><div class="photos" id="phs"></div><small>A primeira foto é a capa na loja. Fundo liso e luz natural deixam a peça mais bonita.</small></div>
      <label class="field"><span>Nome</span><input class="inp" id="eNome" value="${esc(E.p.nome)}" placeholder="Ex.: Brinco gota zircônia" maxlength="80"></label>
      <div class="row2">
        <label class="field"><span>Código</span><input class="inp" id="eCodigo" value="${esc(novo ? codigoPrevisto(E.p.tipo) : E.p.codigo)}" maxlength="20" autocapitalize="characters" autocomplete="off" spellcheck="false" style="text-transform:uppercase;font-weight:600;color:var(--gold-l)">
          <small>${novo ? 'Sugestão automática. Pode trocar pelo código da etiqueta.' : 'O código da etiqueta da peça.'}</small></label>
        <label class="field"><span>Tipo</span><select class="inp" id="eTipo">${D.TIPOS.map(t => `<option ${E.p.tipo === t.label ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label class="field"><span>Material</span><select class="inp" id="eMat">${[...new Set([...D.MATERIAIS, E.p.material])].map(m => `<option ${E.p.material === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        <span></span>
      </div>
      <div class="row2">
        <label class="field"><span>Preço de venda</span><span class="money"><input class="inp" id="ePreco" inputmode="decimal" value="${moneyInput(E.p.preco)}" placeholder="0,00"></span></label>
        <label class="field"><span>Custo</span><span class="money"><input class="inp" id="eCusto" inputmode="decimal" value="${moneyInput(E.p.custo)}" placeholder="0,00"></span><small>Só você vê.</small></label>
      </div>
      <label class="field"><span>Descrição</span><textarea class="inp" id="eDesc" maxlength="600" placeholder="Tamanho, pedra, fecho, como usar…">${esc(E.p.descricao)}</textarea></label>
      <label class="field"><span>Peso com embalagem (g)</span><input class="inp" id="ePeso" inputmode="numeric" value="${esc(E.p.peso_g || 30)}" style="max-width:140px"><small>Usado no frete dos Correios. Se não souber, deixe 30.</small></label>`,
      `<button class="btn gold" data-act="salvar">${novo ? 'Cadastrar peça' : 'Salvar alterações'}</button>
       ${!novo && st === 'disponivel' ? `<button class="btn line" data-act="venderJa" data-id="${esc(E.p.id)}">Vender no balcão</button>` : ''}
       ${!novo && st !== 'vendido' ? `<button class="btn quiet" data-act="excluir" aria-label="Excluir peça">${I.lixo}Excluir</button>` : ''}`);
    renderFotos();
    if (novo) $('eNome').focus();
    // Enquanto ela não mexer no código, a sugestão acompanha o tipo escolhido.
    let sugestao = novo ? $('eCodigo').value : null;
    $('eTipo').addEventListener('change', (e) => {
      E.p.tipo = e.target.value;
      if (novo && $('eCodigo').value === sugestao) { sugestao = codigoPrevisto(E.p.tipo); $('eCodigo').value = sugestao; }
    });
  }

  function codigoPrevisto(tipo) {
    return D.proximoCodigo(tipo, [...S.produtos.map(p => p.codigo), ...S.vendas.flatMap(v => v.itens.map(i => i.codigo))]);
  }

  function renderFotos(enviando) {
    const el = $('phs');
    if (!el || !E) return;
    el.innerHTML = E.p.fotos.map((u, i) => `<div class="ph"><img src="${esc(u)}" alt="Foto ${i + 1}">${i === 0 ? '<span class="cap">Capa</span>' : ''}
        <span class="acts">${i > 0 ? `<button data-act="capa" data-i="${i}" aria-label="Usar como capa">${I.capa}</button>` : ''}<button data-act="tirarFoto" data-i="${i}" aria-label="Remover foto">${I.x}</button></span></div>`).join('')
      + Array.from({ length: enviando || 0 }, () => '<div class="ph up">Enviando…</div>').join('')
      + `<label class="addph">${I.foto}<span>${E.p.fotos.length ? 'Mais fotos' : 'Adicionar fotos'}</span><input type="file" id="eFile" accept="image/*" multiple></label>`;
    $('eFile').addEventListener('change', enviarFotos);
  }

  async function enviarFotos(e) {
    const files = [...e.target.files].slice(0, 8);
    e.target.value = '';
    if (!files.length) return;
    let falta = files.length;
    renderFotos(falta);
    for (const f of files) {
      try {
        const url = await db.enviarFoto(E.p.id, f);
        if (!E) { await db.removerFoto(url); return; }
        E.p.fotos.push(url);
        E.enviadas.push(url);
      } catch (err) { falha(err); }
      renderFotos(--falta);
    }
  }

  function lerEditor() {
    const p = E.p;
    p.nome = $('eNome').value.trim();
    p.codigo = $('eCodigo').value.toUpperCase().replace(/\s+/g, '');
    p.tipo = $('eTipo').value;
    p.material = $('eMat').value;
    p.preco = parseMoney($('ePreco').value);
    p.custo = $('eCusto').value.trim() ? parseMoney($('eCusto').value) : 0;
    p.descricao = $('eDesc').value.trim();
    p.peso_g = Math.round(Number(digits($('ePeso').value))) || 30;
    if (!p.codigo) return 'Informe o código da peça.';
    if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(p.codigo)) return 'Use só letras, números e hífen no código (ex.: B07 ou COL-12).';
    const dono = S.produtos.find(x => x.codigo.toUpperCase() === p.codigo && x.id !== p.id);
    if (dono) return `O código ${p.codigo} já é da peça ${dono.nome}. Escolha outro.`;
    if (!p.nome) return 'Dê um nome para a peça.';
    if (!(p.preco > 0)) return 'Informe o preço de venda (ex.: 89,90).';
    if (!(p.custo >= 0)) return 'O custo precisa ser um valor como 35,00, ou fique em branco.';
    return '';
  }

  async function salvarPeca(btn) {
    if (!E || E.salvando) return;
    const erro = lerEditor();
    if (erro) return toast(erro, true);
    E.salvando = true; btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      const salvo = await db.salvarProduto({ ...E.p, novo: E.novo });
      for (const u of E.removidas) await db.removerFoto(u).catch(() => {});
      const novo = E.novo;
      E = null;
      fecharGaveta();
      await carregar(['produtos']);
      render();
      toast(novo ? `Peça ${salvo.codigo} cadastrada${nuvem() ? ' e já está na loja' : ''}.` : `Peça ${salvo.codigo} salva.`);
    } catch (err) {
      falha(err);
      if (E) { E.salvando = false; btn.disabled = false; btn.textContent = E.novo ? 'Cadastrar peça' : 'Salvar alterações'; }
    }
  }

  async function excluirPeca() {
    const p = E && E.p;
    if (!p || !confirm(`Excluir a peça ${p.codigo} (${p.nome})? Ela sai da loja e do estoque, e não dá para desfazer.`)) return;
    try {
      await db.excluirProduto({ ...p, fotos: [...new Set([...p.fotos, ...E.removidas])] });
      E = null;
      fecharGaveta();
      await carregar(['produtos']);
      render();
      toast(`Peça ${p.codigo} excluída.`);
    } catch (err) { falha(err); }
  }

  /* ================================================================== */
  /* Vender (balcão)                                                     */
  /* ================================================================== */
  function pgVender() {
    return `<div class="head"><div><h1>Vender no balcão</h1><p>A peça sai da loja online no mesmo instante.</p></div></div>
      <div class="pos">
        <div>
          <label class="search" style="display:block;margin-bottom:14px"><span class="sr">Buscar peça</span>${I.busca}<input class="inp" id="vq" type="search" placeholder="Digite o código (ex.: B07) ou o nome" value="${esc(S.venda.q)}" autocomplete="off"></label>
          <div id="vres"></div>
        </div>
        <section class="ticket" id="ticket" aria-label="Esta venda"></section>
      </div>
      <button class="vbar" id="vBar" data-act="irTicket" hidden></button>`;
  }

  function renderResultados() {
    const q = norm(S.venda.q);
    const cands = S.produtos.filter(p => efetivo(p) !== 'vendido' && (!q || norm(p.codigo + ' ' + p.nome).includes(q)));
    const lista = cands.slice(0, q ? 60 : 30);
    const el = $('vres');
    if (!lista.length) {
      el.innerHTML = `<div class="empty"><h3>${S.produtos.length ? 'Nada com esse código ou nome' : 'Nenhuma peça à venda'}</h3><p>${S.produtos.length ? 'Confira o código na etiqueta da peça.' : 'Cadastre as peças em Peças para vender por aqui.'}</p></div>`;
      return;
    }
    el.innerHTML = (q ? '' : `<p class="note">Peças mais recentes. Busque para achar qualquer outra.</p>`) + `<div class="list">${lista.map(p => {
      const st = efetivo(p), na = S.venda.ids.includes(p.id);
      if (st === 'reservado') {
        return `<div class="item dis">${thumb(p)}<span class="t"><b><span class="code">${esc(p.codigo)}</span>${esc(p.nome)}</b><span>${money(p.preco)}</span></span><span class="r"><span class="st reservado">Reservada no site até ${hora(p.reservado_ate)}</span></span></div>`;
      }
      return `<button class="item" data-act="por" data-id="${esc(p.id)}" aria-pressed="${na}">${thumb(p)}<span class="t"><b><span class="code">${esc(p.codigo)}</span>${esc(p.nome)}</b><span>${money(p.preco)}</span></span>
        <span class="r"><span class="add">${na ? 'Na venda ✓' : '+ Adicionar'}</span></span></button>`;
    }).join('')}</div>`;
  }

  function contaVenda() {
    const v = S.venda;
    const itens = v.ids.map(porId).filter(Boolean);
    const subtotal = itens.reduce((s, p) => s + p.preco, 0);
    const n = parseMoney(v.desconto);
    const bruto = Number.isFinite(n) && n > 0 ? (v.descTipo === '%' ? subtotal * Math.min(n, 100) / 100 : n) : 0;
    const desconto = Math.round(Math.min(bruto, subtotal) * 100) / 100;
    return { itens, subtotal, desconto, total: subtotal - desconto };
  }

  function renderTicket() {
    const v = S.venda, c = contaVenda();
    const el = $('ticket');
    if (!c.itens.length) {
      el.innerHTML = `<h2>Esta venda</h2><p class="note" style="margin:0">Toque nas peças para montar a venda.</p>`;
      renderBarra();
      return;
    }
    el.innerHTML = `<h2>Esta venda</h2>
      <div>${c.itens.map(p => `<div class="tline"><span><span class="code">${esc(p.codigo)}</span><b>${esc(p.nome)}</b></span><span>${money(p.preco)}</span><button class="x" data-act="tirar" data-id="${esc(p.id)}" aria-label="Tirar ${esc(p.codigo)} da venda">${I.x}</button></div>`).join('')}</div>
      <div class="field"><span>Desconto</span><div class="disc">
        <input class="inp" id="vDesc" inputmode="decimal" placeholder="${v.descTipo === '%' ? 'Ex.: 10' : 'Ex.: 15,00'}" value="${esc(v.desconto)}">
        <div class="seg" role="group" aria-label="Tipo de desconto">${['R$', '%'].map(k => `<button data-act="descTipo" data-k="${k}" aria-pressed="${v.descTipo === k}">${k}</button>`).join('')}</div></div></div>
      <div class="field"><span>Pagamento</span><div class="seg full" role="group" aria-label="Forma de pagamento">${D.PAGAMENTOS.map(k => `<button data-act="pag" data-k="${k}" aria-pressed="${v.pagamento === k}">${k}</button>`).join('')}</div></div>
      ${v.pagamento === 'Crédito' ? `<label class="field"><span>Parcelas</span><select class="inp" id="vParc">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${v.parcelas === n ? 'selected' : ''}>${n}x de ${money(c.total / n)}</option>`).join('')}</select></label>` : ''}
      <label class="field"><span>Cliente (opcional)</span><input class="inp" id="vCli" value="${esc(v.cliente)}" placeholder="Nome de quem comprou" maxlength="120"></label>
      <div class="sum" id="vSum"></div>
      <button class="btn gold wide" data-act="concluir" id="vOk"></button>
      <button class="btn quiet" data-act="limpar">Limpar venda</button>`;
    renderSoma();
  }

  function renderBarra() {
    const b = $('vBar'), c = contaVenda();
    if (!b) return;
    b.hidden = !c.itens.length;
    b.innerHTML = `<span>Ver esta venda (${c.itens.length})</span><span>${money(c.total)}</span>`;
  }

  function renderSoma() {
    const c = contaVenda();
    renderBarra();
    const s = $('vSum');
    if (!s) return;
    s.innerHTML = `<div><span>${c.itens.length} ${c.itens.length === 1 ? 'peça' : 'peças'}</span><span>${money(c.subtotal)}</span></div>
      ${c.desconto ? `<div><span>Desconto</span><span>− ${money(c.desconto)}</span></div>` : ''}
      <div class="tot"><span>Total</span><span>${money(c.total)}</span></div>`;
    $('vOk').textContent = `Concluir venda de ${money(c.total)}`;
    const parc = $('vParc');
    if (parc) [...parc.options].forEach(o => { o.textContent = `${o.value}x de ${money(c.total / Number(o.value))}`; });
  }

  async function concluirVenda(btn) {
    const v = S.venda, c = contaVenda();
    if (!c.itens.length) return;
    btn.disabled = true; btn.textContent = 'Registrando…';
    try {
      await db.vender({ ids: c.itens.map(p => p.id), cliente: v.cliente.trim(), desconto: c.desconto, pagamento: v.pagamento, parcelas: v.pagamento === 'Crédito' ? v.parcelas : 1 });
      S.venda = { ids: [], desconto: '', descTipo: 'R$', cliente: '', pagamento: 'Pix', parcelas: 1, q: '' };
      await carregar(['produtos', 'vendas']);
      render();
      toast(`Venda de ${money(c.total)} registrada.`);
    } catch (err) {
      falha(err);
      await carregar(['produtos']);
      S.venda.ids = S.venda.ids.filter(id => porId(id) && efetivo(porId(id)) === 'disponivel');
      render();
    }
  }

  /* ================================================================== */
  /* Pedidos online                                                      */
  /* ================================================================== */
  const FILTROS_PED = [
    ['enviar', 'Para enviar', p => p.status === 'pago' || p.status === 'problema'],
    ['enviado', 'Enviados', p => p.status === 'enviado'],
    ['entregue', 'Entregues', p => p.status === 'entregue'],
    ['aguardando', 'Aguardando pagamento', p => p.status === 'aguardando_pagamento'],
    ['cancelado', 'Cancelados', p => p.status === 'cancelado'],
  ];
  const destino = (p) => { const e = p.entrega || {}; return e.servico === 'local' ? 'Entrega em Brumadinho' : `${e.nome || 'Correios'} para ${e.cidade || ''}${e.uf ? '/' + e.uf : ''}`; };

  function pgPedidos() {
    if (!nuvem()) {
      return `<div class="head"><div><h1>Pedidos online</h1></div></div>
        <div class="empty"><h3>Os pedidos pagos pelo site aparecem aqui</h3>
        <p>Por enquanto a loja está no modo prévia, e os pedidos chegam pelo WhatsApp. Quando o Supabase e o Mercado Pago estiverem configurados, cada compra paga aparece nesta tela para você enviar.</p></div>`;
    }
    return `<div class="head"><div><h1>Pedidos online</h1><p>${pendentes() ? `${pendentes()} para enviar.` : 'Nenhum pedido esperando envio.'}</p></div>
        <button class="btn line" data-act="atualizarPed">Atualizar</button></div>
      <div class="toolbar"><div class="seg" role="group" aria-label="Situação dos pedidos">${FILTROS_PED.map(([k, l, f]) => `<button data-act="fped" data-k="${k}" aria-pressed="${S.pedFiltro === k}">${l} (${S.pedidos.filter(f).length})</button>`).join('')}</div></div>
      <div id="peds"></div>`;
  }

  function renderPedidos() {
    const el = $('peds');
    if (!el) return;
    const f = FILTROS_PED.find(x => x[0] === S.pedFiltro)[2];
    const lista = S.pedidos.filter(f).sort((a, b) => (b.status === 'problema') - (a.status === 'problema') || b.numero - a.numero);
    if (!lista.length) {
      el.innerHTML = `<div class="empty"><h3>Nenhum pedido aqui</h3><p>${S.pedFiltro === 'enviar' ? 'Quando uma cliente pagar pelo site, o pedido aparece nesta lista.' : 'Escolha outra situação acima.'}</p></div>`;
      return;
    }
    el.innerHTML = `<div class="list">${lista.map(p => `<button class="item" data-act="pedido" data-id="${esc(p.id)}">
      <span class="thumb" style="font-family:var(--serif);color:var(--gold-l);font-size:15px">#${p.numero}</span>
      <span class="t"><b>${esc(p.cliente_nome)}</b><span>${esc(destino(p))}, ${data(p.pago_em || p.criado_em, { day: '2-digit', month: 'short' })}</span></span>
      <span class="r"><b>${money(p.total)}</b><span class="st ${p.status}">${ST_PED[p.status]}</span></span></button>`).join('')}</div>`;
  }

  function whatsCliente(p, texto) {
    let d = digits(p.cliente_whatsapp);
    if (d.length <= 11) d = '55' + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
  }

  function abrirPedido(id) {
    const p = S.pedidos.find(x => x.id === id);
    if (!p) return;
    const e = p.entrega || {};
    const local = e.servico === 'local';
    const nome1 = String(p.cliente_nome || '').split(' ')[0];
    const msgEnvio = local
      ? `Olá, ${nome1}! Aqui é a Lau, da LauSemijoias. Seu pedido #${p.numero} já está separado. Qual o melhor horário para eu entregar?`
      : `Olá, ${nome1}! Aqui é a Lau, da LauSemijoias. Seu pedido #${p.numero} foi enviado pelos Correios.${p.rastreio ? ` Código de rastreio: ${p.rastreio}. Acompanhe em https://rastreamento.correios.com.br` : ''}`;
    let acoes = '';
    if (p.status === 'pago') {
      acoes = local
        ? `<button class="btn gold" data-act="pedSt" data-id="${p.id}" data-k="enviado">Saiu para entrega</button>`
        : `<button class="btn gold" data-act="pedSt" data-id="${p.id}" data-k="enviado">Marcar como enviado</button>`;
    } else if (p.status === 'enviado') {
      acoes = `<button class="btn gold" data-act="pedSt" data-id="${p.id}" data-k="entregue">Marcar como entregue</button>`;
    } else if (p.status === 'problema') {
      acoes = `<button class="btn line" data-act="pedSt" data-id="${p.id}" data-k="cancelado">Já resolvi: cancelar pedido</button>`;
    }
    if (['pago', 'enviado', 'problema'].includes(p.status)) acoes += `<a class="btn line" href="${esc(whatsCliente(p, msgEnvio))}" target="_blank" rel="noopener">Mensagem para a cliente</a>`;

    abrirGaveta(`Pedido #${p.numero}`, `
      ${p.status === 'problema' ? `<div class="alert"><b>Com problema.</b> ${esc(p.observacao || 'Uma das peças já tinha sido vendida quando o pagamento caiu.')}</div>` : ''}
      <p><span class="st ${p.status}">${ST_PED[p.status]}</span>${p.pago_em ? `<span class="note"> · pago em ${data(p.pago_em)} às ${hora(p.pago_em)}</span>` : ''}</p>
      <div class="box"><h3>Peças</h3>
        ${p.itens.map(i => { const prod = porId(i.produto_id); return `<div class="tline" style="grid-template-columns:52px 1fr auto">${prod ? thumb(prod) : '<span class="thumb"></span>'}<span><span class="code">${esc(i.codigo)}</span>${esc(i.nome)}</span><span>${money(i.preco)}</span></div>`; }).join('')}
        <div class="sum"><div><span>Peças</span><span>${money(p.subtotal)}</span></div><div><span>Entrega</span><span>${money(p.frete)}</span></div><div class="tot"><span>Total</span><span>${money(p.total)}</span></div></div>
      </div>
      <div class="box"><h3>Entrega</h3>
        <div class="kv"><span>${esc(e.nome || (local ? 'Entrega da Lau' : 'Correios'))}${e.prazo ? `, ${esc(e.prazo)}` : ''}</span>
        <b style="font-weight:500">${esc(e.rua)}, ${esc(e.numero)}${e.complemento ? `, ${esc(e.complemento)}` : ''}<br>${esc(e.bairro)}, ${esc(e.cidade)}/${esc(e.uf)}<br>CEP ${esc(String(e.cep || '').replace(/^(\d{5})(\d{3})$/, '$1-$2'))}</b></div>
        ${!local && ['pago', 'enviado'].includes(p.status) ? `<label class="field"><span>Código de rastreio</span><input class="inp" id="pRast" value="${esc(p.rastreio || '')}" placeholder="Ex.: AB123456789BR" maxlength="30" style="text-transform:uppercase"></label>` : (p.rastreio ? `<div class="kv"><span>Rastreio</span><b>${esc(p.rastreio)}</b></div>` : '')}
      </div>
      <div class="box"><h3>Cliente</h3>
        <div class="kv"><b style="font-weight:500">${esc(p.cliente_nome)}</b>
        <a href="${esc(whatsCliente(p, `Olá, ${nome1}! Aqui é a Lau, da LauSemijoias, sobre o seu pedido #${p.numero}.`))}" target="_blank" rel="noopener">WhatsApp ${esc(p.cliente_whatsapp)}</a>
        <a href="mailto:${esc(p.cliente_email)}">${esc(p.cliente_email)}</a></div>
      </div>
      ${p.mp_payment_id ? `<p class="note">Pagamento no Mercado Pago: ${esc(p.mp_payment_id)} (${esc(p.mp_status || '')}).</p>` : ''}`,
      acoes || '<button class="btn line" data-act="fechar">Fechar</button>');
  }

  async function mudarPedido(btn) {
    const id = btn.dataset.id, st = btn.dataset.k;
    const p = S.pedidos.find(x => x.id === id);
    const campos = { status: st };
    const r = $('pRast');
    if (r) {
      const cod = r.value.trim().toUpperCase().replace(/\s/g, '');
      if (st === 'enviado' && !cod && !confirm('Marcar como enviado sem o código de rastreio?')) return;
      campos.rastreio = cod || null;
    }
    if (st === 'cancelado' && !confirm(`Cancelar o pedido #${p.numero}? Faça isso só depois de devolver o valor ou combinar a troca com a cliente.`)) return;
    btn.disabled = true;
    try {
      await db.atualizarPedido(id, campos);
      await carregar(['pedidos']);
      render();
      abrirPedido(id);
      toast(`Pedido #${p.numero}: ${ST_PED[st].toLowerCase()}.`);
    } catch (err) { falha(err); btn.disabled = false; }
  }

  /* ================================================================== */
  /* Resumo                                                              */
  /* ================================================================== */
  function pgResumo() {
    const ini = S.mes, fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
    const vs = S.vendas.filter(v => { const d = new Date(v.criado_em); return d >= ini && d < fim; });
    const total = vs.reduce((s, v) => s + v.total, 0);
    const pecas = vs.reduce((s, v) => s + v.itens.length, 0);
    const custo = vs.reduce((s, v) => s + v.itens.reduce((a, i) => a + (i.custo || 0), 0), 0);
    const balcao = vs.filter(v => v.origem === 'balcao').reduce((s, v) => s + v.total, 0);
    const site = total - balcao;
    const semCusto = vs.some(v => v.itens.some(i => !i.custo));

    const ultimoDia = new Date(fim - 1).getDate();
    const faixas = [[1, 7], [8, 14], [15, 21], [22, 28]];
    if (ultimoDia > 28) faixas.push([29, ultimoDia]);
    const semanas = faixas.map(([a, b]) => ({ l: a === b ? `Dia ${a}` : `Dias ${a}–${b}`, v: vs.filter(v => { const d = new Date(v.criado_em).getDate(); return d >= a && d <= b; }).reduce((s, v) => s + v.total, 0) }));
    const maxS = Math.max(1, ...semanas.map(s => s.v));
    // Faturamento por tipo: o desconto da venda é dividido entre as peças, para a pizza somar o mesmo que "Vendido".
    const tipos = {};
    vs.forEach(v => {
      const fator = v.subtotal > 0 ? v.total / v.subtotal : 1;
      v.itens.forEach(i => { const t = i.tipo || 'Outros'; tipos[t] = tipos[t] || { n: 0, v: 0 }; tipos[t].n++; tipos[t].v += i.preco * fator; });
    });
    const tl = Object.entries(tipos).sort((a, b) => b[1].v - a[1].v);

    const estoque = S.produtos.filter(p => efetivo(p) !== 'vendido');
    const hoje = new Date();
    const atual = ini.getFullYear() === hoje.getFullYear() && ini.getMonth() === hoje.getMonth();
    const nomeMes = ini.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return `<div class="head"><div><h1>Resumo</h1><p>Em estoque: ${estoque.length} ${estoque.length === 1 ? 'peça' : 'peças'}, ${money(estoque.reduce((s, p) => s + p.preco, 0))} a preço de venda (custo de ${money(estoque.reduce((s, p) => s + p.custo, 0))}).</p></div>
        <div class="month"><button data-act="mes" data-k="-1" aria-label="Mês anterior">${I.ant}</button><span>${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</span><button data-act="mes" data-k="1" aria-label="Próximo mês" ${atual ? 'disabled' : ''}>${I.prox}</button></div></div>
      <div class="tiles">
        <div class="tile"><span>Vendido</span><b>${money(total)}</b><small>${money(balcao)} no balcão, ${money(site)} no site</small></div>
        <div class="tile"><span>Lucro</span><b>${money(total - custo)}</b><small>${semCusto ? 'Algumas peças estão sem custo' : 'Total menos o custo das peças'}</small></div>
        <div class="tile"><span>Peças vendidas</span><b>${pecas}</b><small>em ${vs.length} ${vs.length === 1 ? 'venda' : 'vendas'}</small></div>
        <div class="tile"><span>Valor médio por venda</span><b>${money(vs.length ? total / vs.length : 0)}</b><small>&nbsp;</small></div>
      </div>
      ${vs.length ? `<div class="panels">
        <section class="panel"><h2>Por semana</h2>${semanas.map(s => `<div class="hbar"><span>${s.l}</span><span class="track"><span class="fill" style="width:${(s.v / maxS) * 100}%"></span></span><b>${money(s.v)}</b></div>`).join('')}</section>
        <section class="panel"><h2>Faturamento por tipo</h2>${pizza(tl, total)}</section>
      </div>
      <h2 class="section-t">Vendas do mês</h2>
      <div class="list">${vs.map(v => `<button class="item" data-act="venda" data-id="${esc(v.id)}">
        <span class="thumb" style="font-size:13px;color:var(--gold-l);text-align:center;line-height:1.2">${data(v.criado_em, { day: '2-digit' })}<br>${data(v.criado_em, { month: 'short' }).replace('.', '')}</span>
        <span class="t"><b>${esc(v.cliente || 'Cliente não informada')}</b><span>${v.itens.map(i => esc(i.codigo)).join(', ')}, ${esc(v.pagamento)}${v.parcelas > 1 ? ` em ${v.parcelas}x` : ''}</span></span>
        <span class="r"><b>${money(v.total)}</b><span class="st">${v.origem === 'online' ? 'Site' : 'Balcão'}</span></span></button>`).join('')}</div>`
      : `<div class="empty"><h3>Nenhuma venda em ${esc(nomeMes)}</h3><p>As vendas do balcão e do site aparecem aqui.</p>${atual ? '<a class="btn gold" href="#vender">Registrar uma venda</a>' : ''}</div>`}`;
  }

  // Pizza (rosca) em SVG: cada fatia é um arco do mesmo círculo. A legenda repete valor e porcentagem, para não depender só da cor.
  const CORES_PIZZA = ['#E8D08A', '#8E7330', '#C9A84C', '#F4E7C1', '#6B5524', '#B89A55', '#7D7466'];
  function pizza(lista, total) {
    const soma = lista.reduce((s, [, x]) => s + x.v, 0) || 1;
    const R = 48, C = 2 * Math.PI * R, folga = lista.length > 1 ? 1.2 : 0;
    let ini = 0;
    const fatias = lista.map(([t, x], k) => {
      const len = (x.v / soma) * C;
      const arco = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${CORES_PIZZA[k % CORES_PIZZA.length]}" stroke-width="20"
        stroke-dasharray="${Math.max(len - folga, 0.01)} ${C}" stroke-dashoffset="${-ini}"><title>${esc(t)}: ${money(x.v)}</title></circle>`;
      ini += len;
      return arco;
    }).join('');
    const pct = (v) => `${Math.round((v / soma) * 100)}%`;
    return `<div class="pizza">
      <svg viewBox="0 0 120 120" role="img" aria-label="Faturamento por tipo de peça">
        <g transform="rotate(-90 60 60)">${fatias}</g>
        <text x="60" y="57" text-anchor="middle" class="pz-l">Total</text>
        <text x="60" y="73" text-anchor="middle" class="pz-v">${money(total)}</text>
      </svg>
      <ul>${lista.map(([t, x], k) => `<li><i style="background:${CORES_PIZZA[k % CORES_PIZZA.length]}"></i><span>${esc(t)}<small>${x.n} ${x.n === 1 ? 'peça' : 'peças'}</small></span><b>${money(x.v)}</b><em>${pct(x.v)}</em></li>`).join('')}</ul>
    </div>`;
  }

  function abrirVenda(id) {
    const v = S.vendas.find(x => x.id === id);
    if (!v) return;
    abrirGaveta(`Venda de ${data(v.criado_em)}`, `
      <p class="note" style="margin:0">${v.origem === 'online' ? 'Venda pelo site' : 'Venda no balcão'} às ${hora(v.criado_em)}, ${esc(v.pagamento)}${v.parcelas > 1 ? ` em ${v.parcelas}x` : ''}.${v.cliente ? ` Cliente: ${esc(v.cliente)}.` : ''}</p>
      <div class="box">${v.itens.map(i => `<div class="tline" style="grid-template-columns:1fr auto"><span><span class="code">${esc(i.codigo)}</span>${esc(i.nome)}</span><span>${money(i.preco)}</span></div>`).join('')}
        <div class="sum"><div><span>Peças</span><span>${money(v.subtotal)}</span></div>${v.desconto ? `<div><span>Desconto</span><span>− ${money(v.desconto)}</span></div>` : ''}<div class="tot"><span>Total</span><span>${money(v.total)}</span></div></div></div>
      ${v.origem === 'online' ? '<p class="alert info">Vendas do site são canceladas pelo Mercado Pago, com a devolução do valor.</p>' : ''}`,
      v.origem === 'balcao' ? `<button class="btn danger" data-act="desfazer" data-id="${esc(v.id)}">Desfazer venda</button><button class="btn line" data-act="fechar">Fechar</button>` : '<button class="btn line" data-act="fechar">Fechar</button>');
  }

  async function desfazerVenda(btn) {
    const v = S.vendas.find(x => x.id === btn.dataset.id);
    if (!v || !confirm(`Desfazer a venda de ${money(v.total)}? As peças ${v.itens.map(i => i.codigo).join(', ')} voltam para a loja.`)) return;
    btn.disabled = true;
    try {
      await db.cancelarVenda(v);
      fecharGaveta();
      await carregar(['produtos', 'vendas']);
      render();
      toast('Venda desfeita. As peças voltaram para a loja.');
    } catch (err) { falha(err); btn.disabled = false; }
  }

  /* ================================================================== */
  /* Ajustes                                                             */
  /* ================================================================== */
  function pgAjustes() {
    const wa = localStorage.getItem('lojaWhatsapp') || '';
    return `<div class="head"><div><h1>Ajustes</h1></div></div>
      <div class="settings">
        <section class="box"><h3>Conta</h3>
          ${nuvem() ? `<p>Conectado como <b>${esc(S.sessao.email)}</b>. Peças, vendas e pedidos ficam guardados no servidor e aparecem em qualquer aparelho em que você entrar.</p>
            <div class="acts"><button class="btn line" data-act="sair">Sair</button></div>`
          : `<p>O painel está guardando tudo <b>neste navegador</b>. Se limpar o navegador ou trocar de aparelho, os dados não vão junto: faça backup com frequência.</p>
            <p>Para usar no celular e no computador e receber pagamentos pelo site, configure o Supabase (passo a passo no README).</p>`}
        </section>
        <section class="box"><h3>Loja online</h3>
          ${nuvem() ? `<p>A loja mostra as peças à venda direto do banco. Cadastrou, já aparece; vendeu, já sai.</p>`
          : `<p>No modo prévia, a loja lê o arquivo <b>catalogo.js</b>. Gere de novo sempre que cadastrar ou vender peças e coloque ao lado do <b>index.html</b>.</p>
            <label class="field"><span>WhatsApp da loja, com DDD</span><input class="inp" id="aWa" type="tel" value="${esc(wa)}" placeholder="31 99999-9999"></label>
            <div class="acts"><button class="btn gold" data-act="catalogo">Gerar catálogo da loja</button></div>`}
          <div class="acts"><a class="btn line" href="index.html" target="_blank" rel="noopener">Abrir a loja</a></div>
        </section>
        <section class="box"><h3>Backup</h3>
          <p>Baixa um arquivo com todas as peças e vendas${nuvem() ? ' e pedidos' : ''}. Guarde no Google Drive ou no e-mail.</p>
          <div class="acts"><button class="btn line" data-act="exportar">Baixar backup</button></div>
        </section>
        <section class="box"><h3>${nuvem() ? 'Trazer dados do painel antigo' : 'Restaurar backup'}</h3>
          <p>${nuvem() ? 'Envie o backup baixado no painel antigo. As peças e vendas entram no servidor; códigos que já existem são pulados.' : 'Substitui tudo o que está neste navegador pelo conteúdo do arquivo.'}</p>
          <div class="acts"><label class="btn line">Escolher arquivo<input type="file" id="aImp" accept=".json,application/json" hidden></label></div>
        </section>
      </div>`;
  }

  function baixar(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function gerarCatalogo() {
    let wa = digits($('aWa').value);
    if (wa.length === 10 || wa.length === 11) wa = '55' + wa;
    if (wa.length < 12) return toast('Informe o WhatsApp com DDD, por exemplo 31 99999-9999.', true);
    localStorage.setItem('lojaWhatsapp', wa);
    // Só peças à venda e só campos públicos: nunca o custo.
    const produtos = S.produtos.filter(p => efetivo(p) === 'disponivel').map(p => ({
      id: p.id, code: p.codigo, name: p.nome, type: p.tipo, material: p.material, description: p.descricao, sellPrice: p.preco, createdAt: p.criado_em, fotos: p.fotos,
    }));
    baixar('catalogo.js', `// Gerado pelo painel LauSemijoias em ${new Date().toLocaleString('pt-BR')}. Substitua este arquivo sempre que atualizar o estoque.\nwindow.CATALOGO = ${JSON.stringify({ geradoEm: new Date().toISOString(), whatsapp: wa, produtos }, null, 2)};\n`, 'text/javascript');
    toast(`Catálogo gerado com ${produtos.length} ${produtos.length === 1 ? 'peça' : 'peças'}.`);
  }

  async function exportar() {
    try {
      const d = await db.exportar();
      baixar(`lausemijoias-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(d, null, 2), 'application/json');
      toast('Backup baixado.');
    } catch (err) { falha(err); }
  }

  async function importar(file) {
    let d;
    try { d = JSON.parse(await file.text()); } catch { return toast('Esse arquivo não é um backup do painel.', true); }
    if (!d || (!Array.isArray(d.jewelry) && !Array.isArray(d.sales))) {
      return toast(d && d.produtos ? 'Esse é um backup do painel novo; ele serve de cópia de segurança e não precisa ser importado.' : 'Esse arquivo não é um backup do painel.', true);
    }
    const nJ = (d.jewelry || []).length, nS = (d.sales || []).length;
    const aviso = nuvem()
      ? `Trazer ${nJ} peças e ${nS} vendas para o servidor?${S.vendas.length ? ' Já existem vendas no servidor: se este backup já foi importado antes, as vendas vão aparecer em dobro.' : ''}`
      : `Substituir tudo neste navegador por ${nJ} peças e ${nS} vendas do arquivo?`;
    if (!confirm(aviso)) return;
    try {
      const r = await db.importar(d);
      await carregar();
      render();
      toast(`Pronto: ${r.produtos} peças e ${r.vendas} vendas.`);
    } catch (err) { falha(err); }
  }

  /* ================================================================== */
  /* Gaveta                                                              */
  /* ================================================================== */
  let focoAntes = null;
  function abrirGaveta(titulo, corpo, rodape) {
    focoAntes = document.activeElement;
    $('sheetTitle').innerHTML = titulo;
    $('sheetBody').innerHTML = corpo;
    $('sheetFoot').innerHTML = rodape || '';
    $('sheet').hidden = false;
    requestAnimationFrame(() => { $('sheet').classList.add('on'); $('scrim').classList.add('on'); });
    $('sheetBody').scrollTop = 0;
    if (!$('sheet').contains(document.activeElement)) $('sheetClose').focus();
  }

  function fecharGaveta(semFoco) {
    if ($('sheet').hidden) return;
    if (E && !E.salvando) {
      // Fotos enviadas para uma peça que não foi salva não ficam perdidas no servidor.
      const sobras = E.novo ? E.enviadas : E.enviadas.filter(u => !E.p.fotos.includes(u));
      sobras.forEach(u => db.removerFoto(u).catch(() => {}));
    }
    E = null;
    $('sheet').classList.remove('on');
    $('scrim').classList.remove('on');
    setTimeout(() => { if (!$('sheet').classList.contains('on')) $('sheet').hidden = true; }, 260);
    if (!semFoco && focoAntes && focoAntes.isConnected) focoAntes.focus();
  }

  /* ================================================================== */
  /* Eventos                                                             */
  /* ================================================================== */
  const ACOES = {
    nova: () => abrirEditor(null),
    editar: (b) => abrirEditor(porId(b.dataset.id)),
    fst: (b) => { S.filtro.st = b.dataset.k; document.querySelectorAll('[data-act=fst]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderLista(); },
    salvar: salvarPeca,
    excluir: excluirPeca,
    capa: (b) => { const i = +b.dataset.i; E.p.fotos.unshift(E.p.fotos.splice(i, 1)[0]); renderFotos(); },
    tirarFoto: (b) => {
      const [u] = E.p.fotos.splice(+b.dataset.i, 1);
      if (E.enviadas.includes(u)) { E.enviadas = E.enviadas.filter(x => x !== u); db.removerFoto(u).catch(() => {}); } else E.removidas.push(u);
      renderFotos();
    },
    venderJa: (b) => { const id = b.dataset.id; if (!S.venda.ids.includes(id)) S.venda.ids.push(id); E = null; location.hash = '#vender'; },
    por: (b) => {
      const id = b.dataset.id, v = S.venda;
      v.ids = v.ids.includes(id) ? v.ids.filter(x => x !== id) : [...v.ids, id];
      renderResultados(); renderTicket();
    },
    irTicket: () => $('ticket').scrollIntoView({ behavior: 'smooth', block: 'start' }),
    tirar: (b) => { S.venda.ids = S.venda.ids.filter(x => x !== b.dataset.id); renderResultados(); renderTicket(); },
    descTipo: (b) => { S.venda.descTipo = b.dataset.k; renderTicket(); },
    pag: (b) => { S.venda.pagamento = b.dataset.k; if (b.dataset.k !== 'Crédito') S.venda.parcelas = 1; renderTicket(); },
    concluir: concluirVenda,
    limpar: () => { S.venda = { ...S.venda, ids: [], desconto: '', cliente: '', parcelas: 1 }; renderResultados(); renderTicket(); },
    fped: (b) => { S.pedFiltro = b.dataset.k; document.querySelectorAll('[data-act=fped]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderPedidos(); },
    atualizarPed: async (b) => { b.disabled = true; await carregar(['pedidos', 'produtos']); render(); toast('Pedidos atualizados.'); },
    pedido: (b) => abrirPedido(b.dataset.id),
    pedSt: mudarPedido,
    mes: (b) => { S.mes = new Date(S.mes.getFullYear(), S.mes.getMonth() + Number(b.dataset.k), 1); render(); },
    venda: (b) => abrirVenda(b.dataset.id),
    desfazer: desfazerVenda,
    fechar: () => fecharGaveta(),
    sair: async () => { await db.sair(); S.sessao = null; location.hash = ''; telaLogin(); },
    catalogo: gerarCatalogo,
    exportar,
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = ACOES[b.dataset.act];
    if (fn) { e.preventDefault(); fn(b); }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'q') { S.filtro.q = t.value; renderLista(); }
    else if (t.id === 'vq') { S.venda.q = t.value; renderResultados(); }
    else if (t.id === 'vDesc') { S.venda.desconto = t.value; renderSoma(); }
    else if (t.id === 'vCli') { S.venda.cliente = t.value; }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'fTipo') { S.filtro.tipo = t.value; renderLista(); }
    else if (t.id === 'vParc') { S.venda.parcelas = Number(t.value); }
    else if (t.id === 'aImp' && t.files[0]) { importar(t.files[0]); t.value = ''; }
  });

  // Enter no campo de busca do balcão adiciona a peça quando o código bate exatamente.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('sheet').hidden) { fecharGaveta(); return; }
    if (e.key === 'Enter' && e.target.id === 'vq') {
      e.preventDefault();
      const q = norm(e.target.value);
      const p = S.produtos.find(x => norm(x.codigo) === q && efetivo(x) === 'disponivel');
      if (p && !S.venda.ids.includes(p.id)) { S.venda.ids.push(p.id); S.venda.q = ''; e.target.value = ''; renderResultados(); renderTicket(); toast(`${p.codigo} na venda.`); }
    }
  });

  $('scrim').addEventListener('click', () => fecharGaveta());
  $('sheetClose').addEventListener('click', () => fecharGaveta());
  window.addEventListener('hashchange', () => { if (!$('app').hidden) rota(); });

  // Ao voltar para o painel, busca de novo: pode ter caído um pedido ou uma reserva pode ter vencido.
  let ultimo = Date.now();
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || $('app').hidden || !nuvem() || Date.now() - ultimo < 30000 || !$('sheet').hidden) return;
    ultimo = Date.now();
    await carregar();
    render();
  });

  /* ---------- Início ---------- */
  (async function iniciar() {
    try {
      db = await D.iniciar();
    } catch (err) {
      gate(`<div class="box" style="border:0;background:none"><img class="mark" src="img/marca.svg" alt="LauSemijoias"><h1>Não foi possível abrir o painel</h1><p>${esc(err.message)}</p><button class="btn gold wide" onclick="location.reload()">Tentar de novo</button></div>`);
      return;
    }
    if (!nuvem()) { S.sessao = { email: '', admin: true }; return entrarNoApp(); }
    let recuperando = RECUPERANDO;
    db.aoMudarLogin((ev) => { if (ev === 'PASSWORD_RECOVERY') { recuperando = true; telaNovaSenha(); } });
    try { S.sessao = await db.sessao(); } catch (err) { S.sessao = null; }
    if (recuperando && S.sessao) return telaNovaSenha();
    depoisDoLogin();
  })();
})();
