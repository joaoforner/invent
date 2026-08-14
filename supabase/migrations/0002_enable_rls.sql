-- Enable Row Level Security for teams table
alter table public.teams enable row level security;

create policy "Allow read teams"
  on public.teams
  for select
  to public
  using (true);

create policy "Allow insert teams"
  on public.teams
  for insert
  to public
  with check (true);

create policy "Allow update teams"
  on public.teams
  for update
  to public
  using (true)
  with check (true);

create policy "Allow delete teams"
  on public.teams
  for delete
  to public
  using (true);

-- Enable Row Level Security for inventory_items table
alter table public.inventory_items enable row level security;

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
