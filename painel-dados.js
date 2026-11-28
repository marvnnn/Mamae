/* LauSemijoias · camada de dados do painel.
 *
 * Dois modos com a mesma interface:
 *   - nuvem: Supabase (login, tabelas produtos/vendas/pedidos, fotos no bucket "fotos");
 *   - local: IndexedDB "LauSemiJoiasDB" deste navegador (o mesmo que a loja lê no modo prévia).
 *
 * Formato usado pela interface:
 *   produto = { id, codigo, nome, tipo, material, descricao, preco, custo, status, reservado_ate, fotos[], peso_g, criado_em }
 *     status: 'disponivel' | 'reservado' | 'vendido'
 *   venda = { id, origem, cliente, itens[{ produto_id, codigo, nome, tipo, preco, custo }], subtotal, desconto, total,
 *             pagamento, parcelas, criado_em }
 */
(function () {
  'use strict';

  const CFG = window.LOJA_CONFIG || {};
  const TIPOS = [
    { label: 'Brinco', prefixo: 'B' }, { label: 'Colar', prefixo: 'C' }, { label: 'Anel', prefixo: 'A' },
    { label: 'Pulseira', prefixo: 'P' }, { label: 'Conjunto', prefixo: 'S' }, { label: 'Bracelete', prefixo: 'T' },
    { label: 'Piercing', prefixo: 'G' },
  ];
  const MATERIAIS = ['Prata 925', 'Prata 925 - R', 'Semi Joia'];
  const PAGAMENTOS = ['Pix', 'Dinheiro', 'Débito', 'Crédito'];

  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  function proximoCodigo(tipo, codigosUsados) {
    const t = TIPOS.find(x => x.label === tipo);
    if (!t) return '';
    let max = 0;
    for (const c of codigosUsados) {
      const m = new RegExp(`^${t.prefixo}(\\d+)$`).exec(String(c || '').toUpperCase());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return t.prefixo + String(max + 1).padStart(2, '0');
  }

  // Reduz a foto no aparelho antes de guardar ou enviar.
  async function reduzirFoto(file, lado, qualidade) {
    const bmp = await createImageBitmap(file).catch(() => null);
    let img = bmp;
    if (!img) {
      img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('Não foi possível ler a foto.'));
        i.src = URL.createObjectURL(file);
      });
    }
    const w = img.width, h = img.height;
    const k = Math.min(1, lado / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    if (bmp && bmp.close) bmp.close();
    return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Não foi possível preparar a foto.')), 'image/jpeg', qualidade));
  }

  const blobParaDataUrl = (b) => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b);
  });

  /* ------------------------------------------------------------------ */
  /* Modo local (IndexedDB)                                              */
  /* ------------------------------------------------------------------ */

  const PG_LOCAL = { pix: 'Pix', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro' };
  const PG_LOCAL_INV = { 'Pix': 'pix', 'Débito': 'debit', 'Crédito': 'credit', 'Dinheiro': 'cash' };

  function criarLocal() {
    const DB = 'LauSemiJoiasDB';
    let dbp = null;
    const abrir = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res(r.result);
      r.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('jewelry')) db.createObjectStore('jewelry', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('sales')) db.createObjectStore('sales', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('deletedCodes')) db.createObjectStore('deletedCodes', { keyPath: 'id', autoIncrement: true });
      };
    }));
    const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    async function tx(stores, modo, fn) {
      const db = await abrir();
      return new Promise((res, rej) => {
        const t = db.transaction(stores, modo);
        let out;
        Promise.resolve(fn(t)).then(v => { out = v; }, e => { try { t.abort(); } catch {} rej(e); });
        t.oncomplete = () => res(out);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error || new Error('Operação cancelada.'));
      });
    }

    // Registro antigo do painel (inglês) <-> formato da interface.
    const deJoia = (j) => ({
      id: j.id, codigo: j.code || '', nome: j.name || '', tipo: j.type || '', material: j.material || '',
      descricao: j.description || '', preco: num(j.sellPrice), custo: num(j.costPrice),
      status: j.status === 'sold' ? 'vendido' : 'disponivel', reservado_ate: null,
      fotos: Array.isArray(j.fotos) ? j.fotos : [], peso_g: num(j.peso_g) || 30, criado_em: j.createdAt || '',
    });
    const paraJoia = (p) => ({
      id: p.id, code: p.codigo, name: p.nome, type: p.tipo, material: p.material, description: p.descricao || '',
      sellPrice: num(p.preco), costPrice: num(p.custo), status: p.status === 'vendido' ? 'sold' : 'available',
      fotos: p.fotos || [], peso_g: num(p.peso_g) || 30, createdAt: p.criado_em || new Date().toISOString(),
    });
    const deVenda = (s) => ({
      id: s.id, origem: 'balcao', cliente: s.customer || '',
      itens: (s.items || []).map(i => ({ produto_id: i.id, codigo: i.code || '', nome: i.name || '', tipo: i.type || '', preco: num(i.sellPrice), custo: num(i.costPrice) })),
      subtotal: num(s.subtotal != null ? s.subtotal : s.total), desconto: num(s.discount), total: num(s.total),
      pagamento: PG_LOCAL[s.paymentMethod] || 'Pix', parcelas: num(s.installments) || 1, criado_em: s.date,
    });

    return {
      modo: 'local',
      async sessao() { return { email: '' }; },
      async listarProdutos() {
        const rows = await tx('jewelry', 'readonly', t => req(t.objectStore('jewelry').getAll()));
        return rows.map(deJoia).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
      },
      async listarVendas() {
        const rows = await tx('sales', 'readonly', t => req(t.objectStore('sales').getAll()));
        return rows.map(deVenda).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
      },
      async codigosUsados() {
        const [ps, vs] = await Promise.all([this.listarProdutos(), this.listarVendas()]);
        return [...ps.map(p => p.codigo), ...vs.flatMap(v => v.itens.map(i => i.codigo))];
      },
      async salvarProduto(p) {
        const novo = p.novo || !p.id;
        const { novo: _n, ...resto } = p;
        const item = { ...resto, id: p.id || Date.now().toString(), criado_em: p.criado_em || new Date().toISOString() };
        const usados = (await this.listarProdutos()).filter(x => x.id !== item.id).map(x => String(x.codigo).toUpperCase());
        if (!item.codigo) item.codigo = proximoCodigo(item.tipo, await this.codigosUsados());
        if (usados.includes(String(item.codigo).toUpperCase())) throw new Error(`Já existe uma peça com o código ${item.codigo}.`);
        await tx('jewelry', 'readwrite', t => req(t.objectStore('jewelry').put(paraJoia(item))));
        return item;
      },
      async excluirProduto(p) {
        await tx('jewelry', 'readwrite', t => req(t.objectStore('jewelry').delete(p.id)));
      },
      async enviarFoto(_produtoId, file) {
        return blobParaDataUrl(await reduzirFoto(file, 1000, 0.8));
      },
      async removerFoto() {},
      async vender({ ids, cliente, desconto, pagamento, parcelas }) {
        return tx(['jewelry', 'sales'], 'readwrite', async (t) => {
          const st = t.objectStore('jewelry');
          const joias = [];
          for (const id of [...new Set(ids)]) {
            const j = await req(st.get(id));
            if (!j || j.status === 'sold') throw new Error('Uma das peças já foi vendida. Atualize a lista.');
            joias.push(j);
          }
          const subtotal = joias.reduce((s, j) => s + num(j.sellPrice), 0);
          const desc = Math.min(Math.max(num(desconto), 0), subtotal);
          for (const j of joias) await req(st.put({ ...j, status: 'sold' }));
          const venda = {
            id: Date.now().toString(), date: new Date().toISOString(), customer: cliente || '',
            items: joias.map(j => ({ id: j.id, code: j.code, name: j.name, type: j.type, material: j.material, sellPrice: num(j.sellPrice), costPrice: num(j.costPrice) })),
            subtotal, discount: desc, discountType: 'fixed', total: subtotal - desc,
            paymentMethod: PG_LOCAL_INV[pagamento] || 'pix', installments: pagamento === 'Crédito' ? (num(parcelas) || 1) : 1,
          };
          await req(t.objectStore('sales').add(venda));
          return venda.id;
        });
      },
      async cancelarVenda(v) {
        return tx(['jewelry', 'sales'], 'readwrite', async (t) => {
          const st = t.objectStore('jewelry');
          for (const i of v.itens) {
            const j = i.produto_id && await req(st.get(i.produto_id));
            if (j) await req(st.put({ ...j, status: 'available' }));
          }
          await req(t.objectStore('sales').delete(v.id));
        });
      },
      async listarPedidos() { return []; },
      async exportar() {
        const [jewelry, sales, deletedCodes] = await Promise.all(['jewelry', 'sales', 'deletedCodes'].map(s => tx(s, 'readonly', t => req(t.objectStore(s).getAll()))));
        return { jewelry, sales, deletedCodes };
      },
      async importar(data) {
        return tx(['jewelry', 'sales', 'deletedCodes'], 'readwrite', async (t) => {
          for (const s of ['jewelry', 'sales', 'deletedCodes']) await req(t.objectStore(s).clear());
          for (const j of (data.jewelry || [])) await req(t.objectStore('jewelry').put(j));
          for (const s of (data.sales || [])) await req(t.objectStore('sales').put(s));
          return { produtos: (data.jewelry || []).length, vendas: (data.sales || []).length };
        });
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Modo nuvem (Supabase)                                               */
  /* ------------------------------------------------------------------ */

  function carregarSupabaseJs() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      // Versão fixa com verificação de integridade: se o arquivo do CDN for alterado, o navegador se recusa a rodar.
      // Para atualizar: troque a versão e recalcule o hash (sha384) do arquivo novo.
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/dist/umd/supabase.min.js';
      s.integrity = 'sha384-7i/4BYWz4Mn+lJfg2HWfEPfZQ7tmFKF3CTSKlXBpxWjNlLjcg+T6smpHG4gLmU1u';
      s.crossOrigin = 'anonymous';
      s.onload = res;
      s.onerror = () => rej(new Error('Sem conexão com o servidor. Confira a internet.'));
      document.head.appendChild(s);
    });
  }

  function erroAmigavel(e) {
    const m = String((e && (e.hint || e.message)) || e || '');
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(m)) return 'Confirme o e-mail pelo link que o Supabase enviou.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sem conexão com o servidor. Confira a internet.';
    if (/duplicate key.*codigo/i.test(m)) return 'Já existe uma peça com esse código. Escolha outro.';
    if (/violates foreign key/i.test(m)) return 'Esta peça faz parte de um pedido online e não pode ser excluída.';
    if (/sem permissão|permission denied|row-level security/i.test(m)) return 'Esta conta não tem permissão para isso.';
    return m || 'Algo deu errado. Tente de novo.';
  }

  async function criarNuvem() {
    await carregarSupabaseJs();
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const ok = async (p) => { const { data, error } = await p; if (error) throw new Error(erroAmigavel(error)); return data; };
    const mapProduto = (p) => ({ ...p, preco: num(p.preco), custo: num(p.custo), fotos: p.fotos || [] });
    const mapVenda = (v) => ({ ...v, subtotal: num(v.subtotal), desconto: num(v.desconto), total: num(v.total), itens: (v.itens || []).map(i => ({ ...i, preco: num(i.preco), custo: num(i.custo) })) });
    const caminhoFoto = (url) => { const i = String(url).indexOf('/object/public/fotos/'); return i < 0 ? null : decodeURIComponent(url.slice(i + 21)); };

    return {
      modo: 'nuvem',
      sb,
      async sessao() {
        const { data } = await sb.auth.getSession();
        if (!data.session) return null;
        const admins = await ok(sb.from('admins').select('user_id').eq('user_id', data.session.user.id));
        return { email: data.session.user.email, admin: admins.length > 0 };
      },
      async entrar(email, senha) { await ok(sb.auth.signInWithPassword({ email, password: senha })); return this.sessao(); },
      async sair() { await sb.auth.signOut(); },
      async lembrarSenha(email) {
        await ok(sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
      },
      async novaSenha(senha) { await ok(sb.auth.updateUser({ password: senha })); },
      aoMudarLogin(fn) { sb.auth.onAuthStateChange((ev) => fn(ev)); },

      async listarProdutos() {
        return (await ok(sb.from('produtos').select('*').order('criado_em', { ascending: false }))).map(mapProduto);
      },
      async listarVendas() {
        return (await ok(sb.from('vendas').select('*').order('criado_em', { ascending: false }))).map(mapVenda);
      },
      async codigosUsados() {
        return (await ok(sb.from('produtos').select('codigo'))).map(r => r.codigo);
      },
      async salvarProduto(p) {
        const campos = {
          codigo: p.codigo, nome: p.nome, tipo: p.tipo, material: p.material, descricao: p.descricao || '',
          preco: num(p.preco), custo: num(p.custo), fotos: p.fotos || [], peso_g: Math.max(1, Math.round(num(p.peso_g) || 30)),
        };
        if (p.id && !p.novo) {
          const [r] = await ok(sb.from('produtos').update({ ...campos, atualizado_em: new Date().toISOString() }).eq('id', p.id).select());
          return mapProduto(r);
        }
        if (p.codigo) {
          const [r] = await ok(sb.from('produtos').insert({ ...campos, id: p.id || undefined }).select());
          return mapProduto(r);
        }
        // Sem código informado: maior do tipo + 1. Se outra tela pegou o mesmo código ao mesmo tempo, tenta o próximo.
        for (let tentativa = 0; tentativa < 4; tentativa++) {
          const codigo = proximoCodigo(p.tipo, await this.codigosUsados());
          const { data, error } = await sb.from('produtos').insert({ ...campos, id: p.id || undefined, codigo }).select();
          if (!error) return mapProduto(data[0]);
          if (!/duplicate key.*codigo/i.test(error.message)) throw new Error(erroAmigavel(error));
        }
        throw new Error('Não foi possível gerar o código. Tente de novo.');
      },
      async excluirProduto(p) {
        await ok(sb.from('produtos').delete().eq('id', p.id));
        const paths = (p.fotos || []).map(caminhoFoto).filter(Boolean);
        if (paths.length) await sb.storage.from('fotos').remove(paths);
      },
      async enviarFoto(produtoId, file) {
        const blob = await reduzirFoto(file, 1600, 0.85);
        const path = `produtos/${produtoId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        await ok(sb.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }));
        return sb.storage.from('fotos').getPublicUrl(path).data.publicUrl;
      },
      async removerFoto(url) {
        const path = caminhoFoto(url);
        if (path) await sb.storage.from('fotos').remove([path]);
      },
      async vender({ ids, cliente, desconto, pagamento, parcelas }) {
        return ok(sb.rpc('vender_balcao', { p_ids: ids, p_cliente: cliente || '', p_desconto: num(desconto), p_pagamento: pagamento, p_parcelas: num(parcelas) || 1 }));
      },
      async cancelarVenda(v) { await ok(sb.rpc('cancelar_venda_balcao', { p_venda: v.id })); },

      async listarPedidos() {
        const rows = await ok(sb.from('pedidos').select('*, pedido_itens(*)').order('numero', { ascending: false }).limit(300));
        return rows.map(r => ({ ...r, subtotal: num(r.subtotal), frete: num(r.frete), total: num(r.total), itens: (r.pedido_itens || []).map(i => ({ ...i, preco: num(i.preco) })) }));
      },
      async atualizarPedido(id, campos) {
        const [r] = await ok(sb.from('pedidos').update(campos).eq('id', id).select());
        return r;
      },

      async exportar() {
        const [produtos, vendas, pedidos] = await Promise.all([this.listarProdutos(), this.listarVendas(), this.listarPedidos()]);
        return { versao: 2, exportadoEm: new Date().toISOString(), produtos, vendas, pedidos };
      },
      // Importa o backup do painel antigo (jewelry/sales) para o banco. Pula códigos que já existem.
      async importar(data) {
        const existentes = new Set(await this.codigosUsados());
        const idNovo = {};
        const linhas = [];
        for (const j of (data.jewelry || [])) {
          if (!j.code || existentes.has(j.code)) continue;
          const id = uid();
          idNovo[j.id] = id;
          linhas.push({
            id, codigo: j.code, nome: j.name || j.code, tipo: j.type || 'Brinco', material: j.material || 'Prata 925',
            descricao: j.description || '', preco: num(j.sellPrice), custo: num(j.costPrice),
            status: j.status === 'sold' ? 'vendido' : 'disponivel', fotos: [], peso_g: 30,
            criado_em: j.createdAt || new Date().toISOString(),
          });
          existentes.add(j.code);
        }
        for (let i = 0; i < linhas.length; i += 200) await ok(sb.from('produtos').insert(linhas.slice(i, i + 200)));
        const vendas = (data.sales || []).map(s => ({
          origem: 'balcao', cliente: s.customer || '',
          itens: (s.items || []).map(i => ({ produto_id: idNovo[i.id] || null, codigo: i.code || '', nome: i.name || '', tipo: i.type || '', preco: num(i.sellPrice), custo: num(i.costPrice) })),
          subtotal: num(s.subtotal != null ? s.subtotal : s.total), desconto: num(s.discount), total: num(s.total),
          pagamento: PG_LOCAL[s.paymentMethod] || 'Pix', parcelas: num(s.installments) || 1, criado_em: s.date || new Date().toISOString(),
        }));
        for (let i = 0; i < vendas.length; i += 200) await ok(sb.from('vendas').insert(vendas.slice(i, i + 200)));
        return { produtos: linhas.length, vendas: vendas.length };
      },
    };
  }

  const nuvemConfigurada = () => Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey);

  window.PainelDados = {
    TIPOS, MATERIAIS, PAGAMENTOS, proximoCodigo, erroAmigavel, nuvemConfigurada,
    async iniciar() { return nuvemConfigurada() ? criarNuvem() : criarLocal(); },
  };
})();
