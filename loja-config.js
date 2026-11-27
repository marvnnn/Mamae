// Configuração pública da LauSemijoias. Nada aqui é secreto: chaves secretas ficam só no servidor (variáveis da Vercel).
window.LOJA_CONFIG = {
  // Endereço das funções do servidor (pasta /api). Vazio = modo prévia: o pedido é finalizado pelo WhatsApp.
  apiBase: location.protocol === 'file:' ? '' : '/api',

  // Supabase. A chave "anon" é pública por definição; quem protege os dados são as regras (RLS) do banco.
  // Enquanto estiver vazio, a loja lê o catálogo do arquivo catalogo.js gerado pelo painel.
  supabaseUrl: '',
  supabaseAnonKey: '',

  // WhatsApp da loja com DDI + DDD, só números (ex.: 5531999999999). Usado no rodapé e como plano B de finalização.
  whatsapp: '',

  // Entrega local
  cidadeLocal: { nome: 'Brumadinho', uf: 'MG', taxa: 10 },

  parcelasMax: 6,
};
