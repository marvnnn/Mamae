# E-mail de confirmação do pedido — design

## Por quê
Quando a cliente paga, ela precisa de um comprovante com o **código do pedido** e **o que comprou**, para poder falar com a Lau caso algo dê errado ("meu pedido é o nº 12").

## O que é
- **Pagamento aprovado** → e-mail "Recebemos seu pedido nº X": peças (código, nome, preço), subtotal, frete, total, forma de entrega e endereço, link para acompanhar (`/pedido.html?id=…`) e botão "Falar com a Lau no WhatsApp" com a mensagem já preenchida com o número do pedido.
- **Pago, mas peça já vendida** (`confirmar_pagamento` devolve `conflito`) → e-mail diferente: pagamento recebido, uma peça não está mais disponível, a Lau vai entrar em contato para devolver o valor ou combinar troca; mesmo botão de WhatsApp com o código.
- O código do pedido é o `numero` que já existe (o mesmo que aparece em `pedido.html` e no painel).
- Visual preto e dourado da marca, HTML simples compatível com clientes de e-mail (tabelas, estilos inline), mais versão em texto puro.

## Não-objetivos
- E-mail quando o pedido é enviado (rastreio) ou entregue. Fica para depois.
- Aviso por e-mail para a Lau (ela já vê os pedidos no painel).
- Caixa de entrada no domínio.

## Abordagens consideradas
1. **Resend com domínio próprio** (escolhida): remetente `LauSemijoias <pedidos@lausemijoias.com.br>`, grátis até 3.000/mês, chamada HTTP simples (sem dependência npm), boa entrega com SPF/DKIM no domínio.
2. Gmail da Lau por SMTP: precisa de senha de app e de biblioteca SMTP, mais chance de spam. Descartada.

## Como
- Novo `api/_email.js`: monta o HTML/texto e envia via `POST https://api.resend.com/emails`.
- `api/webhook-mercadopago.js`: depois de `confirmar_pagamento`, se o resultado for `ok` ou `conflito`, busca o pedido com os itens e envia o e-mail correspondente. Como a função só devolve `ok`/`conflito` uma vez por pedido (as repetições do Mercado Pago devolvem `ja_pago`), o e-mail não duplica.
- Falha no envio **não** derruba o webhook: registra no log e responde 200 (senão o Mercado Pago repetiria e o e-mail se perderia do mesmo jeito, pois a confirmação já aconteceu).
- Variável na Vercel: só `RESEND_API_KEY` (segredo). O e-mail de respostas (`contatolausemi@gmail.com`, vai como Reply-To) e o WhatsApp da loja (`5531999431468`, o mesmo de `loja-config.js`) são públicos e ficam como constantes em `api/_lib.js`, como o CEP de origem.
- DNS no Registro.br: registros que o Resend pedir (DKIM em TXT, SPF/MX no subdomínio `send`), sem mexer nos registros do site.
- Sem `RESEND_API_KEY` configurada, o webhook segue funcionando igual e só pula o e-mail.

## Fica com quem constrói
Texto exato dos e-mails, layout, nome do remetente.
