-- Enable Row Level Security for master and assignment/count tables

-- master_inventory_items
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

-- team_item_assignments
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

-- team_item_counts
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

-- End of migration
