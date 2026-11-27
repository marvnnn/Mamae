// Vitrine e finalização da LauSemijoias.
// O navegador só monta o pedido. Preço, estoque e frete são sempre recalculados no servidor (/api/checkout).
(function () {
  const CFG = window.LOJA_CONFIG || {};
  const LOCAL = CFG.cidadeLocal || { nome: 'Brumadinho', uf: 'MG', taxa: 10 };
  const PARC = CFG.parcelasMax || 6;
  const BAG_KEY = 'lauSemijoiasSacola';
  const FORM_KEY = 'lauSemijoiasCliente';
  const $ = (id) => document.getElementById(id);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const shipPrice = (o) => o.combinar ? 'A combinar' : money(o.preco);
  const fmtCep = (c) => c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const online = () => !!CFG.apiBase;

  // Desenhos de traço fino usados enquanto a peça não tem foto.
  const ART = {
    Brinco: '<circle cx="36" cy="44" r="9"/><circle cx="64" cy="44" r="9"/><path d="M36 53v10M64 53v10"/><circle cx="36" cy="68" r="4"/><circle cx="64" cy="68" r="4"/>',
    Colar: '<path d="M18 26 Q50 84 82 26"/><path d="M50 55v8"/><path d="M44 63h12l-6 10z"/>',
    Anel: '<circle cx="50" cy="58" r="22"/><path d="M42 36l8-12 8 12z"/>',
    Pulseira: '<ellipse cx="50" cy="52" rx="32" ry="17"/><ellipse cx="50" cy="52" rx="26" ry="12"/>',
    Bracelete: '<path d="M20 60a30 22 0 1 1 60 0"/><path d="M26 60a24 16 0 1 1 48 0"/>',
    Conjunto: '<path d="M22 22 Q50 70 78 22"/><circle cx="50" cy="46" r="4"/><circle cx="30" cy="74" r="6"/><circle cx="70" cy="74" r="6"/>',
    Piercing: '<path d="M38 60a12 12 0 1 1 24 0"/><circle cx="38" cy="62" r="3"/><circle cx="62" cy="62" r="3"/>',
  };
  const art = (type) => `<span class="art" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="#C9A84C" stroke-width="1.6" stroke-linecap="round">${ART[type] || ART.Anel}</svg></span>`;
  const photo = (p, i = 0) => (p.fotos && p.fotos[i])
    ? `<img src="${esc(p.fotos[i])}" alt="${esc(p.name)}" loading="lazy">`
    : art(p.type);
  const ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
  const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  let products = [];
  let bag = [];
  const view = { type: 'Todas', q: '', sort: 'recent' };
  const checkout = { step: 'bag', cep: '', addr: null, opts: [], ship: null, loadingShip: false, shipError: '', paying: false, payError: '' };
  let cliente = {};
  try { cliente = JSON.parse(localStorage.getItem(FORM_KEY) || '{}'); } catch { cliente = {}; }

  // ---------- Catálogo ----------
  async function fromSupabase() {
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) return null;
    const r = await fetch(`${CFG.supabaseUrl}/rest/v1/vitrine?select=*&order=criado_em.desc`, {
      headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}` },
    });
    if (!r.ok) throw new Error('catálogo indisponível');
    return (await r.json()).map(p => ({
      id: p.id, code: p.codigo, name: p.nome, type: p.tipo, material: p.material,
      description: p.descricao || '', sellPrice: Number(p.preco), createdAt: p.criado_em, fotos: p.fotos || [],
    }));
  }

  function fromIndexedDB() {
    // Plano B para testar no mesmo navegador do painel.
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve([]);
      const req = indexedDB.open('LauSemiJoiasDB');
      req.onerror = () => resolve([]);
      req.onupgradeneeded = (e) => { e.target.transaction.abort(); resolve([]); };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('jewelry')) return resolve([]);
        const r = db.transaction('jewelry', 'readonly').objectStore('jewelry').getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => resolve([]);
      };
    });
  }

  async function load() {
    let items = null;
    try { items = await fromSupabase(); } catch { items = null; }
    if (!items) {
      const raw = (window.CATALOGO && Array.isArray(window.CATALOGO.produtos)) ? window.CATALOGO.produtos : await fromIndexedDB();
      if (window.CATALOGO && window.CATALOGO.whatsapp && !CFG.whatsapp) CFG.whatsapp = window.CATALOGO.whatsapp;
      // Somente peças disponíveis e somente campos públicos: nunca o preço de custo.
      items = raw.filter(p => (p.status || 'available') === 'available').map(p => ({
        id: p.id, code: p.code, name: p.name, type: p.type, material: p.material,
        description: p.description || '', sellPrice: Number(p.sellPrice) || 0, createdAt: p.createdAt || '', fotos: p.fotos || [],
      }));
    }
    products = items;
    try { bag = JSON.parse(localStorage.getItem(BAG_KEY) || '[]'); } catch { bag = []; }
    bag = bag.filter(id => products.some(p => p.id === id));
    saveBag();

    if (CFG.whatsapp) {
      const wa = `https://wa.me/${digits(CFG.whatsapp)}?text=${encodeURIComponent('Olá, Lau! Vim pela loja online.')}`;
      $('footContact').innerHTML = `<a href="${wa}" target="_blank" rel="noopener">Fale com a Lau no WhatsApp</a>`;
      Object.assign($('heroWhats'), { href: wa, target: '_blank', rel: 'noopener' });
      $('heroWhats').textContent = 'Fale com a Lau no WhatsApp';
    }
    renderTabs();
    renderGrid();
    renderBagCount();
    openFromHash();
  }

  // ---------- Vitrine ----------
  const ORDER = ['Brinco', 'Colar', 'Anel', 'Pulseira', 'Bracelete', 'Conjunto', 'Piercing'];
  const PLURAL = { Brinco: 'Brincos', Colar: 'Colares', Anel: 'Anéis', Pulseira: 'Pulseiras', Bracelete: 'Braceletes', Conjunto: 'Conjuntos', Piercing: 'Piercings' };

  function renderTabs() {
    const types = [...new Set(products.map(p => p.type))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    $('tabs').innerHTML = ['Todas', ...types].map(t =>
      `<button class="tab" data-type="${esc(t)}" aria-pressed="${view.type === t}">${t === 'Todas' ? 'Todas' : esc(PLURAL[t] || t)}</button>`).join('');
  }

  function list() {
    const q = norm(view.q);
    const l = products.filter(p => (view.type === 'Todas' || p.type === view.type) &&
      (!q || norm(p.name).includes(q) || norm(p.code).includes(q) || norm(p.description).includes(q)));
    const s = { recent: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)), 'price-asc': (a, b) => a.sellPrice - b.sellPrice, 'price-desc': (a, b) => b.sellPrice - a.sellPrice };
    return l.sort(s[view.sort]);
  }

  function inst(v) { return v >= 30 ? `ou ${PARC}x de ${money(v / PARC)} no cartão` : 'no Pix ou no cartão'; }

  // Peça cadastrada nos últimos 21 dias ganha o selo "Novo".
  const isNew = (p) => p.createdAt && (Date.now() - new Date(p.createdAt).getTime()) < 21 * 864e5;

  function renderCount(n) {
    const total = products.length;
    $('collectionCount').textContent = !total ? 'Novas peças em breve.'
      : n === total ? `${total} ${total === 1 ? 'peça disponível' : 'peças disponíveis'}. Cada uma é única.`
      : `${n} de ${total} peças`;
  }

  function renderGrid() {
    const l = list();
    renderCount(l.length);
    if (!products.length) {
      $('grid').innerHTML = `<div class="empty"><h3>A coleção está sendo fotografada</h3><p>As peças aparecem aqui em breve. Enquanto isso, fale com a Lau pelo WhatsApp para ver o que está disponível.</p></div>`;
      return;
    }
    if (!l.length) {
      $('grid').innerHTML = `<div class="empty"><h3>Nenhuma peça com esse nome</h3><p>Tente buscar pelo tipo da peça ou pelo código que aparece na etiqueta.</p></div>`;
      return;
    }
    $('grid').innerHTML = l.map(p => {
      const has = bag.includes(p.id);
      return `<article class="piece">
        <div class="case">
          <button class="open" data-open="${esc(p.id)}" aria-label="Ver detalhes: ${esc(p.name)}"></button>
          ${photo(p)}
          ${isNew(p) ? '<span class="badge">Novo</span>' : ''}
          <button class="quick" data-add="${esc(p.id)}" aria-pressed="${has}" aria-label="${has ? 'Tirar da sacola' : 'Pôr na sacola'}: ${esc(p.name)}">${has ? ICON_CHECK : ICON_PLUS}<span>${has ? 'Na sacola' : 'Pôr na sacola'}</span></button>
        </div>
        <div class="label">
          <h3><button data-open="${esc(p.id)}">${esc(p.name)}</button></h3>
          <p class="mat">${esc(p.material)}</p>
          <p class="price">${money(p.sellPrice)}</p>
          <p class="inst">${inst(p.sellPrice)}</p>
        </div>
      </article>`;
    }).join('');
  }

  // ---------- Detalhe ----------
  let lastFocus = null;
  function openDetail(id, i = 0) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const has = bag.includes(p.id);
    const fotos = p.fotos || [];
    $('detailCard').innerHTML = `
      <div class="gallery">
        <div class="main">${photo(p, i)}</div>
        ${fotos.length > 1 ? `<div class="thumbs">${fotos.map((f, k) => `<button data-thumb="${k}" data-id="${esc(p.id)}" aria-label="Foto ${k + 1}" aria-current="${k === i}"><img src="${esc(f)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="detail-info">
        <button class="x" data-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <span class="code">Código ${esc(p.code)}</span>
        <h2 id="detailTitle">${esc(p.name)}</h2>
        <span class="mat">${esc(p.type)} em ${esc(p.material)}</span>
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
        <span class="price">${money(p.sellPrice)}</span>
        <span class="inst">${inst(p.sellPrice)}</span>
        <button class="btn ${has ? 'ghost' : ''}" data-add="${esc(p.id)}">${has ? 'Tirar da sacola' : 'Pôr na sacola'}</button>
        <ul>
          <li>Peça única: depois de vendida, sai da vitrine.</li>
          <li>Entrega em ${esc(LOCAL.nome)} por ${money(LOCAL.taxa)} ou Correios para o Brasil todo.</li>
        </ul>
      </div>`;
    if (!$('detail').classList.contains('open')) lastFocus = document.activeElement;
    $('detail').classList.add('open');
    $('detail').setAttribute('aria-hidden', 'false');
    $('scrim').classList.add('open');
    history.replaceState(null, '', `#peca-${encodeURIComponent(p.code || p.id)}`);
    $('detailCard').querySelector('.x').focus();
  }

  function openFromHash() {
    const m = location.hash.match(/^#peca-(.+)$/);
    if (!m) return;
    const key = decodeURIComponent(m[1]);
    const p = products.find(x => x.code === key || x.id === key);
    if (p) openDetail(p.id);
  }

  // ---------- Sacola ----------
  function saveBag() { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); }
  function bagItems() { return bag.map(id => products.find(p => p.id === id)).filter(Boolean); }
  function subtotal() { return bagItems().reduce((s, p) => s + p.sellPrice, 0); }

  function toggle(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (bag.includes(id)) { bag = bag.filter(x => x !== id); toast(`${p.name} saiu da sacola`); }
    else { bag.push(id); toast(`${p.name} está na sacola`); }
    saveBag();
    checkout.opts = []; checkout.ship = null; // o frete depende dos itens
    renderGrid();
    renderBagCount();
    if ($('detail').classList.contains('open')) openDetail(id);
    if ($('sheet').classList.contains('open')) renderSheet();
  }

  function renderBagCount() {
    const n = bagItems().length;
    const el = $('bagCount');
    if (el.textContent !== String(n)) { el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 250); }
    el.textContent = n;
    if (n) el.removeAttribute('data-zero'); else el.setAttribute('data-zero', '');
  }

  function openSheet() {
    lastFocus = document.activeElement;
    closeDetail(false);
    checkout.step = 'bag';
    renderSheet();
    $('sheet').classList.add('open');
    $('sheet').setAttribute('aria-hidden', 'false');
    $('scrim').classList.add('open');
    $('sheet').querySelector('[data-close]').focus();
  }

  function setStep(step) {
    checkout.step = step;
    renderSheet();
    $('sheetBody').scrollTop = 0;
    const first = $('sheetBody').querySelector('input');
    if (first && step !== 'bag') first.focus();
  }

  function renderSteps() {
    const order = ['bag', 'ship', 'data'];
    const idx = order.indexOf(checkout.step);
    $('steps').hidden = checkout.step === 'bag' && !bagItems().length;
    [...$('steps').children].forEach((s, i) => { if (i <= idx) s.setAttribute('data-on', ''); else s.removeAttribute('data-on'); });
  }

  function summary() {
    const ship = checkout.ship;
    return `<div class="sum">
      <div class="muted"><span>Peças</span><span>${money(subtotal())}</span></div>
      ${ship ? `<div class="muted"><span>${esc(ship.nome)}</span><span>${shipPrice(ship)}</span></div>` : ''}
      <div class="tot"><span>Total</span><span>${money(subtotal() + (ship ? ship.preco : 0))}</span></div>
    </div>`;
  }

  function renderSheet() {
    renderSteps();
    const items = bagItems();
    const titles = { bag: 'Sua sacola', ship: 'Entrega', data: 'Seus dados' };
    $('sheetTitle').textContent = titles[checkout.step];

    if (!items.length) {
      $('sheetBody').innerHTML = `<div class="empty" style="padding:40px 0"><h3>A sacola está vazia</h3><p>Toque no + de uma peça para trazê-la para cá.</p></div>`;
      $('sheetFoot').innerHTML = `<button class="btn full ghost" data-close>Ver a coleção</button>`;
      return;
    }

    if (checkout.step === 'bag') {
      $('sheetBody').innerHTML = items.map(p => `
        <div class="line">
          <div class="th">${photo(p)}</div>
          <div><strong>${esc(p.name)}</strong><small>${esc(p.material)} · ${esc(p.code)}</small></div>
          <div class="r"><b>${money(p.sellPrice)}</b><button class="rm" data-add="${esc(p.id)}">Tirar</button></div>
        </div>`).join('');
      $('sheetFoot').innerHTML = `${summary()}<button class="btn full" data-step="ship">Escolher a entrega</button>`;
      return;
    }

    if (checkout.step === 'ship') {
      const a = checkout.addr;
      let optsHtml = '';
      if (checkout.loadingShip) optsHtml = `<p class="notice">Calculando o frete para o seu CEP…</p>`;
      else if (checkout.shipError) optsHtml = `<p class="notice warn">${esc(checkout.shipError)}</p>`;
      else if (checkout.opts.length) optsHtml = `<div class="opts" role="radiogroup" aria-label="Formas de entrega">${checkout.opts.map(o => `
        <label class="opt"><input type="radio" name="ship" value="${esc(o.id)}" ${checkout.ship && checkout.ship.id === o.id ? 'checked' : ''}>
          <span><b>${esc(o.nome)}</b><small>${esc(o.prazo)}</small></span><span class="v">${shipPrice(o)}</span></label>`).join('')}</div>`;

      $('sheetBody').innerHTML = `
        <div class="field">
          <label for="cep">CEP</label>
          <input id="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" value="${esc(fmtCep(checkout.cep))}">
          <p class="hint"><a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener">Não sei meu CEP</a></p>
        </div>
        ${optsHtml}
        ${a ? `
          <p class="group-title">Endereço de entrega</p>
          <div class="field"><label for="rua">Rua</label><input id="rua" autocomplete="address-line1" value="${esc(a.rua)}"></div>
          <div class="row3">
            <div class="field"><label for="numero">Número</label><input id="numero" inputmode="numeric" value="${esc(a.numero || '')}"></div>
            <div class="field"><label for="comp">Complemento</label><input id="comp" autocomplete="address-line2" placeholder="Opcional" value="${esc(a.complemento || '')}"></div>
          </div>
          <div class="field"><label for="bairro">Bairro</label><input id="bairro" value="${esc(a.bairro)}"></div>
          <p class="hint" style="margin-bottom:12px">${esc(a.cidade)} – ${esc(a.uf)}</p>` : ''}`;
      $('sheetFoot').innerHTML = `${summary()}
        <div class="row2"><button class="btn ghost" data-step="bag">Voltar</button><button class="btn" data-step="data" ${checkout.ship && a ? '' : 'disabled'}>Continuar</button></div>`;
      const cep = $('cep');
      cep.addEventListener('input', () => {
        let d = digits(cep.value).slice(0, 8);
        cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
        if (d.length === 8 && d !== checkout.cep) lookupCep(d);
      });
      ['rua', 'numero', 'comp', 'bairro'].forEach(k => {
        const el = $(k); if (!el) return;
        el.addEventListener('input', () => { const map = { comp: 'complemento' }; checkout.addr[map[k] || k] = el.value; });
      });
      return;
    }

    if (checkout.step === 'data') {
      $('sheetBody').innerHTML = `
        <div class="field"><label for="nome">Nome completo</label><input id="nome" autocomplete="name" value="${esc(cliente.nome || '')}"></div>
        <div class="field"><label for="whats">WhatsApp</label><input id="whats" type="tel" inputmode="tel" autocomplete="tel" placeholder="(31) 99999-9999" value="${esc(cliente.whatsapp || '')}">
          <p class="hint">A Lau usa esse número para combinar a entrega.</p></div>
        <div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" value="${esc(cliente.email || '')}">
          <p class="hint">Para o comprovante e o código de rastreio.</p></div>
        ${checkout.payError ? `<p class="notice warn" role="alert">${checkout.payError}</p>` : ''}
        <p class="hint">Ao continuar, você concorda com a <a href="privacidade.html" target="_blank">política de privacidade</a>. Usamos seus dados só para entregar o pedido.</p>`;
      const payLabel = online() ? `Pagar ${money(subtotal() + checkout.ship.preco)}` : 'Enviar pedido pelo WhatsApp';
      $('sheetFoot').innerHTML = `${summary()}
        <div class="row2"><button class="btn ghost" data-step="ship">Voltar</button><button class="btn" id="payBtn" ${checkout.paying ? 'disabled' : ''}>${checkout.paying ? 'Abrindo pagamento…' : payLabel}</button></div>
        <p class="fine">${online() ? `${ICON_LOCK}Pix ou cartão em até ${PARC}x, no ambiente seguro do Mercado Pago` : 'Prévia da loja: o pagamento online entra quando o servidor for configurado'}</p>`;
      ['nome', 'whats', 'email'].forEach(k => $(k).addEventListener('input', (e) => {
        cliente[k === 'whats' ? 'whatsapp' : k] = e.target.value;
        localStorage.setItem(FORM_KEY, JSON.stringify(cliente));
        e.target.removeAttribute('aria-invalid');
      }));
      $('payBtn').addEventListener('click', pay);
    }
  }

  // ---------- Frete ----------
  async function lookupCep(cep) {
    checkout.cep = cep; checkout.addr = null; checkout.opts = []; checkout.ship = null; checkout.shipError = ''; checkout.loadingShip = true;
    renderSheet();
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (d.erro) throw new Error('cep');
      checkout.addr = { rua: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade, uf: d.uf, numero: '', complemento: '' };
    } catch {
      checkout.loadingShip = false;
      checkout.shipError = 'Não encontramos esse CEP. Confira os números e digite de novo.';
      renderSheet(); return;
    }

    const isLocal = norm(checkout.addr.cidade) === norm(LOCAL.nome) && checkout.addr.uf === LOCAL.uf;
    if (isLocal) {
      checkout.opts = [{ id: 'local', nome: `Entrega da Lau em ${LOCAL.nome}`, prazo: 'Combinada pelo WhatsApp depois do pagamento', preco: LOCAL.taxa }];
    } else if (online()) {
      try {
        const r = await fetch(`${CFG.apiBase}/frete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cep, itens: bag }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.erro || 'frete');
        checkout.opts = d.opcoes;
        if (!checkout.opts.length) checkout.shipError = 'Os Correios não atendem esse CEP no momento. Fale com a Lau pelo WhatsApp para combinar outra forma.';
      } catch {
        checkout.shipError = 'Não conseguimos calcular o frete agora. Tente de novo em alguns minutos.';
      }
    } else {
      checkout.opts = [{ id: 'correios-combinar', nome: 'Correios', prazo: 'A Lau informa o valor e o prazo pelo WhatsApp', preco: 0, combinar: true }];
    }
    checkout.loadingShip = false;
    if (checkout.opts.length === 1) checkout.ship = checkout.opts[0];
    renderSheet();
    const n = $('numero'); if (n && !checkout.shipError) n.focus();
  }

  // ---------- Pagamento ----------
  function validate() {
    const bad = [];
    if (!cliente.nome || cliente.nome.trim().split(/\s+/).length < 2) bad.push(['nome', 'Escreva nome e sobrenome.']);
    if (digits(cliente.whatsapp).length < 10) bad.push(['whats', 'Informe o WhatsApp com DDD.']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email || '')) bad.push(['email', 'Confira o e-mail.']);
    if (!checkout.addr.rua || !checkout.addr.numero || !checkout.addr.bairro) bad.push(['endereco', 'Volte e complete rua, número e bairro.']);
    document.querySelectorAll('.field .err').forEach(e => e.remove());
    bad.forEach(([k, msg]) => {
      const el = $(k);
      if (!el) return;
      el.setAttribute('aria-invalid', 'true');
      el.insertAdjacentHTML('afterend', `<p class="err">${msg}</p>`);
    });
    if (bad.length) {
      const first = $(bad[0][0]);
      if (first) first.focus();
      else { checkout.payError = bad[0][1]; renderSheet(); }
    }
    return !bad.length;
  }

  function orderPayload() {
    return {
      itens: bag.slice(),
      cliente: { nome: cliente.nome.trim(), whatsapp: digits(cliente.whatsapp), email: cliente.email.trim() },
      entrega: { servico: checkout.ship.id, cep: checkout.cep, ...checkout.addr },
    };
  }

  function whatsappFallback() {
    const a = checkout.addr;
    const lines = [
      `Olá, Lau! Quero fazer um pedido na LauSemijoias:`,
      '',
      ...bagItems().map(p => `• ${p.code} · ${p.name} (${p.material}) · ${money(p.sellPrice)}`),
      '',
      `Entrega: ${checkout.ship.nome} (${shipPrice(checkout.ship)})`,
      `${a.rua}, ${a.numero}${a.complemento ? ` – ${a.complemento}` : ''} · ${a.bairro} · ${a.cidade}/${a.uf} · CEP ${fmtCep(checkout.cep)}`,
      `Total: ${money(subtotal() + checkout.ship.preco)}${checkout.ship.combinar ? ' + frete' : ''}`,
      '',
      `${cliente.nome} · ${cliente.email}`,
    ];
    return `https://wa.me/${digits(CFG.whatsapp)}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  async function pay() {
    checkout.payError = '';
    if (!validate()) return;
    if (!online()) {
      if (!CFG.whatsapp) { checkout.payError = 'O WhatsApp da loja ainda não foi configurado.'; renderSheet(); return; }
      window.open(whatsappFallback(), '_blank', 'noopener');
      return;
    }
    checkout.paying = true; renderSheet();
    try {
      const r = await fetch(`${CFG.apiBase}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload()) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 && Array.isArray(d.indisponiveis)) {
        // Alguém comprou a peça antes: tira da sacola e avisa.
        const gone = products.filter(p => d.indisponiveis.includes(p.id)).map(p => p.name);
        bag = bag.filter(id => !d.indisponiveis.includes(id));
        products = products.filter(p => !d.indisponiveis.includes(p.id));
        saveBag(); renderGrid(); renderBagCount();
        checkout.paying = false; checkout.step = 'bag';
        renderSheet();
        toast(`${gone.join(', ') || 'Uma peça'} acabou de ser vendida e saiu da sacola.`);
        return;
      }
      if (!r.ok || !d.pagamentoUrl) throw new Error(d.erro || 'Não foi possível abrir o pagamento.');
      localStorage.setItem('lauSemijoiasUltimoPedido', d.pedidoId);
      location.href = d.pagamentoUrl;
    } catch (e) {
      checkout.paying = false;
      checkout.payError = `${esc(e.message)} Tente de novo${CFG.whatsapp ? ` ou <a href="${whatsappFallback()}" target="_blank" rel="noopener">finalize pelo WhatsApp</a>` : ''}.`;
      renderSheet();
    }
  }

  // ---------- Geral ----------
  function closeDetail(restore = true) {
    if (!$('detail').classList.contains('open')) return;
    $('detail').classList.remove('open');
    $('detail').setAttribute('aria-hidden', 'true');
    history.replaceState(null, '', location.pathname + location.search);
    if (!$('sheet').classList.contains('open')) $('scrim').classList.remove('open');
    if (restore && lastFocus) lastFocus.focus();
  }
  function closeAll() {
    closeDetail(false);
    $('sheet').classList.remove('open');
    $('sheet').setAttribute('aria-hidden', 'true');
    $('scrim').classList.remove('open');
    if (lastFocus) lastFocus.focus();
  }

  let tt;
  function toast(msg) {
    $('toast').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => $('toast').classList.remove('show'), 2600);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-type],[data-add],[data-open],[data-close],[data-step],[data-thumb],input[name="ship"]');
    if (!t) return;
    if (t.dataset.type) { view.type = t.dataset.type; renderTabs(); renderGrid(); }
    else if (t.dataset.add) toggle(t.dataset.add);
    else if (t.dataset.open) openDetail(t.dataset.open);
    else if (t.dataset.thumb) openDetail(t.dataset.id, Number(t.dataset.thumb));
    else if (t.dataset.step) setStep(t.dataset.step);
    else if ('close' in t.dataset) closeAll();
    else if (t.name === 'ship') { checkout.ship = checkout.opts.find(o => o.id === t.value); renderSheet(); }
  });
  $('scrim').addEventListener('click', closeAll);
  $('detail').addEventListener('click', (e) => { if (e.target.id === 'detail') closeAll(); });
  $('openBag').addEventListener('click', openSheet);
  $('search').addEventListener('input', (e) => { view.q = e.target.value; renderGrid(); });
  $('sort').addEventListener('change', (e) => { view.sort = e.target.value; renderGrid(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  window.addEventListener('hashchange', openFromHash);

  load();
})();
