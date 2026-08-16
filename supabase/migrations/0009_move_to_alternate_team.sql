-- Move o item para a equipe alternativa quando a quantidade estiver incorreta.
-- Execute esta migration depois da 0008 no mesmo projeto Supabase do aplicativo.

create or replace function public.handle_found_quantity_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_qty numeric;
  new_attempt integer;
  next_team_id bigint;
begin
  -- Processa somente alterações reais para uma quantidade informada.
  if new.found_quantity is null
     or old.found_quantity is not distinct from new.found_quantity then
    return new;
  end if;

  select base_quantity
    into base_qty
    from public.master_inventory_items
   where id = new.master_item_id;

  new_attempt := coalesce(old.attempts, 0) + 1;

  -- Registra a tentativa feita pela equipe atual.
  insert into public.team_item_counts (
    assignment_id,
    master_item_id,
    team_id,
    attempt_number,
    entered_quantity,
    base_quantity
  ) values (
    new.id,
    new.master_item_id,
    new.team_id,
    new_attempt,
    new.found_quantity,
    base_qty
  );

  -- Quantidade correta ou quarta tentativa: encerra o item na equipe atual.
  if (base_qty is not null and new.found_quantity = base_qty)
     or new_attempt >= 4 then
    update public.team_item_assignments
       set attempts = new_attempt,
           resolved = true
     where id = new.id;
    return new;
  end if;

  -- Busca a equipe alternativa configurada para a equipe que fez a contagem.
  select alt_team_id
    into next_team_id
    from public.teams
   where id = new.team_id;

  -- Fallback caso a equipe ainda não tenha uma alternativa configurada.
  if next_team_id is null or next_team_id = new.team_id then
    select id
      into next_team_id
      from public.teams
     where id <> new.team_id
     order by id
     limit 1;
  end if;

  -- Move o item e limpa a quantidade para a próxima equipe.
  update public.team_item_assignments
     set team_id = coalesce(next_team_id, new.team_id),
         attempts = new_attempt,
         found_quantity = null
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_handle_found_quantity on public.team_item_assignments;

create trigger trg_handle_found_quantity
after update of found_quantity on public.team_item_assignments
for each row
when (old.found_quantity is distinct from new.found_quantity)
execute function public.handle_found_quantity_update();
