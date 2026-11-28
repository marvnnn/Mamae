# E-mail de confirmação do pedido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando o pagamento é aprovado, a cliente recebe por e-mail o código do pedido e o que comprou, com contato da Lau.

**Architecture:** Um módulo `api/_email.js` com funções puras que montam o e-mail (assunto, HTML, texto) a partir do pedido, mais `enviarEmail()` que chama a API HTTP do Resend. O webhook do Mercado Pago chama isso depois de `confirmar_pagamento` devolver `ok` ou `conflito`.

**Tech Stack:** Funções serverless da Vercel (Node 18+, CommonJS, `fetch` nativo), Supabase REST, Resend HTTP API. Sem dependências npm. Testes com `node:test` (embutido).

**Spec:** `docs/superpowers/specs/2026-11-28-email-confirmacao-design.md`

## Global Constraints

- Remetente: `LauSemijoias <pedidos@lausemijoias.com.br>`; Reply-To: `contatolausemi@gmail.com`.
- WhatsApp da loja: `5531999431468`. Link de acompanhamento: `${SITE_URL}/pedido.html?id=<uuid>`.
- Única variável nova: `RESEND_API_KEY`. Sem ela, o webhook funciona igual e pula o e-mail.
- Tema preto e dourado (fundo `#0b0b0b`, dourado `#c9a24a`), nome da marca "LauSemijoias" (uma palavra).
- Nenhuma dependência npm; nada de chave no repositório.
- Arquivos em `api/` que não são rota começam com `_`.

## Review Focus

- Nome da cliente ou da peça com `<`, `&`, aspas → escapado no HTML (sem quebrar o layout nem injetar).
- Falha do Resend (rede, 4xx/5xx) → webhook ainda responde 200 e o pedido fica confirmado; erro só no log.
- Repetição da notificação do Mercado Pago (`ja_pago`) → nenhum e-mail novo.
- Entrega local (sem rua/CEP no `entrega`) → bloco de endereço omitido, sem "undefined".
- Valores como string do Postgres (`"89.90"`) → formatados `R$ 89,90`.

---

### Task 1: Montagem do e-mail (`api/_email.js`)

**Files:**
- Create: `api/_email.js`
- Modify: `api/_lib.js` (constantes `LOJA_WHATSAPP = '5531999431468'`, `EMAIL_RESPOSTA = 'contatolausemi@gmail.com'`, `EMAIL_REMETENTE = 'LauSemijoias <pedidos@lausemijoias.com.br>'`, exportadas)
- Test: `api/_email.test.js`

**Interfaces:**
- Produces:
  - `montarEmail(pedido, tipo, siteUrl) -> { assunto: string, html: string, texto: string }` onde `tipo` é `'ok' | 'conflito'` e `pedido` é `{ id, numero, cliente_nome, subtotal, frete, total, entrega: { nome, rua?, numero?, complemento?, bairro?, cidade?, uf?, cep? }, pedido_itens: [{ codigo, nome, preco }] }`.
  - `enviarEmail({ para, assunto, html, texto }) -> Promise<void>`; lança erro se o Resend responder não-ok.

- [ ] **Step 1: Write the failing tests** (`node:test` + `assert`), com um pedido de exemplo nº 12, dois itens (`{codigo:'A1', nome:'Brinco <Lua>', preco:'89.90'}`, `{codigo:'B2', nome:'Anel', preco:120}`), frete `10`, total `219.9`, entrega local `{ nome: 'Entrega da Lau em Brumadinho' }`, `cliente_nome: 'Ana & Cia'`:
  - `ok`: `assunto` contém `pedido nº 12`; `html` contém `A1`, `Brinco &lt;Lua&gt;`, `R$ 89,90`, `R$ 219,90`, `Ana &amp; Cia`, `https://wa.me/5531999431468?text=` com a mensagem codificada contendo `12`, e `https://www.lausemijoias.com.br/pedido.html?id=<id>`; `html` não contém `undefined` nem `<Lua>`; `texto` contém `Pedido nº 12`, `A1`, `R$ 219,90`.
  - `conflito`: `assunto` e `html` mencionam que uma peça não está mais disponível e que a Lau vai entrar em contato; ainda contém `nº 12` e o link do WhatsApp.
  - Entrega com endereço (`rua:'Rua X', numero:'10', bairro:'Centro', cidade:'Belo Horizonte', uf:'MG', cep:'30110000'`) → `html` contém `Rua X, 10` e `30110-000`.
  - `enviarEmail` com `global.fetch` substituído: chama `https://api.resend.com/emails`, `Authorization: Bearer <RESEND_API_KEY>`, corpo com `from` = remetente, `reply_to` = `contatolausemi@gmail.com`, `to` = `[para]`; resposta 422 → rejeita.

- [ ] **Step 2: Run tests to verify they fail** — `node --test api/` → FAIL (módulo não existe).

- [ ] **Step 3: Implement `api/_email.js`** — HTML em tabelas com estilos inline (compatível com Gmail/Outlook), cabeçalho "LauSemijoias" em dourado sobre preto, botão do WhatsApp com texto `Olá, Lau! Meu pedido é o nº {numero}.`, rodapé com o e-mail de contato. Dinheiro com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` normalizando espaço não separável.

- [ ] **Step 4: Run tests** — `node --test api/` → PASS.

- [ ] **Step 5: Commit** — `git add api/_email.js api/_email.test.js api/_lib.js && git commit -m "E-mail de confirmação: montagem e envio pelo Resend"`

### Task 2: Envio no webhook

**Files:**
- Modify: `api/webhook-mercadopago.js` (bloco `if (pag.status === 'approved')`)
- Modify: `api/_lib.js` (comentário de variáveis: `RESEND_API_KEY`)
- Modify: `README.md` (linha `RESEND_API_KEY` na tabela de variáveis)
- Modify: `.vercelignore` (adicionar `api/*.test.js`)
- Test: `api/_email.test.js` (novo teste de `notificarCliente`)

**Interfaces:**
- Consumes: `montarEmail`, `enviarEmail` (Task 1); `db` de `_lib`.
- Produces: `notificarCliente(pedidoId, resultado) -> Promise<void>` em `api/_email.js`: só age se `resultado` for `'ok'` ou `'conflito'` e `RESEND_API_KEY` existir; busca `pedidos?id=eq.<id>&select=id,numero,cliente_nome,cliente_email,subtotal,frete,total,entrega,pedido_itens(codigo,nome,preco)`; envia para `cliente_email`. Nunca lança: captura e faz `console.error('email', e)`.

- [ ] **Step 1: Write the failing tests** — com `fetch` simulado: `resultado 'ja_pago'` → zero chamadas de fetch; sem `RESEND_API_KEY` → zero chamadas; Resend devolvendo 500 → promessa resolve (não rejeita); `'ok'` → uma chamada ao Supabase e uma ao Resend com `to: ['cliente@ex.com']`.
- [ ] **Step 2: Run** `node --test api/` → FAIL.
- [ ] **Step 3: Implement** `notificarCliente` e chame `await notificarCliente(pedido, resultado)` no webhook logo após o `rpc('confirmar_pagamento', …)`, antes do `send(res, 200, …)`.
- [ ] **Step 4: Run** `node --test api/` → PASS.
- [ ] **Step 5: Commit + push** — `git commit -m "Webhook envia e-mail de confirmação do pedido"` e `git push` (deploy automático na Vercel).

### Task 3: Configuração (Resend, DNS, Vercel) e teste real

Sem código; feito no navegador.

- [ ] **Step 1:** No Resend → Domains → adicionar `lausemijoias.com.br` (região São Paulo, se houver). Anotar os registros pedidos.
- [ ] **Step 2:** No Registro.br → DNS de `lausemijoias.com.br` → adicionar exatamente esses registros (sem alterar A/CNAME do site). Verificar com `dig +short TXT resend._domainkey.lausemijoias.com.br`.
- [ ] **Step 3:** No Resend → Verify; esperar status "Verified".
- [ ] **Step 4:** A dona da conta cola a `RESEND_API_KEY` na Vercel (Production, tipo Secret) e faz o redeploy.
- [ ] **Step 5:** Teste real: compra de uma peça barata (ou pedido de teste) → e-mail chega na caixa de entrada (não spam), com nº, peças, total e botão do WhatsApp funcionando; responder ao e-mail vai para `contatolausemi@gmail.com`.
