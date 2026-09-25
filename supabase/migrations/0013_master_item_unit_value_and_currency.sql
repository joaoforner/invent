-- Adiciona valor unitário e moeda nos materiais do inventário mestre.
alter table public.master_inventory_items
  add column if not exists unit_value numeric,
  add column if not exists currency text default 'BRL';

-- Expõe também esses campos na view de itens para conferência.
create or replace view public.view_items_for_team as
select a.id as assignment_id,
       a.team_id,
       m.id as master_item_id,
       m.descricao,
       m.material,
       m.base_quantity,
       m.umb,
       m.unit_value,
       m.currency,
       a.found_quantity,
       a.attempts,
       a.resolved,
       a.removed
from public.team_item_assignments a
join public.master_inventory_items m on m.id = a.master_item_id;
