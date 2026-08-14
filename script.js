import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qgsrmagejwxmsvpqckvu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ErzcEbUVmgapel5XRrrKAw_vpVzr_KH';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  currentTeam: null,
  selectedItem: null,
};

const sections = {
  home: document.getElementById('home-page'),
  team: document.getElementById('team-page'),
  inventory: document.getElementById('inventory-page'),
};

const navButtons = {
  home: document.getElementById('btn-home'),
  team: document.getElementById('btn-team'),
  inventory: document.getElementById('btn-inventory'),
};

const teamForm = document.getElementById('team-form');
const teamList = document.getElementById('team-list');
const teamMessage = document.getElementById('team-message');

const inventoryTeamForm = document.getElementById('inventory-team-form');
const inventoryTeamInfo = document.getElementById('inventory-team-info');
const inventoryMessage = document.getElementById('inventory-message');
const inventoryCreateCard = document.getElementById('inventory-create-card');
const inventoryListCard = document.getElementById('inventory-list-card');
const inventoryItems = document.getElementById('inventory-items');
const selectedItemCard = document.getElementById('selected-item-card');
const selectedItemInfo = document.getElementById('selected-item-info');
const registerMessage = document.getElementById('register-message');
const itemForm = document.getElementById('item-form');
const itemRegisterForm = document.getElementById('item-register-form');

const gotoTeam = document.getElementById('goto-team');
const gotoInventory = document.getElementById('goto-inventory');

const teamName1Input = document.getElementById('team-name1');
const teamName2Input = document.getElementById('team-name2');
const teamIdInput = document.getElementById('inventory-team-id');
const itemNameInput = document.getElementById('item-name');
const itemBaseInput = document.getElementById('item-base');
const itemFoundQtyInput = document.getElementById('item-found-qty');

async function init() {
  attachNavigation();
  attachForms();
  await loadTeams();
}

function attachNavigation() {
  const buttons = [
    { button: navButtons.home, section: 'home' },
    { button: navButtons.team, section: 'team' },
    { button: navButtons.inventory, section: 'inventory' },
  ];

  buttons.forEach(({ button, section }) => {
    button.addEventListener('click', () => showSection(section));
  });
  gotoTeam.addEventListener('click', () => showSection('team'));
  gotoInventory.addEventListener('click', () => showSection('inventory'));
}

function showSection(sectionKey) {
  Object.entries(sections).forEach(([key, element]) => {
    element.classList.toggle('active', key === sectionKey);
  });
  Object.entries(navButtons).forEach(([key, button]) => {
    button.classList.toggle('active', key === sectionKey);
  });
  if (sectionKey === 'team') {
    loadTeams();
  }
  if (sectionKey === 'inventory') {
    clearInventoryView();
  }
}

function attachForms() {
  teamForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await createTeam();
  });

  inventoryTeamForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const teamId = Number(teamIdInput.value);
    await loadInventoryForTeam(teamId);
  });

  itemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await createItemForCurrentTeam();
  });

  itemRegisterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await registerItemQuantity();
  });
}

async function loadTeams() {
  teamMessage.textContent = '';
  const { data, error } = await supabase
    .from('teams')
    .select('id, name1, name2, alt_team_id')
    .order('id', { ascending: true });

  if (error) {
        teamMessage.textContent = `Falha ao carregar equipes: ${error.message}`;
    return;
  }

  teamList.innerHTML = '';
  if (!data || data.length === 0) {
    teamList.innerHTML = '<p>Nenhuma equipe cadastrada ainda.</p>';
    return;
  }

  data.forEach((team) => {
    const card = document.createElement('article');
    card.className = 'team-card';
    card.innerHTML = `
      <p><strong>ID:</strong> ${team.id}</p>
      <p><strong>Equipe:</strong> ${team.name1} e ${team.name2}</p>
      <p><strong>Equipe alternativa:</strong> ${team.alt_team_id ?? 'Nenhuma'}</p>
      <div class="actions">
        <button class="small-btn success" data-action="edit" data-id="${team.id}">Editar</button>
        <button class="small-btn danger" data-action="delete" data-id="${team.id}">Excluir</button>
      </div>
    `;
    const editButton = card.querySelector('[data-action="edit"]');
    const deleteButton = card.querySelector('[data-action="delete"]');
    editButton.addEventListener('click', () => renderTeamEditForm(team, card));
    deleteButton.addEventListener('click', () => deleteTeam(team.id));
    teamList.appendChild(card);
  });
}

function renderTeamEditForm(team, container) {
  container.innerHTML = `
    <div class="form-grid">
      <label>
        Nome da primeira pessoa
        <input type="text" id="edit-name1-${team.id}" value="${team.name1}" />
      </label>
      <label>
        Nome da segunda pessoa
        <input type="text" id="edit-name2-${team.id}" value="${team.name2}" />
      </label>
      <div class="actions">
        <button class="small-btn success" id="save-team-${team.id}">Salvar</button>
        <button class="small-btn" id="cancel-team-${team.id}">Cancelar</button>
      </div>
    </div>
  `;
  container.querySelector(`#save-team-${team.id}`).addEventListener('click', async () => {
    const newName1 = container.querySelector(`#edit-name1-${team.id}`).value.trim();
    const newName2 = container.querySelector(`#edit-name2-${team.id}`).value.trim();
    await updateTeam(team.id, newName1, newName2);
  });
  container.querySelector(`#cancel-team-${team.id}`).addEventListener('click', () => loadTeams());
}

async function createTeam() {
  const name1 = teamName1Input.value.trim();
  const name2 = teamName2Input.value.trim();
  if (!name1 || !name2) {
    teamMessage.textContent = 'Preencha os dois nomes.';
    return;
  }

  const { data: existingTeams } = await supabase.from('teams').select('id');
  const otherTeamIds = existingTeams?.map((team) => team.id) ?? [];
  const alt_team_id = otherTeamIds.length ? otherTeamIds[Math.floor(Math.random() * otherTeamIds.length)] : null;

  const { error } = await supabase.from('teams').insert({ name1, name2, alt_team_id });
  if (error) {
    console.error('Erro ao cadastrar equipe:', error);
    teamMessage.textContent = `Erro ao cadastrar equipe: ${error.message}`;
    return;
  }

  teamName1Input.value = '';
  teamName2Input.value = '';
  teamMessage.textContent = 'Equipe cadastrada com sucesso.';
  await rebuildAltLinks();
  await loadTeams();
}

async function updateTeam(teamId, name1, name2) {
  if (!name1 || !name2) {
    teamMessage.textContent = 'Os nomes não podem ficar em branco.';
    return;
  }
  const { error } = await supabase.from('teams').update({ name1, name2 }).eq('id', teamId);
  if (error) {
    teamMessage.textContent = 'Erro ao atualizar a equipe.';
    return;
  }
  teamMessage.textContent = 'Equipe atualizada.';
  await loadTeams();
}

async function deleteTeam(teamId) {
  if (!confirm('Deseja realmente excluir esta equipe?')) {
    return;
  }
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) {
    teamMessage.textContent = 'Falha ao excluir equipe.';
    return;
  }
  const { error: invError } = await supabase.from('inventory_items').update({ removed: true }).eq('assigned_team_id', teamId);
  if (invError) {
    console.error('Erro ao marcar itens como removidos:', invError);
  }
  await rebuildAltLinks();
  teamMessage.textContent = 'Equipe excluída com sucesso.';
  await loadTeams();
}

async function rebuildAltLinks() {
  const { data: teams } = await supabase.from('teams').select('id');
  if (!teams || teams.length === 0) return;

  const updates = teams.map((team) => {
    const alternateOptions = teams.filter((other) => other.id !== team.id);
    const alt_team_id = alternateOptions.length
      ? alternateOptions[Math.floor(Math.random() * alternateOptions.length)].id
      : null;
    return { id: team.id, alt_team_id };
  });

  for (const item of updates) {
    const { error: updateErr } = await supabase.from('teams').update({ alt_team_id: item.alt_team_id }).eq('id', item.id);
    if (updateErr) {
      console.error('Erro ao atualizar alt_team_id para', item.id, updateErr);
    }
  }
}

async function loadInventoryForTeam(teamId) {
  inventoryMessage.textContent = '';
  registerMessage.textContent = '';
  state.currentTeam = null;
  state.selectedItem = null;
  selectedItemCard.classList.add('hidden');

  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('id, name1, name2, alt_team_id')
    .eq('id', teamId)
    .single();

  if (teamError || !teamData) {
    inventoryTeamInfo.textContent = 'Equipe não encontrada.';
    inventoryCreateCard.classList.add('hidden');
    inventoryListCard.classList.add('hidden');
    inventoryItems.innerHTML = '';
    return;
  }

  state.currentTeam = teamData;
  inventoryTeamInfo.innerHTML = `
    <p><strong>Equipe:</strong> ${teamData.name1} e ${teamData.name2}</p>
    <p><strong>ID da equipe:</strong> ${teamData.id}</p>
  `;
  inventoryCreateCard.classList.remove('hidden');
  await loadItemsForTeam(teamId);
}

async function loadItemsForTeam(teamId) {
  // Prefer the view that joins master items with assignments; fall back to inventory_items
  let data = null;
  let error = null;
  try {
    const viewResp = await supabase
      .from('view_items_for_team')
      .select('assignment_id, team_id, master_item_id, descricao, material, base_quantity, umb, found_quantity, attempts, resolved, removed')
      .eq('team_id', teamId);
    if (viewResp.error) throw viewResp.error;
    // Map view rows to the shape expected by the UI and mark source as assignment
    data = (viewResp.data || []).filter((r) => !r.removed).map((r) => ({
      id: r.assignment_id,
      name: r.descricao || r.material || `item-${r.master_item_id}`,
      base_quantity: r.base_quantity,
      attempts: r.attempts,
      assigned_team_id: r.team_id,
      resolved: r.resolved,
      removed: r.removed,
      master_item_id: r.master_item_id,
      _table: 'team_item_assignments',
    }));
    // If we have master_item_ids, fetch extra master fields in batch
    const masterIds = Array.from(new Set(data.map((i) => i.master_item_id).filter(Boolean)));
    if (masterIds.length) {
      const { data: masters, error: mastersErr } = await supabase
        .from('master_inventory_items')
        .select('id, material, pos_dpst, dep, desc_deposito')
        .in('id', masterIds);
      if (mastersErr) {
        console.error('Erro ao buscar master_inventory_items:', mastersErr);
      } else if (masters) {
        const masterMap = Object.fromEntries(masters.map((m) => [m.id, m]));
        data = data.map((i) => ({ ...i, ...(i.master_item_id ? masterMap[i.master_item_id] : {}) }));
      }
    }
  } catch (e) {
    // fallback to inventory_items table if view not present or fails
    const resp = await supabase
      .from('inventory_items')
      .select('id, name, base_quantity, attempts, assigned_team_id, resolved, removed')
      .eq('assigned_team_id', teamId)
      .eq('removed', false)
      .order('id', { ascending: true });
    data = resp.data;
    error = resp.error;
  }

  if (error) {
    inventoryMessage.textContent = 'Erro ao carregar itens.';
    console.error('loadItemsForTeam error:', error);
    return;
  }

  if (inventoryItems) inventoryItems.innerHTML = '';
  if (!data || data.length === 0) {
    if (inventoryItems) inventoryItems.innerHTML = '<p>Nenhum item disponível para essa equipe.</p>';
    inventoryListCard.classList.add('hidden');
    return;
  }

  inventoryListCard.classList.remove('hidden');
  // Render items without edit option; items come from master data and must be unique
  data.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `
      <p><strong>Descrição:</strong> ${item.material ?? '—'}</p>
      <p><strong>Item:</strong> ${item.name}</p>
      <p><strong>Prateleira:</strong> ${item.pos_dpst ?? '—'}</p>
      <p><strong>Depósito:</strong> ${item.dep ?? '—'}</p>
      <p><strong>Descrição do depósito:</strong> ${item.desc_deposito ?? '—'}</p>
      <p><strong>Tentativas:</strong> ${item.attempts} / 4</p>
      <p><strong>Status:</strong> ${item.resolved ? 'Resolvido' : 'Aberto'}</p>
      <div class="actions">
        <button class="small-btn success" data-action="select" data-id="${item.id}">Selecionar</button>
      </div>
    `;
    const selectBtn = card.querySelector('[data-action="select"]');
    if (selectBtn) selectBtn.addEventListener('click', () => selectItem(item));
    if (inventoryItems) inventoryItems.appendChild(card);
  });
}

function clearInventoryView() {
  inventoryTeamInfo.textContent = '';
  inventoryMessage.textContent = '';
  registerMessage.textContent = '';
  inventoryCreateCard.classList.add('hidden');
  inventoryListCard.classList.add('hidden');
  selectedItemCard.classList.add('hidden');
  inventoryItems.innerHTML = '';
  teamIdInput.value = '';
  itemNameInput.value = '';
  itemBaseInput.value = '';
  itemFoundQtyInput.value = '';
  state.currentTeam = null;
  state.selectedItem = null;
}

async function createItemForCurrentTeam() {
  if (!state.currentTeam) {
    inventoryMessage.textContent = 'Carregue uma equipe antes de criar itens.';
    return;
  }
  // Items now come from the Supabase master data (team_item_assignments/view).
  // Creation of items via UI is disabled to avoid duplicates.
  inventoryMessage.textContent = 'Itens são carregados do banco (master); criação manual desabilitada.';
  return;
}

function selectItem(item) {
  state.selectedItem = item;
  selectedItemInfo.innerHTML = `
    <p><strong>Item:</strong> ${item.name}</p>
    <p><strong>Código material:</strong> ${item.material ?? '—'}</p>
    <p><strong>Posição depósito:</strong> ${item.pos_dpst ?? '—'}</p>
    <p><strong>Departamento:</strong> ${item.dep ?? '—'}</p>
    <p><strong>Descrição depósito:</strong> ${item.desc_deposito ?? '—'}</p>
    <p><strong>Tentativas até agora:</strong> ${item.attempts}</p>
  `;
  itemFoundQtyInput.value = '';
  selectedItemCard.classList.remove('hidden');
  registerMessage.textContent = '';
}

function renderItemEditForm(item, container) {
  container.innerHTML = `
    <div class="form-grid">
      <label>
        Nome do item
        <input type="text" id="edit-item-name-${item.id}" value="${item.name}" />
      </label>
      <label>
        Quantidade base
        <input type="number" id="edit-item-base-${item.id}" value="${item.base_quantity}" min="1" />
      </label>
      <div class="actions">
        <button class="small-btn success" id="save-item-${item.id}">Salvar</button>
        <button class="small-btn" id="cancel-item-${item.id}">Cancelar</button>
      </div>
    </div>
  `;
  container.querySelector(`#save-item-${item.id}`).addEventListener('click', async () => {
    const newName = container.querySelector(`#edit-item-name-${item.id}`).value.trim();
    const newBase = Number(container.querySelector(`#edit-item-base-${item.id}`).value);
    await updateItem(item.id, newName, newBase);
  });
  container.querySelector(`#cancel-item-${item.id}`).addEventListener('click', async () => {
    if (state.currentTeam) {
      await loadItemsForTeam(state.currentTeam.id);
    }
  });
}

async function updateItem(itemId, name, base_quantity) {
  if (!name || !base_quantity || base_quantity < 1) {
    inventoryMessage.textContent = 'Nome e quantidade base devem ser válidos.';
    return;
  }
  const { error } = await supabase
    .from('inventory_items')
    .update({ name, base_quantity })
    .eq('id', itemId);
  if (error) {
    inventoryMessage.textContent = 'Erro ao atualizar item.';
    return;
  }
  inventoryMessage.textContent = 'Item atualizado.';
  if (state.currentTeam) {
    await loadItemsForTeam(state.currentTeam.id);
  }
}

async function registerItemQuantity() {
  if (!state.selectedItem || !state.currentTeam) {
    registerMessage.textContent = 'Selecione um item e equipe primeiro.';
    return;
  }
  const foundQuantity = Number(itemFoundQtyInput.value);
  if (Number.isNaN(foundQuantity)) {
    registerMessage.textContent = 'Informe uma quantidade válida.';
    return;
  }

  const item = state.selectedItem;
  if (foundQuantity === item.base_quantity) {
    if (item._table === 'team_item_assignments') {
      const { data: resolvedData, error: resolvedError } = await supabase
        .from('team_item_assignments')
        .update({ resolved: true })
        .eq('id', item.id);
      if (resolvedError) {
        console.error('Erro ao marcar assignment como resolvido:', resolvedError);
        registerMessage.textContent = 'Erro ao salvar a quantidade.';
        return;
      }
      console.log('Assignment marcado como resolvido:', resolvedData);
      registerMessage.textContent = 'Quantidade correta salva. Item resolvido.';
    } else {
      const { data: resolvedData, error: resolvedError } = await supabase
        .from('inventory_items')
        .update({ resolved: true })
        .eq('id', item.id);
      if (resolvedError) {
        console.error('Erro ao marcar item como resolvido:', resolvedError);
        registerMessage.textContent = 'Erro ao salvar a quantidade.';
        return;
      }
      console.log('Item marcado como resolvido:', resolvedData);
      registerMessage.textContent = 'Quantidade correta salva. Item resolvido.';
    }
  } else {
    const nextAttempts = item.attempts + 1;
    const shouldRemove = nextAttempts >= 4;
    const targetTeamId = shouldRemove ? item.assigned_team_id : state.currentTeam.alt_team_id || item.assigned_team_id;

    if (item._table === 'team_item_assignments') {
      // For assignments the team column is `team_id` and we update that
      const updatePayload = {
        attempts: nextAttempts,
        team_id: shouldRemove ? item.assigned_team_id : (state.currentTeam.alt_team_id || item.assigned_team_id),
        removed: shouldRemove,
      };
      const { data: updateData, error: updateErr } = await supabase.from('team_item_assignments').update(updatePayload).eq('id', item.id);
      if (updateErr) {
        console.error('Erro ao atualizar assignment após tentativa:', updateErr);
        registerMessage.textContent = 'Erro ao registrar tentativa.';
        return;
      }
      console.log('Assignment atualizado após tentativa:', updateData);
    } else {
      const updatePayload = {
        attempts: nextAttempts,
        assigned_team_id: targetTeamId,
        removed: shouldRemove,
      };
      const { data: updateData, error: updateErr } = await supabase.from('inventory_items').update(updatePayload).eq('id', item.id);
      if (updateErr) {
        console.error('Erro ao atualizar item após tentativa:', updateErr);
        registerMessage.textContent = 'Erro ao registrar tentativa.';
        return;
      }
      console.log('Item atualizado após tentativa:', updateData);
    }
    if (shouldRemove) {
      registerMessage.textContent = 'O item foi removido após 4 tentativas incorretas.';
    } else {
      registerMessage.textContent = `Quantidade incorreta. Item enviado para a equipe alternativa ${targetTeamId}.`;
    }
  }

  if (state.currentTeam) {
    await loadItemsForTeam(state.currentTeam.id);
    state.selectedItem = null;
    selectedItemCard.classList.add('hidden');
  }
}

init();
