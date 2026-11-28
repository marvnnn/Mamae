# LauSemijoias · loja online com pagamento

Data: 2026-11-27

## Intenção

A Lau vende semijoias e peças em prata 925 presencialmente em Brumadinho (MG). O objetivo é **expandir para vendas online com pagamento no site**, sem perder o controle do estoque que hoje é feito no painel (`painel.html`).

Sucesso = uma cliente de qualquer lugar do Brasil escolhe peças, paga com Pix ou cartão e a Lau recebe o pedido pronto para entregar, sem vender a mesma peça duas vezes (balcão e site).

## Decisões tomadas com o usuário

- **Site próprio**, não Shopify. Prioridade: custo fixo baixo e manter o painel da Lau.
- **Pagamento online** pelo Mercado Pago (Pix e cartão em até 6x).
- **Compra sem cadastro**: a cliente informa nome, WhatsApp, e-mail e endereço só no fim.
- **Entrega**: em Brumadinho a Lau entrega por **R$ 10**; outras cidades pelos **Correios**, com frete calculado pelo **Melhor Envio** (PAC e SEDEX).
- **Fotos**: a Lau vai fotografar as peças (a vitrine aceita várias fotos por peça).
- **Visual: preto e dourado, sempre.** Nome da loja: **LauSemijoias**.

## Abordagens consideradas

| Caminho | Prós | Contras | Decisão |
|---|---|---|---|
| Shopify | Pronto, seguro, POS para balcão | Mensalidade em dólar, aposenta o painel | Descartado pelo usuário |
| Nuvemshop | Brasileira, Pix/Correios nativos | Pouca personalização, sem integração direta | Não escolhido |
| **Site próprio + Supabase + Mercado Pago + Melhor Envio** | Custo quase zero, mantém o painel, controle total | Mais trabalho e manutenção por conta própria | **Escolhido** |

## Arquitetura

```
Cliente ──► index.html + loja.js (estático, Vercel)
              │  lê catálogo: view pública "vitrine" (Supabase, chave anon)
              │  CEP → ViaCEP (cidade) → entrega local ou /api/frete
              ▼
           /api/checkout  (Vercel, Node)
              │  recalcula preços e frete no servidor
              │  reserva as peças por 30 min (tudo ou nada)
              │  cria pedido + preferência do Mercado Pago
              ▼
           Mercado Pago (Pix/cartão) ──► /api/webhook-mercadopago
                                           │ confere assinatura, busca o pagamento na API
                                           │ aprovado → peças "vendido", pedido "pago", venda registrada
                                           ▼
           pedido.html ◄── /api/pedido (situação, sem dados pessoais)
```

### Segurança

- Cartão e Pix só no ambiente do Mercado Pago; o site nunca vê dados de pagamento.
- O navegador manda só ids das peças. Preço, frete e disponibilidade são recalculados no servidor.
- Pagamento só é confirmado pelo webhook, com assinatura `x-signature` validada e consulta à API do Mercado Pago.
- Banco com RLS: o público só lê a view `vitrine` (sem custo); produtos, pedidos e vendas só para usuários na tabela `admins`.
- Funções de reserva/confirmação só executáveis pela service role (servidor).
- Se uma reserva vence e a peça é vendida no balcão antes do Pix cair, o pedido vai para `problema` e o painel deve mostrar para a Lau devolver ou trocar.

## Estado atual (feito nesta etapa)

- `index.html` + `loja.js` + `loja-config.js`: vitrine nova (preto e dourado, Marcellus nos títulos + Figtree nos textos, escolhidas pelo usuário), detalhe da peça com galeria, sacola em 3 passos (sacola → entrega → dados), detecção de Brumadinho por CEP, validação, plano B pelo WhatsApp.
- **Modo prévia**: sem servidor configurado (`apiBase` vazio ou arquivo aberto direto), a loja lê o `catalogo.js` exportado pelo painel e finaliza o pedido pelo WhatsApp. Com o servidor, troca sozinha para pagamento online.
- `api/`: `frete`, `checkout`, `webhook-mercadopago`, `pedido`.
- `supabase/schema.sql`: tabelas, view pública, RLS, funções de reserva/confirmação, bucket de fotos.
- `pedido.html` (retorno do pagamento) e `privacidade.html` (LGPD).
- O painel antigo virou `painel.html`; a loja virou a página inicial (`index.html`).

## Próximas etapas (para o builder)

1. **Migrar o painel para o Supabase**: login real (Supabase Auth), CRUD de produtos na tabela `produtos`, upload de fotos no bucket `fotos`, vendas de balcão na tabela `vendas` (marcando a peça como `vendido`), importação do backup JSON atual.
2. **Aba "Pedidos online"** no painel: listar pedidos pagos/problema, marcar enviado com código de rastreio, marcar entregue.
3. Etiqueta do Melhor Envio pelo painel (opcional; pode ser feito no site do Melhor Envio no começo).
4. E-mail de confirmação para a cliente (Mercado Pago já envia o comprovante; e-mail próprio é opcional).
5. Contas e chaves: Supabase, Mercado Pago (credenciais de produção), Melhor Envio (token), Vercel, domínio `.com.br`.

## Decisões do builder (podem ser revistas)

- Reserva de 30 minutos durante o pagamento; boleto desativado (demora para compensar).
- Caixa padrão 16×11×4 cm, 30 g por peça + 120 g de embalagem; prazo dos Correios +1 dia útil para postagem.
- Parcelamento exibido como "6x de" (sem prometer "sem juros"; depende da configuração da conta Mercado Pago).
- Brumadinho identificado pelo nome da cidade no ViaCEP (os CEPs atuais da cidade são 32480–32499, não só 35460-000).
