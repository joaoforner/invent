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
    if (button) button.addEventListener('click', () => showSection(section));
  });
  if (gotoTeam) gotoTeam.addEventListener('click', () => showSection('team'));
  if (gotoInventory) gotoInventory.addEventListener('click', () => showSection('inventory'));
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
  if (teamForm) {
    teamForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await createTeam();
    });
  }

  if (inventoryTeamForm) {
    inventoryTeamForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const teamId = Number(teamIdInput.value);
      await loadInventoryForTeam(teamId);
    });
  }

  if (itemForm) {
    itemForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await createItemForCurrentTeam();
    });
  }

  if (itemRegisterForm) {
    itemRegisterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await registerItemQuantity();
    });
  }
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
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, base_quantity, attempts, assigned_team_id, resolved, removed')
    .eq('assigned_team_id', teamId)
    .eq('removed', false)
    .order('id', { ascending: true });

  if (error) {
    inventoryMessage.textContent = 'Erro ao carregar itens.';
    return;
  }

  inventoryItems.innerHTML = '';
  if (!data || data.length === 0) {
    inventoryItems.innerHTML = '<p>Nenhum item disponível para essa equipe.</p>';
    inventoryListCard.classList.add('hidden');
    return;
  }

  inventoryListCard.classList.remove('hidden');
  data.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `
      <p><strong>Item:</strong> ${item.name}</p>
      <p><strong>Quantidade base:</strong> ${item.base_quantity}</p>
      <p><strong>Tentativas:</strong> ${item.attempts} / 4</p>
      <p><strong>Status:</strong> ${item.resolved ? 'Resolvido' : 'Aberto'}</p>
      <div class="actions">
        <button class="small-btn success" data-action="select" data-id="${item.id}">Selecionar</button>
        <button class="small-btn" data-action="edit" data-id="${item.id}">Editar</button>
      </div>
    `;
    card.querySelector('[data-action="select"]').addEventListener('click', () => selectItem(item));
    card.querySelector('[data-action="edit"]').addEventListener('click', () => renderItemEditForm(item, card));
    inventoryItems.appendChild(card);
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
  const name = itemNameInput.value.trim();
  const base_quantity = Number(itemBaseInput.value);
  if (!name || !base_quantity || base_quantity < 1) {
    inventoryMessage.textContent = 'Preencha nome e quantidade base válida.';
    return;
  }
  const { error } = await supabase.from('inventory_items').insert({
    team_id: state.currentTeam.id,
    assigned_team_id: state.currentTeam.id,
    name,
    base_quantity,
    attempts: 0,
    resolved: false,
    removed: false,
  });
  if (error) {
    inventoryMessage.textContent = 'Erro ao criar o item.';
    return;
  }
  itemNameInput.value = '';
  itemBaseInput.value = '';
  inventoryMessage.textContent = 'Item cadastrado.';
  await loadItemsForTeam(state.currentTeam.id);
}

function selectItem(item) {
  state.selectedItem = item;
  selectedItemInfo.innerHTML = `
    <p><strong>Item selecionado:</strong> ${item.name}</p>
    <p><strong>Quantidade base:</strong> ${item.base_quantity}</p>
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
  } else {
    const nextAttempts = item.attempts + 1;
    const shouldRemove = nextAttempts >= 4;
    const targetTeamId = shouldRemove ? item.assigned_team_id : state.currentTeam.alt_team_id || item.assigned_team_id;

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
