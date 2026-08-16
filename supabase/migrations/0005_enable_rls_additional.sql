-- Ativa RLS nas tabelas do cadastro mestre, atribuições e histórico de contagens.

-- Políticas da tabela de materiais mestres.
alter table public.master_inventory_items enable row level security;

create policy "Allow read master_inventory_items"
  on public.master_inventory_items
  for select
  to public
  using (true);

create policy "Allow insert master_inventory_items"
  on public.master_inventory_items
  for insert
  to public
  with check (true);

create policy "Allow update master_inventory_items"
  on public.master_inventory_items
  for update
  to public
  using (true)
  with check (true);

create policy "Allow delete master_inventory_items"
  on public.master_inventory_items
  for delete
  to public
  using (true);

-- Políticas da tabela de atribuições atuais.
alter table public.team_item_assignments enable row level security;

create policy "Allow read team_item_assignments"
  on public.team_item_assignments
  for select
  to public
  using (true);

create policy "Allow insert team_item_assignments"
  on public.team_item_assignments
  for insert
  to public
  with check (true);

create policy "Allow update team_item_assignments"
  on public.team_item_assignments
  for update
  to public
  using (true)
  with check (true);

create policy "Allow delete team_item_assignments"
  on public.team_item_assignments
  for delete
  to public
  using (true);

-- Políticas da tabela de histórico de contagens.
alter table public.team_item_counts enable row level security;

create policy "Allow read team_item_counts"
  on public.team_item_counts
  for select
  to public
  using (true);

create policy "Allow insert team_item_counts"
  on public.team_item_counts
  for insert
  to public
  with check (true);

create policy "Allow update team_item_counts"
  on public.team_item_counts
  for update
  to public
  using (true)
  with check (true);

create policy "Allow delete team_item_counts"
  on public.team_item_counts
  for delete
  to public
  using (true);

-- Fim da migration de segurança das tabelas adicionais.
