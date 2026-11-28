// Configuração pública da LauSemijoias. Nada aqui é secreto: chaves secretas ficam só no servidor (variáveis da Vercel).
window.LOJA_CONFIG = {
  // Pagamento pelo Mercado Pago e frete pelo Melhor Envio. Deixe false até configurar as variáveis na Vercel;
  // enquanto estiver false, a cliente monta a sacola e o pedido é finalizado pelo WhatsApp.
  pagamentoOnline: true,

  // Endereço das funções do servidor (pasta /api).
  apiBase: location.protocol === 'file:' ? '' : '/api',

  // Supabase. A chave "anon" é pública por definição; quem protege os dados são as regras (RLS) do banco.
  // Enquanto estiver vazio, a loja lê o catálogo do arquivo catalogo.js gerado pelo painel.
  supabaseUrl: 'https://cceathuoawrbxixstjor.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZWF0aHVvYXdyYnhpeHN0am9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU4MjcwNDEsImV4cCI6MjExMTQwMzA0MX0.70ezOdTzVlpMGqMttJXs4eIVt8QjnbiOvh7Q8rxFYbc',

  // WhatsApp da loja com DDI + DDD, só números (ex.: 5531999999999). Usado no rodapé e como plano B de finalização.
  whatsapp: '5531999431468',

  // Entrega local
  cidadeLocal: { nome: 'Brumadinho', uf: 'MG', taxa: 5 },

  parcelasMax: 6,
};
