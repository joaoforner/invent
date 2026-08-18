-- Remove o movimento automático para equipe alternativa.
-- A mudança de equipe acontece somente pela aprovação manual do dashboard.

create or replace function public.handle_found_quantity_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_qty numeric;
  new_attempt integer;
begin
  -- Ignora atualizações reais sem mudança de valor.
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

  update public.team_item_assignments
     set attempts = new_attempt,
         found_quantity = new.found_quantity
   where id = new.id;

  -- Mantém a atribuição na equipe atual. Só resolve quando a quantidade está correta ou no limite da 4ª contagem.
  if (base_qty is not null and new.found_quantity = base_qty)
     or new_attempt >= 4 then
    update public.team_item_assignments
       set resolved = true,
           removed = false
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_found_quantity on public.team_item_assignments;

create trigger trg_handle_found_quantity
after update of found_quantity on public.team_item_assignments
for each row
when (old.found_quantity is distinct from new.found_quantity)
execute function public.handle_found_quantity_update();
