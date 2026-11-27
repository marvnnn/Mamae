# LauSemijoias

Loja online e painel de gestão da LauSemijoias, de Brumadinho (MG): prata 925 e semijoias.

- **Loja** (`index.html`): vitrine para as clientes, com sacola, frete pelo CEP e pagamento pelo Mercado Pago (Pix ou cartão em até 6x).
- **Painel** (`painel.html`): cadastro de peças, estoque, vendas de balcão, dashboard e backup.

O design e as decisões do projeto estão em [`docs/superpowers/specs/2026-11-27-loja-online-design.md`](docs/superpowers/specs/2026-11-27-loja-online-design.md).

## Estrutura

| Arquivo | O que é |
|---|---|
| `index.html`, `loja.js`, `loja-config.js` | A loja. A configuração pública (Supabase, WhatsApp) fica em `loja-config.js`. |
| `pedido.html` | Página que a cliente vê depois de pagar (acompanha a situação do pedido). |
| `privacidade.html` | Política de privacidade (LGPD). |
| `img/` | Marca em vetor (`marca.svg`, `marca-icone.svg`, `favicon.svg`) e a imagem que aparece ao compartilhar o link (`compartilhar.jpg`). |
| `api/` | Funções do servidor (Vercel): frete, checkout, webhook do Mercado Pago e consulta de pedido. |
| `supabase/schema.sql` | Banco de dados: tabelas, regras de acesso e funções de reserva e confirmação. |
| `painel.html` | Painel da Lau (por enquanto salva no navegador, em IndexedDB). |
| `jewelry-app.jsx` | Versão antiga do painel em componente React. |

## Dois modos da loja

**Modo prévia (funciona hoje, sem servidor).** No painel, em **Configurações → Loja Online**, informe o WhatsApp e clique em **Gerar Catálogo da Loja**. Coloque o `catalogo.js` baixado ao lado do `index.html`. A cliente monta a sacola, informa CEP e endereço, e o pedido é enviado pronto para o WhatsApp da Lau.

**Modo online (pagamento no site).** Depois de configurar o Supabase, o Mercado Pago, o Melhor Envio e a Vercel (passo a passo abaixo), a loja passa a ler o estoque do banco e cobra pelo Mercado Pago.

## Rodar no computador

```bash
git clone https://github.com/marvnnn/Mamae.git
cd Mamae
python3 -m http.server 8000
```

Abra `http://localhost:8000` (loja) ou `http://localhost:8000/painel.html` (painel).
Use sempre o mesmo endereço: os dados do painel ficam salvos por endereço e por navegador.

## Colocar a loja no ar com pagamento

1. **Supabase** (supabase.com, plano grátis): crie um projeto e rode `supabase/schema.sql` no SQL Editor. Em Authentication → Users, crie o usuário da Lau e rode o `insert into admins …` do fim do arquivo.
2. **Mercado Pago** (mercadopago.com.br → Suas integrações): crie uma aplicação, pegue o *Access Token* de produção e, em Webhooks, cadastre `https://SEU-SITE/api/webhook-mercadopago` com o evento **Pagamentos**. Guarde a assinatura secreta.
3. **Melhor Envio** (melhorenvio.com.br): crie a conta e gere um token com permissão de cálculo de frete.
4. **Vercel** (vercel.com): importe este repositório do GitHub e configure as variáveis:

   | Variável | Valor |
   |---|---|
   | `SUPABASE_URL` | URL do projeto Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave *service_role* (secreta) |
   | `MP_ACCESS_TOKEN` | Access Token de produção do Mercado Pago |
   | `MP_WEBHOOK_SECRET` | assinatura secreta do webhook |
   | `MELHOR_ENVIO_TOKEN` | token do Melhor Envio |
   | `CEP_ORIGEM` | CEP de onde a Lau posta |
   | `CONTATO_EMAIL` | e-mail técnico (exigido pelo Melhor Envio) |
   | `SITE_URL` | endereço do site, sem barra no fim |

5. Em `loja-config.js`, preencha `supabaseUrl`, `supabaseAnonKey` (a chave *anon*, que é pública) e `whatsapp`.

> Nunca coloque a *service_role*, o Access Token ou os tokens em `loja-config.js` nem em nenhum arquivo do repositório. Eles ficam só nas variáveis da Vercel.

## Backup do painel

Enquanto o painel ainda salva no navegador, faça backup com frequência em **Configurações → Exportar Dados**. Esse arquivo também será usado para importar o estoque para o Supabase.
