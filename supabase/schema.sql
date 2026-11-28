-- LauSemijoias · banco de dados (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez, num projeto novo.
--
-- Regras de segurança:
--   * O público (chave anon) só enxerga a view "vitrine": peças disponíveis e sem preço de custo.
--   * Só quem está na tabela "admins" (a Lau) lê e altera produtos, pedidos e vendas pelo painel.
--   * Reservar peças, confirmar pagamento e liberar pedido são funções que só o servidor (service_role) executa.

create extension if not exists pgcrypto;

-- ---------- Administradoras ----------
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table admins enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create policy "admin vê admins" on admins for select using (is_admin());

-- ---------- Produtos ----------
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo text not null,
  material text not null,
  descricao text not null default '',
  preco numeric(10, 2) not null check (preco >= 0),
  custo numeric(10, 2) not null default 0 check (custo >= 0),
  status text not null default 'disponivel' check (status in ('disponivel', 'reservado', 'vendido')),
  reservado_ate timestamptz,
  fotos text[] not null default '{}',
  peso_g integer not null default 30 check (peso_g > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table produtos enable row level security;
create policy "admin gerencia produtos" on produtos for all using (is_admin()) with check (is_admin());

-- Vitrine pública: roda com os direitos do dono da view, por isso expõe só estas colunas.
-- Uma reserva vencida (cliente desistiu do Pix) volta a aparecer sozinha.
create or replace view vitrine as
  select id, codigo, nome, tipo, material, descricao, preco, fotos, criado_em
  from produtos
  where status = 'disponivel' or (status = 'reservado' and reservado_ate < now());
revoke all on vitrine from anon, authenticated;
grant select on vitrine to anon, authenticated;

-- ---------- Pedidos online ----------
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado', 'problema')),
  cliente_nome text not null,
  cliente_whatsapp text not null,
  cliente_email text not null,
  entrega jsonb not null,               -- { servico, nome, prazo, cep, rua, numero, complemento, bairro, cidade, uf }
  subtotal numeric(10, 2) not null,
  frete numeric(10, 2) not null,
  total numeric(10, 2) not null,
  mp_preference_id text,
  mp_payment_id text,
  mp_status text,
  rastreio text,
  observacao text,
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  expira_em timestamptz not null
);
alter table pedidos enable row level security;
create policy "admin gerencia pedidos" on pedidos for all using (is_admin()) with check (is_admin());

create table if not exists pedido_itens (
  pedido_id uuid not null references pedidos (id) on delete cascade,
  produto_id uuid not null references produtos (id),
  codigo text not null,
  nome text not null,
  preco numeric(10, 2) not null,
  primary key (pedido_id, produto_id)
);
alter table pedido_itens enable row level security;
create policy "admin gerencia itens" on pedido_itens for all using (is_admin()) with check (is_admin());

-- ---------- Vendas presenciais (painel) ----------
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'balcao' check (origem in ('balcao', 'online')),
  pedido_id uuid references pedidos (id),
  cliente text not null default '',
  itens jsonb not null,                  -- [{ produto_id, codigo, nome, preco, custo }]
  subtotal numeric(10, 2) not null,
  desconto numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  pagamento text not null,
  parcelas integer not null default 1,
  criado_em timestamptz not null default now()
);
alter table vendas enable row level security;
create policy "admin gerencia vendas" on vendas for all using (is_admin()) with check (is_admin());

-- ---------- Funções do servidor ----------

-- Reserva todas as peças ou nenhuma. Devolve os ids que não estão disponíveis (vazio = reservou).
create or replace function reservar_produtos(ids uuid[], minutos integer)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  faltando uuid[];
begin
  perform 1 from produtos where id = any(ids) for update;
  select coalesce(array_agg(i), '{}') into faltando
  from unnest(ids) as i
  where not exists (
    select 1 from produtos p
    where p.id = i and (p.status = 'disponivel' or (p.status = 'reservado' and p.reservado_ate < now()))
  );
  if array_length(faltando, 1) > 0 then
    return faltando;
  end if;
  update produtos set status = 'reservado', reservado_ate = now() + make_interval(mins => minutos), atualizado_em = now()
  where id = any(ids);
  return '{}';
end $$;

-- Marca o pedido como pago e as peças como vendidas. Se alguma peça já foi vendida por outro caminho
-- (reserva venceu e alguém comprou no balcão), o pedido vai para "problema" para a Lau devolver o dinheiro.
create or replace function confirmar_pagamento(p_pedido uuid, p_payment text, p_status text)
returns text language plpgsql security definer set search_path = public as $$
declare
  ped pedidos;
  conflito integer;
begin
  select * into ped from pedidos where id = p_pedido for update;
  if not found then return 'nao_encontrado'; end if;
  if ped.status in ('pago', 'enviado', 'entregue') then return 'ja_pago'; end if;

  perform 1 from produtos where id in (select produto_id from pedido_itens where pedido_id = p_pedido) for update;
  select count(*) into conflito from produtos p
  join pedido_itens i on i.produto_id = p.id and i.pedido_id = p_pedido
  where p.status = 'vendido';

  if conflito > 0 then
    update pedidos set status = 'problema', mp_payment_id = p_payment, mp_status = p_status, pago_em = now(),
      observacao = 'Pago, mas uma ou mais peças já tinham sido vendidas. Devolver o valor pelo Mercado Pago ou combinar troca.'
    where id = p_pedido;
    return 'conflito';
  end if;

  update produtos set status = 'vendido', reservado_ate = null, atualizado_em = now()
  where id in (select produto_id from pedido_itens where pedido_id = p_pedido);
  update pedidos set status = 'pago', mp_payment_id = p_payment, mp_status = p_status, pago_em = now() where id = p_pedido;
  insert into vendas (origem, pedido_id, cliente, itens, subtotal, total, pagamento)
  select 'online', ped.id, ped.cliente_nome,
    (select jsonb_agg(jsonb_build_object('produto_id', p.id, 'codigo', p.codigo, 'nome', p.nome, 'tipo', p.tipo, 'preco', i.preco, 'custo', p.custo))
       from pedido_itens i join produtos p on p.id = i.produto_id where i.pedido_id = ped.id),
    ped.subtotal, ped.total, 'Mercado Pago';
  return 'ok';
end $$;

-- Cancela um pedido não pago e devolve as peças para a vitrine.
create or replace function liberar_pedido(p_pedido uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update pedidos set status = 'cancelado', mp_status = p_status
  where id = p_pedido and status = 'aguardando_pagamento';
  if found then
    update produtos set status = 'disponivel', reservado_ate = null, atualizado_em = now()
    where status = 'reservado' and id in (select produto_id from pedido_itens where pedido_id = p_pedido);
  end if;
end $$;

revoke execute on function reservar_produtos(uuid[], integer) from public, anon, authenticated;
revoke execute on function confirmar_pagamento(uuid, text, text) from public, anon, authenticated;
revoke execute on function liberar_pedido(uuid, text) from public, anon, authenticated;

-- ---------- Funções do painel (só a admin) ----------

-- Venda no balcão: confere, marca as peças como vendidas e registra a venda, tudo junto.
-- Peça reservada por um pagamento online em andamento não pode ser vendida.
create or replace function vender_balcao(p_ids uuid[], p_cliente text, p_desconto numeric, p_pagamento text, p_parcelas integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_ids uuid[];
  v_faltando integer;
  v_sub numeric;
  v_desc numeric;
  v_itens jsonb;
begin
  if not is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  select coalesce(array_agg(distinct i), '{}') into v_ids from unnest(p_ids) as i;
  if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'venda sem peças'; end if;
  if p_pagamento not in ('Pix', 'Dinheiro', 'Débito', 'Crédito') then raise exception 'forma de pagamento inválida'; end if;

  perform 1 from produtos where id = any(v_ids) for update;
  select count(*) into v_faltando from unnest(v_ids) as i
  where not exists (
    select 1 from produtos p
    where p.id = i and (p.status = 'disponivel' or (p.status = 'reservado' and p.reservado_ate < now()))
  );
  if v_faltando > 0 then
    raise exception 'indisponivel' using hint = 'Uma ou mais peças já foram vendidas ou estão reservadas num pagamento online.';
  end if;

  select sum(preco), jsonb_agg(jsonb_build_object('produto_id', id, 'codigo', codigo, 'nome', nome, 'tipo', tipo, 'preco', preco, 'custo', custo))
    into v_sub, v_itens
  from produtos where id = any(v_ids);
  v_desc := least(greatest(coalesce(p_desconto, 0), 0), v_sub);

  update produtos set status = 'vendido', reservado_ate = null, atualizado_em = now() where id = any(v_ids);
  insert into vendas (origem, cliente, itens, subtotal, desconto, total, pagamento, parcelas)
  values ('balcao', left(coalesce(p_cliente, ''), 120), v_itens, v_sub, v_desc, v_sub - v_desc, p_pagamento,
          case when p_pagamento = 'Crédito' then least(greatest(coalesce(p_parcelas, 1), 1), 12) else 1 end)
  returning id into v_id;
  return v_id;
end $$;

-- Desfaz uma venda de balcão lançada por engano: as peças voltam para a loja.
create or replace function cancelar_venda_balcao(p_venda uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v vendas;
begin
  if not is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into v from vendas where id = p_venda for update;
  if not found then raise exception 'venda não encontrada'; end if;
  if v.origem <> 'balcao' then raise exception 'vendas online são canceladas pelo Mercado Pago'; end if;
  update produtos set status = 'disponivel', atualizado_em = now()
  where status = 'vendido' and id in (select (x->>'produto_id')::uuid from jsonb_array_elements(v.itens) as x where x->>'produto_id' is not null);
  delete from vendas where id = p_venda;
end $$;

revoke execute on function vender_balcao(uuid[], text, numeric, text, integer) from public, anon;
revoke execute on function cancelar_venda_balcao(uuid) from public, anon;
grant execute on function vender_balcao(uuid[], text, numeric, text, integer) to authenticated;
grant execute on function cancelar_venda_balcao(uuid) to authenticated;

-- ---------- Fotos ----------
-- Bucket público para as fotos das peças; só a admin envia ou apaga.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
create policy "admin lista fotos" on storage.objects for select using (bucket_id = 'fotos' and is_admin());
create policy "admin envia fotos" on storage.objects for insert with check (bucket_id = 'fotos' and is_admin());
create policy "admin altera fotos" on storage.objects for update using (bucket_id = 'fotos' and is_admin());
create policy "admin apaga fotos" on storage.objects for delete using (bucket_id = 'fotos' and is_admin());

-- Depois de criar o usuário da Lau em Authentication → Users, rode (trocando o e-mail):
--   insert into admins (user_id) select id from auth.users where email = 'email-da-lau@exemplo.com';
