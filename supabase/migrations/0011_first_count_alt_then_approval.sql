-- Primeira contagem incorreta vai para a equipe alternativa.
-- Segunda contagem incorreta fica na equipe atual e aguarda aprovação manual.
-- A decisão do usuário define se o item vai para a 3ª contagem ou é encerrado.

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
  if new.found_quantity is null
     or old.found_quantity is not distinct from new.found_quantity then
    return new;
  end if;

  select base_quantity
    into base_qty
    from public.master_inventory_items
   where id = new.master_item_id;

  new_attempt := coalesce(old.attempts, 0) + 1;

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

  if base_qty is not null and new.found_quantity = base_qty then
    update public.team_item_assignments
       set attempts = new_attempt,
           found_quantity = new.found_quantity,
           resolved = true,
           removed = false
     where id = new.id;
    return new;
  end if;

  if new_attempt >= 4 then
    update public.team_item_assignments
       set attempts = new_attempt,
           found_quantity = new.found_quantity,
           resolved = true,
           removed = false
     where id = new.id;
    return new;
  end if;

  -- Primeira contagem incorreta: envia para a equipe alternativa.
  if new_attempt = 1 then
    select alt_team_id
      into next_team_id
      from public.teams
     where id = new.team_id;

    if next_team_id is null or next_team_id = new.team_id then
      select id
        into next_team_id
        from public.teams
       where id <> new.team_id
       order by id
       limit 1;
    end if;

    update public.team_item_assignments
       set team_id = coalesce(next_team_id, new.team_id),
           attempts = new_attempt,
           found_quantity = null,
           resolved = false,
           removed = false
     where id = new.id;

    return new;
  end if;

  -- Segunda contagem incorreta: mantém o item na equipe atual e espera a decisão do usuário.
  update public.team_item_assignments
     set attempts = new_attempt,
         found_quantity = new.found_quantity,
         resolved = false,
         removed = false
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
