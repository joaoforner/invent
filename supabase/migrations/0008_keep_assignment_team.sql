-- Mantém o item na equipe atual ao registrar uma quantidade.
-- A equipe só muda quando o usuário carregar explicitamente outra equipe pelo ID.

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

  -- Guarda a contagem com a equipe que fez o registro.
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

  -- Atualiza somente a quantidade de tentativas.
  update public.team_item_assignments
     set attempts = new_attempt
   where id = new.id;

  -- Mantém o mesmo team_id; apenas encerra o item quando necessário.
  if (base_qty is not null and new.found_quantity = base_qty)
     or new_attempt >= 4 then
    update public.team_item_assignments
       set resolved = true
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
