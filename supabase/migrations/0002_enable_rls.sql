-- Ativa o Row Level Security (RLS) para controlar acesso à tabela de equipes.
alter table public.teams enable row level security;

-- Permite consultar equipes para os usuários públicos do app.
create policy "Allow read teams"
  on public.teams
  for select
  to public
  using (true);

-- Permite cadastrar equipes.
create policy "Allow insert teams"
  on public.teams
  for insert
  to public
  with check (true);

-- Permite alterar equipes.
create policy "Allow update teams"
  on public.teams
  for update
  to public
  using (true)
  with check (true);

-- Permite excluir equipes.
create policy "Allow delete teams"
  on public.teams
  for delete
  to public
  using (true);

-- Ativa RLS para a tabela legada de itens.
alter table public.inventory_items enable row level security;

-- Políticas públicas de leitura, inclusão, alteração e exclusão dos itens legados.
create policy "Allow read inventory_items"
  on public.inventory_items
  for select
  to public
  using (true);

create policy "Allow insert inventory_items"
  on public.inventory_items
  for insert
  to public
  with check (true);

create policy "Allow update inventory_items"
  on public.inventory_items
  for update
  to public
  using (true)
  with check (true);

create policy "Allow delete inventory_items"
  on public.inventory_items
  for delete
  to public
  using (true);
