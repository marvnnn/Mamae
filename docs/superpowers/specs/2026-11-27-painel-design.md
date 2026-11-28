# LauSemijoias · painel novo

Data: 2026-11-27. Continuação de `2026-11-27-loja-online-design.md` (próximas etapas 1 e 2).
O usuário pediu para seguir sem perguntas; as decisões abaixo são do builder e podem ser revistas.

## Intenção

A Lau usa o painel no balcão (provavelmente no celular) para cadastrar peças com foto, vender e acompanhar o mês.
Com a loja online, o painel precisa usar o **mesmo estoque** da loja, para uma peça não ser vendida duas vezes,
e mostrar os **pedidos online** para ela enviar.

## Decisões

- **Dois modos, a mesma tela.**
  - *No ar* (Supabase configurado em `loja-config.js`): login com e-mail e senha (Supabase Auth), dados nas tabelas
    `produtos`, `vendas` e `pedidos`, fotos no bucket `fotos`. Só quem está em `admins` entra.
  - *Neste navegador* (sem Supabase): continua no IndexedDB `LauSemiJoiasDB`, compatível com a loja em modo prévia.
- **Sem React nem Babel no navegador.** O painel antigo compilava JSX no celular a cada abertura. O novo é JS puro
  (`painel.js` + `painel-dados.js`), como a loja.
- **Venda no balcão é atômica no banco** (`vender_balcao`): confere se as peças estão à venda, marca como vendidas e
  registra a venda numa transação. Peça reservada por um pagamento online não pode ser vendida no balcão.
- **Venda pode ser desfeita** (`cancelar_venda_balcao`): as peças voltam para a loja.
- **Peças vendidas ficam no histórico** (situação "vendida") em vez de serem apagadas. **Códigos não são reaproveitados**:
  o próximo código é o maior do tipo + 1, para nunca confundir uma peça vendida com uma nova.
- **Fotos**: reduzidas no próprio aparelho (lado maior 1600 px, JPEG) antes de enviar. A primeira é a capa.
  No modo navegador ficam guardadas no IndexedDB (menores, 1000 px).
- **Pedidos online**: lista por situação; detalhe com peças, endereço, WhatsApp da cliente; ações "Marcar como enviado"
  (com código de rastreio) e "Marcar como entregue". Pedidos com problema aparecem primeiro.
- **Resumo do mês**: total vendido, peças, ticket médio, lucro (preço − custo), balcão × online, vendas por semana e por tipo.
- **Backup**: exportar continua; importar um backup do painel antigo **para o Supabase** (pula códigos que já existem).

## Fora do escopo agora

Etiqueta do Melhor Envio pelo painel, e-mail próprio para a cliente, mais de uma usuária com permissões diferentes.
