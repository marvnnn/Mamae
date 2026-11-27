// Login simples, sem servidor: usado por index.html (login + painel) e loja.html (compras).
// IMPORTANTE: isto organiza o acesso, mas não é segurança de verdade. Tudo roda no navegador,
// então quem souber mexer no código consegue contornar. Os dados da loja ficam só no
// computador da administradora, por isso entrar como admin em outro aparelho mostra um painel vazio.
(function () {
  const SALT = 'lau-semijoias:';
  const ADMIN_USER = 'admin';
  // Senha padrão do admin: lau@2026 (troque em Configurações → Segurança).
  const DEFAULT_ADMIN_HASH = '8344d0fb6e14333627a8070de238d7c9aabf7500f4222cdcb2624e6dfbbe9e1c';
  const USERS_KEY = 'lauUsuarios';
  const ADMIN_HASH_KEY = 'lauAdminHash';
  const SESSION_KEY = 'lauSessao';

  async function hash(password) {
    if (!window.crypto || !crypto.subtle) throw new Error('Este navegador não permite login nesta página. Abra pelo Chrome, Edge ou Firefox.');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + password));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const normalize = (u) => String(u || '').trim().toLowerCase();
  const getUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; } };
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const adminHash = () => localStorage.getItem(ADMIN_HASH_KEY) || DEFAULT_ADMIN_HASH;

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); return s; }

  async function login(usuario, senha) {
    const u = normalize(usuario);
    if (!u || !senha) throw new Error('Preencha usuário e senha.');
    const h = await hash(senha);
    if (u === ADMIN_USER) {
      if (h !== adminHash()) throw new Error('Usuário ou senha incorretos.');
      return setSession({ role: 'admin', usuario: u, nome: 'Administradora' });
    }
    const user = getUsers().find(x => x.usuario === u);
    if (!user || user.hash !== h) throw new Error('Usuário ou senha incorretos.');
    return setSession({ role: 'cliente', usuario: u, nome: user.nome, whatsapp: user.whatsapp || '' });
  }

  async function register({ nome, usuario, whatsapp, senha }) {
    const u = normalize(usuario);
    if (!nome || !nome.trim()) throw new Error('Informe seu nome.');
    if (!/^[a-z0-9._@-]{3,}$/.test(u)) throw new Error('Usuário deve ter pelo menos 3 caracteres (letras, números, . _ - @).');
    if (!senha || senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
    const users = getUsers();
    if (u === ADMIN_USER || users.some(x => x.usuario === u)) throw new Error('Este usuário já existe. Escolha outro.');
    users.push({ usuario: u, nome: nome.trim(), whatsapp: (whatsapp || '').trim(), hash: await hash(senha), criadoEm: new Date().toISOString() });
    saveUsers(users);
    return login(u, senha);
  }

  async function changeAdminPassword(atual, nova) {
    if ((await hash(atual)) !== adminHash()) throw new Error('Senha atual incorreta.');
    if (!nova || nova.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    localStorage.setItem(ADMIN_HASH_KEY, await hash(nova));
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.href = 'index.html';
  }

  // Redireciona para a tela de login se a pessoa não tiver um dos papéis permitidos.
  function requireRole(roles) {
    const s = getSession();
    if (!s || !roles.includes(s.role)) { location.replace('index.html'); return null; }
    return s;
  }

  window.Auth = { login, register, logout, getSession, requireRole, changeAdminPassword };
})();
