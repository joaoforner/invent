-- Corrige a função que limpa atribuições durante a redistribuição.
-- O predicado explícito evita rejeição de DELETE sem cláusula WHERE em alguns ambientes.

create or replace function public.redistribute_master_items() returns void
language plpgsql
security definer
as $$
declare
  team_count integer;
begin
  -- Conta as equipes disponíveis para calcular a distribuição.
  select count(*) into team_count from public.teams;

  -- Sem equipes, remove todas as atribuições e encerra a função.
  if team_count = 0 then
    delete from public.team_item_assignments where id is not null;
    return;
  end if;

  -- Limpa as atribuições antigas antes de criar a nova distribuição.
  delete from public.team_item_assignments where id is not null;

  -- Numera equipes e itens para repartir os itens de forma equilibrada.
  with teams as (
    select id, row_number() over (order by id) as tnum from public.teams
  ),
  items as (
    select id, row_number() over (order by random()) as mnum from public.master_inventory_items
  )
  insert into public.team_item_assignments (master_item_id, team_id, found_quantity, attempts, resolved, removed, created_at)
  select i.id as master_item_id,
         t.id as team_id,
         null::numeric as found_quantity,
         0 as attempts,
         false as resolved,
         false as removed,
         now() as created_at
  from items i
  join teams t on (((i.mnum - 1) % team_count) + 1) = t.tnum;
end;
$$;

-- A função mantém o comportamento original e é executada pelo trigger de inclusão de equipe.
