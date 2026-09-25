// Importa a biblioteca do Supabase para fazer requisições ao banco de dados
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

// URL e chave de acesso do banco de dados Supabase
const SUPABASE_URL = 'https://qgsrmagejwxmsvpqckvu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ErzcEbUVmgapel5XRrrKAw_vpVzr_KH';
// Cria cliente Supabase para comunicar com o banco de dados
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// O Supabase limita a quantidade de linhas retornadas por requisição (Max Rows do projeto,
// geralmente 1000). Sem paginação, planilhas grandes fazem itens "sumirem" silenciosamente
// (ficam de fora do resultado sem gerar nenhum erro). Esta função busca todas as páginas.
async function fetchAllRows(buildQuery, pageSize = 1000) {
  let from = 0;
  const allRows = [];

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) {
      return { data: allRows, error };
    }

    allRows.push(...(data || []));

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: allRows, error: null };
}

// Estado global do app: guarda a equipe atual e o item selecionado
const state = {
  currentTeam: null,  // Equipe carregada atualmente
  selectedItem: null, // Item do inventário selecionado para registrar quantidade
};

// Referências aos elementos HTML das seções (páginas) do app
const sections = {
  home: document.getElementById('home-page'),      // Página inicial
  team: document.getElementById('team-page'),      // Página de gerenciar equipes
  inventory: document.getElementById('inventory-page'), // Página de inventário
  dashboard: document.getElementById('dashboard-page'), // Página de dashboard
};

// Botões de navegação no menu
const navButtons = {
  home: document.getElementById('btn-home'),
  team: document.getElementById('btn-team'),
  inventory: document.getElementById('btn-inventory'),
  dashboard: document.getElementById('btn-dashboard'),
};

// Elementos de formulário e lista de equipes
const teamForm = document.getElementById('team-form');
const teamList = document.getElementById('team-list');
const teamMessage = document.getElementById('team-message');

// Elementos da seção de inventário (carregar equipe, listar itens, registrar quantidade)
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

// Botões de navegação rápida entre páginas
const gotoTeam = document.getElementById('goto-team');
const gotoInventory = document.getElementById('goto-inventory');
const gotoDashboard = document.getElementById('goto-dashboard');

// Elementos do dashboard
const dashboardMaterialTotal = document.getElementById('dashboard-material-total');
const dashboardTotalCounted = document.getElementById('dashboard-total-counted');
const dashboardTotalProgress = document.getElementById('dashboard-total-progress');
const dashboardTotalApproval = document.getElementById('dashboard-total-approval');
const dashboardTotalTeams = document.getElementById('dashboard-total-teams');
const dashboardItems = document.getElementById('dashboard-items');
const dashboardStageGroups = document.getElementById('dashboard-stage-groups');
const dashboardMessage = document.getElementById('dashboard-message');
const dashboardReleaseList = document.getElementById('dashboard-release-list');
const dashboardOverviewPanel = document.getElementById('dashboard-overview-panel');
const dashboardReleasePanel = document.getElementById('dashboard-release-panel');
const dashboardTabButtons = document.querySelectorAll('.dashboard-tab-btn');
const exportXlsxButton = document.getElementById('btn-export-xlsx');
const dashboardLoginForm = document.getElementById('dashboard-login-form');
const dashboardLoginMessage = document.getElementById('dashboard-login-message');
const dashboardLoginCard = document.getElementById('dashboard-login-card');
const dashboardContent = document.getElementById('dashboard-content');
const dashboardUsernameInput = document.getElementById('dashboard-username');
const dashboardPasswordInput = document.getElementById('dashboard-password');
const dashboardLogoutButton = document.getElementById('btn-dashboard-logout');
const dashboardUploadInput = document.getElementById('dashboard-upload-input');
const appConfirmModal = document.getElementById('app-confirm-modal');
const appConfirmTitle = document.getElementById('app-confirm-title');
const appConfirmMessage = document.getElementById('app-confirm-message');
const appConfirmOk = document.getElementById('app-confirm-ok');
const appConfirmCancel = document.getElementById('app-confirm-cancel');

// Campos de entrada de formulários
const teamName1Input = document.getElementById('team-name1');
const teamName2Input = document.getElementById('team-name2');
const teamIdInput = document.getElementById('inventory-team-id');
const itemNameInput = document.getElementById('item-name');
const itemBaseInput = document.getElementById('item-base');
const itemFoundQtyInput = document.getElementById('item-found-qty');

// Inicializa o app: configura navegação, formulários e carrega a lista de equipes
async function init() {
  closeConfirmModal();
  attachNavigation();
  attachForms();
  await loadTeams();
}

// Configura os listeners dos botões de navegação entre páginas
function attachNavigation() {
  const buttons = [
    { button: navButtons.home, section: 'home' },
    { button: navButtons.team, section: 'team' },
    { button: navButtons.inventory, section: 'inventory' },
    { button: navButtons.dashboard, section: 'dashboard' },
  ];

  // Adiciona clique nos botões do menu para trocar de página
  buttons.forEach(({ button, section }) => {
    button.addEventListener('click', () => showSection(section));
  });
  // Botões de atalho nas páginas home
  gotoTeam.addEventListener('click', () => showSection('team'));
  gotoInventory.addEventListener('click', () => showSection('inventory'));
  gotoDashboard.addEventListener('click', () => showSection('dashboard'));
}

// Mostra a seção (página) selecionada e esconde as outras
function showSection(sectionKey) {
  // Ativa/desativa classes CSS nas seções para mostrar/ocultar
  Object.entries(sections).forEach(([key, element]) => {
    element.classList.toggle('active', key === sectionKey);
  });
  // Marca o botão de navegação como ativo
  Object.entries(navButtons).forEach(([key, button]) => {
    button.classList.toggle('active', key === sectionKey);
  });
  // Se ir para equipe, recarrega a lista de equipes
  if (sectionKey === 'team') {
    loadTeams();
  }
  // Se ir para inventário, limpa os dados da equipe anterior
  if (sectionKey === 'inventory') {
    clearInventoryView();
  }
  if (sectionKey === 'dashboard') {
    if (dashboardContent) {
      const isLogged = !dashboardLoginCard?.classList.contains('hidden');
      if (!isLogged && dashboardContent && dashboardContent.classList.contains('hidden')) {
        if (dashboardLoginMessage) dashboardLoginMessage.textContent = '';
      }
    }
    if (dashboardContent && !dashboardContent.classList.contains('hidden')) {
      loadDashboard();
    }
  }
}

// Configura os listeners dos formulários do app
function attachForms() {
  // Formulário de criar equipe
  teamForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await createTeam();
  });

  // Formulário de carregar inventário de uma equipe
  inventoryTeamForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const teamId = Number(teamIdInput.value);
    await loadInventoryForTeam(teamId);
  });

  // Formulário de criar item (desabilitado)
  itemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await createItemForCurrentTeam();
  });

  // Formulário de registrar a quantidade encontrada de um item
  itemRegisterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await registerItemQuantity();
  });

  if (exportXlsxButton) {
    exportXlsxButton.addEventListener('click', exportDashboardToXlsx);
  }

  if (dashboardLoginForm) {
    dashboardLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loginToDashboard();
    });
  }

  if (dashboardLogoutButton) {
    dashboardLogoutButton.addEventListener('click', logoutFromDashboard);
  }

  if (dashboardUploadInput) {
    dashboardUploadInput.addEventListener('change', handleDashboardUpload);
  }

  if (itemFoundQtyInput) {
    itemFoundQtyInput.addEventListener('input', updateSelectedItemValuePreview);
  }

  if (appConfirmCancel) {
    appConfirmCancel.addEventListener('click', () => closeConfirmModal());
  }

  if (appConfirmModal) {
    appConfirmModal.addEventListener('click', (event) => {
      if (event.target === appConfirmModal) {
        closeConfirmModal();
      }
    });
  }

  dashboardTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setDashboardTab(button.dataset.dashboardTab);
    });
  });

  if (dashboardReleaseList) {
    dashboardReleaseList.addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const { action, assignmentId } = button.dataset;
      if (!action || !assignmentId) return;

      if (action === 'release-yes') {
        const target = dashboardReleaseList.querySelector(`[data-target-id="${assignmentId}"]`);
        if (target) target.classList.add('visible');
        const input = dashboardReleaseList.querySelector(`[data-team-input="${assignmentId}"]`);
        if (input) input.focus();
        return;
      }

      if (action === 'release-no') {
        showConfirmModal({
          title: 'Encerrar contagem',
          message: 'Deseja encerrar a contagem deste item e não liberá-lo para a próxima etapa?',
          confirmText: 'Encerrar',
          onConfirm: async () => {
            await finishDashboardRelease(assignmentId, false);
          }
        });
        return;
      }

      if (action === 'confirm-release') {
        const input = dashboardReleaseList.querySelector(`[data-team-input="${assignmentId}"]`);
        const teamId = Number(input?.value ?? NaN);
        if (!Number.isFinite(teamId) || teamId <= 0) {
          if (dashboardMessage) dashboardMessage.textContent = 'Informe um ID de equipe válido para liberar o item.';
          return;
        }
        await moveItemToTeam(assignmentId, teamId);
      }
    });
  }
}

function showConfirmModal({ title, message, confirmText = 'Confirmar', onConfirm }) {
  if (!appConfirmModal || !appConfirmTitle || !appConfirmMessage || !appConfirmOk) {
    return false;
  }

  appConfirmTitle.textContent = title;
  appConfirmMessage.textContent = message;
  appConfirmOk.textContent = confirmText;

  if (typeof onConfirm === 'function') {
    appConfirmOk.onclick = () => {
      closeConfirmModal();
      onConfirm();
    };
  } else {
    appConfirmOk.onclick = closeConfirmModal;
  }

  appConfirmModal.classList.remove('hidden');
  appConfirmModal.setAttribute('aria-hidden', 'false');
  return true;
}

function closeConfirmModal() {
  if (!appConfirmModal) return;
  appConfirmModal.classList.add('hidden');
  appConfirmModal.setAttribute('aria-hidden', 'true');
}

function normalizeHeaderKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/\uFEFF/g, '')
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

// Converte um valor de planilha em número, aceitando formato BR (1.234,56), US (1234.56)
// e valores combinados com texto (ex.: "90 PEC" -> 90).
function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).trim();
  if (!text) {
    return 0;
  }

  const numericMatch = text.match(/[-+]?\d[\d.,]*/);
  if (!numericMatch) {
    return 0;
  }

  let numericText = numericMatch[0];
  const hasComma = numericText.includes(',');
  const hasDot = numericText.includes('.');

  if (hasComma && hasDot) {
    const lastComma = numericText.lastIndexOf(',');
    const lastDot = numericText.lastIndexOf('.');
    const decimalIndex = Math.max(lastComma, lastDot);
    const integerPart = numericText.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = numericText.slice(decimalIndex + 1).replace(/[.,]/g, '');
    numericText = `${integerPart}.${decimalPart}`;
  } else if (hasComma) {
    numericText = numericText.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    // "18.500" (milhar) vira 18500; "18.5" (decimal) permanece 18.5.
    const parts = numericText.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      numericText = parts.join('');
    }
  }

  const result = Number(numericText);
  return Number.isFinite(result) ? result : 0;
}

// Extrai a unidade de medida de um valor combinado, ex.: "90 PEC" -> "PEC".
function parseUnitFromValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value).trim();
  if (!text) {
    return '';
  }

  const unitMatch = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ/°%]+$/);
  return unitMatch ? unitMatch[0].trim().toUpperCase() : '';
}

function normalizeCurrencyCode(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return 'BRL';

  const aliases = {
    BRL: 'BRL',
    REAL: 'BRL',
    REAIS: 'BRL',
    R$: 'BRL',
    'R$': 'BRL',
    USD: 'USD',
    US$: 'USD',
    'US$': 'USD',
    DOLAR: 'USD',
    DÓLAR: 'USD',
    EUR: 'EUR',
    EURO: 'EUR',
    '€': 'EUR',
  };

  return aliases[normalized] || aliases[normalized.replace(/\s+/g, '')] || normalized;
}

// Retorna o valor da primeira coluna encontrada entre os alias informados.
// Assume que `row` já teve suas chaves normalizadas por normalizeHeaderKey.
function pickBestAliasValue(row, rowKeys, primaryAliases, secondaryAliases = []) {
  const aliases = [...primaryAliases, ...secondaryAliases];

  for (const alias of aliases) {
    const value = row[normalizeHeaderKey(alias)];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  // Fallback: quando nenhuma coluna bate exatamente com os aliases (ex.: cabeçalho com
  // texto extra tipo "cod_base_quantity_sap" ou "umb_1" por causa de coluna duplicada),
  // procura uma coluna cuja chave normalizada contenha o alias (ou vice-versa).
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderKey(alias);
    if (normalizedAlias.length < 3) continue;

    for (const key of rowKeys) {
      if (key === normalizedAlias) continue;
      if (key.includes(normalizedAlias) || normalizedAlias.includes(key)) {
        const value = row[key];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return value;
        }
      }
    }
  }

  return null;
}

function isLikelyMaterialReference(value) {
  if (value === null || value === undefined) {
    return false;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return false;
  }

  const cleanValue = stringValue.replace(/\s+/g, '');
  return /^[-+]?\d[\d.,]*$/.test(cleanValue)
    || /^[A-Z0-9-]+$/.test(stringValue)
    || /^\d{6,}$/.test(cleanValue);
}

function extractDescriptionValue(row, rowKeys) {
  const aliasPriority = [
    'descricao',
    'description',
    'textodescricao',
    'descricaodoproduto',
    'descricaodomaterial',
    'descricaoitem',
    'descricaodoitem',
    'itemdescricao',
    'materialdescription',
    'desc',
    'nomeitem',
    'descricaoitemmaterial',
    'descricao_material',
    'descriptionmaterial',
    'descmaterial',
    'itemtext',
    'materiaprima',
    'descricaodoitemmaterial',
    'descricaoitemmat',
    'nome',
    'textobrevematerial',
    'textobreve',
    'shorttext',
  ];

  const aliasIndex = new Map(aliasPriority.map((alias, index) => [normalizeHeaderKey(alias), index]));
  const matches = [];

  for (const rowKey of rowKeys) {
    const normalizedKey = normalizeHeaderKey(rowKey);
    const aliasRank = aliasIndex.get(normalizedKey);
    if (aliasRank === undefined) {
      continue;
    }

    const value = row[rowKey];
    if (value === null || value === undefined || String(value).trim() === '') {
      continue;
    }

    const stringValue = String(value).trim();
    const isTextualDescription = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(stringValue)
      || /\s/.test(stringValue)
      || !/^[-+]?\d([\d.,]*\d)?$/.test(stringValue);

    if (!isTextualDescription || isLikelyMaterialReference(stringValue)) {
      if (normalizedKey.includes('material') && !normalizedKey.includes('descricao') && !normalizedKey.includes('description') && !normalizedKey.includes('textobreve') && !normalizedKey.includes('shorttext')) {
        continue;
      }
    }

    matches.push({
      aliasRank,
      value: stringValue,
      isTextualDescription,
    });
  }

  if (matches.length) {
    const textualMatches = matches.filter((entry) => entry.isTextualDescription);
    if (textualMatches.length) {
      textualMatches.sort((a, b) => a.aliasRank - b.aliasRank || a.value.localeCompare(b.value));
      return textualMatches[0].value;
    }

    matches.sort((a, b) => a.aliasRank - b.aliasRank || a.value.localeCompare(b.value));
    return matches[0].value;
  }

  return null;
}

function formatMoney(value, currency) {
  const amount = Number(value ?? 0);
  const code = normalizeCurrencyCode(currency);

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function updateSelectedItemValuePreview() {
  if (!state.selectedItem || !itemFoundQtyInput || !selectedItemInfo) {
    return;
  }

  const enteredQuantity = Number(itemFoundQtyInput.value ?? NaN);
  const unitValue = Number(state.selectedItem.unit_value ?? state.selectedItem.unitValue ?? 0);
  const currency = normalizeCurrencyCode(state.selectedItem.currency || 'BRL');

  const totalValueLine = selectedItemInfo.querySelector('[data-total-value]');
  if (!Number.isFinite(enteredQuantity) || enteredQuantity < 0 || !(unitValue > 0)) {
    if (totalValueLine) {
      totalValueLine.textContent = 'Valor total da quantidade: —';
    }
    return;
  }

  const totalValue = enteredQuantity * unitValue;
  if (totalValueLine) {
    totalValueLine.textContent = `Valor total da quantidade: ${formatMoney(totalValue, currency)}`;
  }
}

async function handleDashboardUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (!dashboardMessage) return;

  dashboardMessage.textContent = 'Importando materiais da planilha...';

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true, blankrows: false });

    if (!rows || rows.length === 0) {
      dashboardMessage.textContent = 'A planilha não contém linhas válidas para importar.';
      event.target.value = '';
      return;
    }

    // Ajuda a diagnosticar planilhas cujo cabeçalho não bate com os aliases esperados.
    console.log('[Importação] Colunas detectadas na planilha:', Object.keys(rows[0] || {}));

    const normalizedRows = rows
      .map((row) => {
        const normalized = {};
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = normalizeHeaderKey(key);
          // Preserva o primeiro valor não vazio quando duas colunas normalizam para a mesma chave
          // (ex.: cabeçalho duplicado gerado pelo SheetJS como "umb" e "umb_1").
          const existing = normalized[normalizedKey];
          if (existing === undefined || existing === null || String(existing).trim() === '') {
            normalized[normalizedKey] = value;
          }
        });
        return normalized;
      })
      .filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== ''));

    console.log('[Importação] Colunas normalizadas:', Object.keys(normalizedRows[0] || {}));

    const importedItems = normalizedRows
      .map((row) => {
        const rowKeys = Object.keys(row);

        const material = pickBestAliasValue(row, rowKeys,
          ['material', 'matnr', 'codigomaterial', 'codigoditem', 'codigoitem', 'codigodoproduto', 'codigomater', 'codigo', 'materialcode', 'itemcode', 'materialnumber', 'itemnumber'],
          ['materialcode', 'code', 'materialnum', 'materialid']
        );

        if (!material || !String(material).trim()) {
          return null;
        }

        const description = extractDescriptionValue(row, rowKeys) || pickBestAliasValue(row, rowKeys, ['descricao', 'description', 'desc', 'textobreve', 'shorttext']) || '';
        const normalizedDescription = String(description ?? '').trim();

        const baseQuantityRaw = pickBestAliasValue(row, rowKeys,
          // "Utilização livre" é o nome padrão SAP (MB52) para o estoque disponível/base.
          ['utilizacaolivre', 'utilizlivre', 'base_quantity', 'basequantity', 'quantidadebase', 'qtdbase', 'qtybase', 'quantity', 'qtde', 'stockquantity', 'qty', 'quantidade', 'baseqty', 'base'],
          ['utilizacaolivre', 'utilizlivre', 'estoquelivre', 'unrestricteduse', 'unrestrictedstock', 'freestock']
        );
        const umbRaw = pickBestAliasValue(row, rowKeys,
          ['umb', 'unidade', 'unidademedida', 'unidmedida', 'unit', 'uom', 'measure', 'unitofmeasure', 'medida', 'undmed'],
          ['umb', 'unidade', 'unidademedida', 'unidmedida', 'unit', 'uom', 'measure', 'unitofmeasure', 'medida', 'undmed']
        );

        const baseQuantity = parseNumericValue(baseQuantityRaw);
        // Quando a UMB não vem em coluna própria, ela costuma estar junto do número (ex.: "90 PEC").
        const umb = String(umbRaw ?? '').trim().toUpperCase() || parseUnitFromValue(baseQuantityRaw);

        const unitValue = parseNumericValue(
          pickBestAliasValue(row, rowKeys,
            ['unit_value', 'unitvalue', 'unitval', 'valorunitario', 'valor_unitario', 'unitprice', 'precounitario', 'valorunit', 'preco', 'unitpricebrl', 'unitpricevalue', 'valorunitarioitem'],
            ['unit_value', 'unitvalue', 'unitval', 'valorunitario', 'valor_unitario', 'unitprice', 'precounitario', 'valorunit', 'preco']
          )
        );

        const currency = normalizeCurrencyCode(
          pickBestAliasValue(row, rowKeys,
            ['currency', 'moeda', 'currencykey', 'divisa', 'moneda', 'curr', 'coin'],
            ['currency', 'moeda', 'currencykey', 'divisa', 'moneda', 'curr']
          ) ?? 'BRL'
        );

        const dep = pickBestAliasValue(row, rowKeys, ['dep', 'deposito', 'deposit', 'depo', 'warehouse'], ['dep', 'deposito', 'deposit', 'depo']) ?? '';
        const descDeposito = pickBestAliasValue(row, rowKeys, ['descdeposito', 'descricaododeposito', 'descricaodeposito', 'depositodescricao', 'descriptiondeposit', 'depositodesc'], ['desc_deposito', 'descdeposito', 'descricaododeposito', 'depositodescricao']) ?? '';
        const posDpst = pickBestAliasValue(row, rowKeys, ['posdpst', 'prateleira', 'position', 'storagebin', 'loc', 'bin', 'slot'], ['pos_dpst', 'prateleira', 'position', 'storagebin', 'loc']) ?? '';
        const planta = pickBestAliasValue(row, rowKeys, ['planta', 'plant'], ['planta', 'plant']) ?? '';
        const classe = pickBestAliasValue(row, rowKeys, ['classe', 'class', 'category'], ['classe', 'class', 'category']) ?? '';

        return {
          planta: String(planta ?? '').trim(),
          classe: String(classe ?? '').trim(),
          material: String(material).trim(),
          descricao: normalizedDescription || String(material).trim(),
          base_quantity: baseQuantity,
          umb: String(umb ?? '').trim(),
          pos_dpst: String(posDpst ?? '').trim(),
          dep: String(dep ?? '').trim(),
          desc_deposito: String(descDeposito ?? '').trim(),
          unit_value: Number(unitValue || 0),
          currency,
        };
      })
      .filter(Boolean);

    if (!importedItems.length) {
      dashboardMessage.textContent = 'Nenhum material válido foi encontrado na planilha.';
      event.target.value = '';
      return;
    }

    const { error: clearLegacyItemsError } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', 0);

    if (clearLegacyItemsError) {
      throw clearLegacyItemsError;
    }

    const { error: clearCountsError } = await supabase
      .from('team_item_counts')
      .delete()
      .neq('id', 0);

    if (clearCountsError) {
      throw clearCountsError;
    }

    const { error: clearAssignmentsError } = await supabase
      .from('team_item_assignments')
      .delete()
      .neq('id', 0);

    if (clearAssignmentsError) {
      throw clearAssignmentsError;
    }

    const { error: clearMasterError } = await supabase
      .from('master_inventory_items')
      .delete()
      .neq('id', 0);

    if (clearMasterError) {
      throw clearMasterError;
    }

    const { error: insertError } = await supabase
      .from('master_inventory_items')
      .insert(importedItems);

    if (insertError) {
      throw insertError;
    }

    const { data: teamRows, error: teamLoadError } = await supabase
      .from('teams')
      .select('id')
      .order('id', { ascending: true });

    if (teamLoadError) {
      throw teamLoadError;
    }

    const teamIds = (teamRows || []).map((team) => Number(team.id)).filter(Number.isFinite);

    if (teamIds.length === 0) {
      dashboardMessage.textContent = 'Planilha importada, mas não há equipes cadastradas para receber os itens.';
      event.target.value = '';
      return;
    }

    const { data: insertedItemsData, error: insertedItemsError } = await fetchAllRows((from, to) =>
      supabase
        .from('master_inventory_items')
        .select('id')
        .order('id', { ascending: true })
        .range(from, to)
    );

    if (insertedItemsError) {
      throw insertedItemsError;
    }

    const assignmentsToInsert = (insertedItemsData || []).map((item, index) => ({
      master_item_id: item.id,
      team_id: teamIds[index % teamIds.length],
      found_quantity: null,
      attempts: 0,
      resolved: false,
      removed: false,
    }));

    if (assignmentsToInsert.length) {
      const { error: assignmentInsertError } = await supabase
        .from('team_item_assignments')
        .insert(assignmentsToInsert);

      if (assignmentInsertError) {
        throw assignmentInsertError;
      }
    }

    try {
      const { error: redistributeError } = await supabase.rpc('redistribute_master_items');
      if (redistributeError) {
        console.warn('Função SQL de redistribuição indisponível; fallback em JavaScript ativado:', redistributeError);
      }
    } catch (error) {
      console.warn('Redistribuição via RPC falhou; fallback em JavaScript foi usado.', error);
    }

    dashboardMessage.textContent = `Planilha importada com ${importedItems.length} material(is). Os itens foram atualizados e redistribuídos para as equipes existentes.`;
    event.target.value = '';
    await loadDashboard();
    if (state.currentTeam) {
      await loadItemsForTeam(state.currentTeam.id);
    }
  } catch (error) {
    console.error('Erro ao importar a planilha:', error);
    dashboardMessage.textContent = `Não foi possível importar a planilha: ${error.message || 'erro desconhecido'}`;
    event.target.value = '';
  }
}

function setDashboardTab(tabName) {
  if (!dashboardOverviewPanel || !dashboardReleasePanel) return;

  const isOverview = tabName === 'overview';
  dashboardOverviewPanel.classList.toggle('hidden', !isOverview);
  dashboardReleasePanel.classList.toggle('hidden', isOverview);

  dashboardTabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.dashboardTab === tabName);
  });
}

function logoutFromDashboard() {
  if (dashboardLoginCard) dashboardLoginCard.classList.remove('hidden');
  if (dashboardContent) dashboardContent.classList.add('hidden');
  if (dashboardLoginMessage) dashboardLoginMessage.textContent = '';
  if (dashboardUsernameInput) dashboardUsernameInput.value = '';
  if (dashboardPasswordInput) dashboardPasswordInput.value = '';
  if (dashboardMessage) dashboardMessage.textContent = '';
}

function normalizeDashboardLoginValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/^[-\s]+/, '')
    .replace(/[-\s]+$/, '');
}

function loginToDashboard() {
  const username = normalizeDashboardLoginValue(
    dashboardUsernameInput ? dashboardUsernameInput.value : ''
  );
  const password = normalizeDashboardLoginValue(
    dashboardPasswordInput ? dashboardPasswordInput.value : ''
  );

  const validUsers = new Set(['admin', '--admin']);
  const validPassword = 'Brasilit2027';

  if (validUsers.has(username) && password === validPassword) {
    if (dashboardLoginCard) dashboardLoginCard.classList.add('hidden');
    if (dashboardContent) dashboardContent.classList.remove('hidden');
    if (dashboardLoginMessage) dashboardLoginMessage.textContent = '';
    if (dashboardUsernameInput) dashboardUsernameInput.value = '';
    if (dashboardPasswordInput) dashboardPasswordInput.value = '';
    if (dashboardMaterialTotal) dashboardMaterialTotal.textContent = '0';
    if (dashboardTotalCounted) dashboardTotalCounted.textContent = '0';
    if (dashboardTotalProgress) dashboardTotalProgress.textContent = '0';
    if (dashboardTotalApproval) dashboardTotalApproval.textContent = '0';
    if (dashboardTotalTeams) dashboardTotalTeams.textContent = '0';
    loadDashboard();
    return;
  }

  if (dashboardLoginMessage) {
    dashboardLoginMessage.textContent = 'Usuário ou senha inválidos.';
  }
}


async function exportDashboardToXlsx() {
  if (!dashboardMessage) {
    return;
  }

  dashboardMessage.textContent = 'Gerando arquivo Excel...';

  const { data: finalizedAssignments, error: assignmentsError } = await fetchAllRows((from, to) =>
    supabase
      .from('team_item_assignments')
      .select('id, master_item_id, team_id, attempts, resolved, removed')
      .eq('resolved', true)
      .eq('removed', false)
      .order('id', { ascending: true })
      .range(from, to)
  );

  if (assignmentsError) {
    console.error('Erro ao buscar itens finalizados para exportação:', assignmentsError);
    dashboardMessage.textContent = `Não foi possível exportar o Excel: ${assignmentsError.message}`;
    return;
  }

  if (!finalizedAssignments || finalizedAssignments.length === 0) {
    dashboardMessage.textContent = 'Ainda não há itens finalizados para exportar.';
    return;
  }

  const assignmentIds = finalizedAssignments.map((assignment) => assignment.id);
  const { data: counts, error: countsError } = await fetchAllRows((from, to) =>
    supabase
      .from('team_item_counts')
      .select('assignment_id, master_item_id, team_id, attempt_number, entered_quantity, base_quantity, created_at')
      .in('assignment_id', assignmentIds)
      .order('attempt_number', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  if (countsError) {
    console.error('Erro ao buscar histórico das contagens para exportação:', countsError);
    dashboardMessage.textContent = `Não foi possível exportar o Excel: ${countsError.message}`;
    return;
  }

  const masterIds = [...new Set((finalizedAssignments || []).map((assignment) => assignment.master_item_id).filter(Boolean))];
  let masterItems = [];

  if (masterIds.length) {
    const { data: itemsData, error: itemsError } = await fetchAllRows((from, to) =>
      supabase
        .from('master_inventory_items')
        .select('id, planta, classe, material, descricao, base_quantity, umb, pos_dpst, dep, desc_deposito')
        .in('id', masterIds)
        .range(from, to)
    );

    if (itemsError) {
      console.error('Erro ao buscar itens do Excel:', itemsError);
    } else {
      masterItems = itemsData || [];
    }
  }

  const masterMap = Object.fromEntries(masterItems.map((item) => [item.id, item]));
  const countsByAssignment = new Map();

  (counts || []).forEach((count) => {
    const assignmentId = Number(count.assignment_id);
    const existing = countsByAssignment.get(assignmentId) || [];
    existing.push(count);
    countsByAssignment.set(assignmentId, existing);
  });

  const rows = finalizedAssignments.map((assignment, index) => {
    const item = masterMap[assignment.master_item_id] || {};
    const assignmentCounts = countsByAssignment.get(Number(assignment.id)) || [];
    const countMap = Object.fromEntries(
      assignmentCounts.map((count) => [Number(count.attempt_number ?? 0), Number(count.entered_quantity ?? 0)])
    );

    const firstCount = countMap[1] ?? '';
    const secondCount = countMap[2] ?? '';
    const thirdCount = countMap[3] ?? '';
    const fourthCount = countMap[4] ?? '';

    const needsSecond = Object.prototype.hasOwnProperty.call(countMap, 2) ? 'Sim' : 'Não';
    const needsThird = Object.prototype.hasOwnProperty.call(countMap, 3) ? 'Sim' : 'Não';
    const needsFourth = Object.prototype.hasOwnProperty.call(countMap, 4) ? 'Sim' : 'Não';

    return {
      'Índice': index + 1,
      'Depósito': item.dep || item.desc_deposito || '',
      'Prateleira': item.pos_dpst || '',
      'Código do item': item.material || '',
      'Descrição do item': item.descricao || '',
      'UMB': item.umb || '',
      'Quantidade base': Number(item.base_quantity ?? 0),
      '1º contagem': firstCount === '' ? '' : firstCount,
      'Necessita da Segunda?': needsSecond,
      '2º contagem': secondCount === '' ? '' : secondCount,
      'Necessita da Terceira?': needsThird,
      '3º contagem': thirdCount === '' ? '' : thirdCount,
      'Necessita da Quarta?': needsFourth,
      '4º contagem': fourthCount === '' ? '' : fourthCount,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Itens finalizados');

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(workbook, `itens-finalizados-${timestamp}.xlsx`);
  dashboardMessage.textContent = `Arquivo Excel gerado com ${rows.length} item(ns) finalizado(s).`;
}

async function moveItemToTeam(assignmentId, targetTeamId) {
  const { data: targetTeam, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', targetTeamId)
    .maybeSingle();

  if (teamError || !targetTeam) {
    if (dashboardMessage) dashboardMessage.textContent = 'Equipe informada não existe.';
    return;
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from('team_item_assignments')
    .select('attempts')
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError) {
    console.error('Erro ao buscar tentativa atual do item:', assignmentError);
    if (dashboardMessage) dashboardMessage.textContent = `Erro ao buscar o item: ${assignmentError.message}`;
    return;
  }

  const nextAttempt = Number(assignmentData?.attempts ?? 0) || 2;

  const { error: updateError } = await supabase
    .from('team_item_assignments')
    .update({
      team_id: targetTeamId,
      attempts: nextAttempt,
      found_quantity: null,
      resolved: false,
      removed: false,
    })
    .eq('id', assignmentId);

  if (updateError) {
    console.error('Erro ao mover item para a equipe:', updateError);
    if (dashboardMessage) dashboardMessage.textContent = `Erro ao mover item: ${updateError.message}`;
    return;
  }

  const nextStageLabel = nextAttempt >= 3 ? '4ª contagem' : '3ª contagem';

  if (dashboardMessage) {
    dashboardMessage.textContent = `Item liberado para a equipe ${targetTeamId} e aguardando a ${nextStageLabel}.`;
  }
  await loadDashboard();
  await loadDashboardReleaseItems();
}

async function finishDashboardRelease(assignmentId, shouldRelease) {
  const { data: latestCount, error: countError } = await supabase
    .from('team_item_counts')
    .select('attempt_number, entered_quantity')
    .eq('assignment_id', assignmentId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const fallbackQuantity = Number(latestCount?.entered_quantity ?? 0);
  const latestAttempt = Number(latestCount?.attempt_number ?? 2);

  let updateData = {
    resolved: true,
    attempts: latestAttempt,
    found_quantity: fallbackQuantity,
    removed: false,
  };

  if (shouldRelease) {
    updateData = {
      resolved: false,
      attempts: latestAttempt,
      found_quantity: null,
      removed: false,
    };
  }

  const { error } = await supabase
    .from('team_item_assignments')
    .update(updateData)
    .eq('id', assignmentId);

  if (error) {
    console.error('Erro ao encerrar liberacao do item:', error);
    if (dashboardMessage) dashboardMessage.textContent = `Erro ao encerrar o item: ${error.message}`;
    return;
  }

  const nextStageText = latestAttempt >= 3 ? '4ª contagem' : '3ª contagem';

  if (dashboardMessage) {
    dashboardMessage.textContent = shouldRelease
      ? `Item liberado para a ${nextStageText}.`
      : `Contagem encerrada e o valor ${fallbackQuantity} foi mantido nos itens finalizados.`;
  }

  await loadDashboard();
  await loadDashboardReleaseItems();
}

async function loadDashboardReleaseItems() {
  if (!dashboardReleaseList) return;

  const { data: assignments, error: assignmentError } = await fetchAllRows((from, to) =>
    supabase
      .from('team_item_assignments')
      .select('id, team_id, master_item_id, resolved, removed, attempts, found_quantity')
      .eq('resolved', false)
      .eq('removed', false)
      .order('id', { ascending: true })
      .range(from, to)
  );

  if (assignmentError) {
    console.error('Erro ao carregar itens pendentes de liberação:', assignmentError);
    dashboardReleaseList.innerHTML = '<div class="dashboard-release-empty">Não foi possível carregar a fila de liberação.</div>';
    return;
  }

  if (!assignments || assignments.length === 0) {
    dashboardReleaseList.innerHTML = '<div class="dashboard-release-empty">Nenhum item exige liberação.</div>';
    return;
  }

  const assignmentIds = assignments.map((item) => item.id);
  const { data: countHistory, error: countError } = await fetchAllRows((from, to) =>
    supabase
      .from('team_item_counts')
      .select('id, assignment_id, master_item_id, team_id, attempt_number, entered_quantity, base_quantity, created_at')
      .in('assignment_id', assignmentIds)
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  if (countError) {
    console.error('Erro ao carregar histórico de contagem para aprovação:', countError);
    dashboardReleaseList.innerHTML = '<div class="dashboard-release-empty">Não foi possível carregar a fila de liberação.</div>';
    return;
  }

  const masterIds = [...new Set((assignments || []).map((item) => item.master_item_id).filter(Boolean))];
  let masterItems = [];
  if (masterIds.length) {
    const { data: masters, error: masterError } = await fetchAllRows((from, to) =>
      supabase
        .from('master_inventory_items')
        .select('id, descricao, material, base_quantity, unit_value, currency')
        .in('id', masterIds)
        .range(from, to)
    );

    if (!masterError && masters) {
      masterItems = masters;
    }
  }
  const masterMap = Object.fromEntries(masterItems.map((item) => [item.id, item]));

  const teamIds = [...new Set((assignments || []).map((item) => item.team_id).filter(Boolean))];
  let teams = [];
  if (teamIds.length) {
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, name1, name2')
      .in('id', teamIds);

    if (!teamError && teamData) {
      teams = teamData;
    }
  }
  const teamMap = Object.fromEntries(teams.map((team) => [team.id, team]));

  const lastCountByAssignment = new Map();
  const historyByAssignment = new Map();

  (countHistory || []).forEach((count) => {
    if (!count.assignment_id) return;
    const assignmentId = Number(count.assignment_id);
    const attempt = Number(count.attempt_number ?? 0);
    const existing = lastCountByAssignment.get(assignmentId);
    if (!existing || attempt > Number(existing.attempt_number ?? 0)) {
      lastCountByAssignment.set(assignmentId, count);
    }

    const history = historyByAssignment.get(assignmentId) || [];
    history.push({
      attempt,
      quantity: Number(count.entered_quantity ?? 0),
      createdAt: count.created_at,
    });
    historyByAssignment.set(assignmentId, history.sort((a, b) => a.attempt - b.attempt));
  });

  const pendingApprovals = [];
  (assignments || []).forEach((assignment) => {
    if (!assignment || assignment.resolved || assignment.removed) return;
    if (assignment.found_quantity === null || assignment.found_quantity === undefined) return;

    const assignmentId = Number(assignment.id);
    const latestCount = lastCountByAssignment.get(assignmentId) || null;
    const currentAttempt = Number(assignment.attempts ?? latestCount?.attempt_number ?? 0);
    const enteredQuantity = Number(latestCount?.entered_quantity ?? assignment.found_quantity ?? NaN);
    const baseQuantity = Number(latestCount?.base_quantity ?? masterMap[assignment.master_item_id]?.base_quantity ?? 0);

    if (currentAttempt >= 2 && currentAttempt <= 3 && Number.isFinite(enteredQuantity) && Number.isFinite(baseQuantity) && enteredQuantity !== baseQuantity) {
      pendingApprovals.push({
        assignmentId,
        masterItemId: assignment.master_item_id,
        teamId: assignment.team_id,
        firstQuantity: Number(historyByAssignment.get(assignmentId)?.[0]?.quantity ?? enteredQuantity),
        secondQuantity: enteredQuantity,
        attempts: currentAttempt,
        repeatedAttempt: currentAttempt,
        history: historyByAssignment.get(assignmentId) || [{ attempt: currentAttempt, quantity: enteredQuantity }],
      });
    }
  });

  if (!pendingApprovals.length) {
    dashboardReleaseList.innerHTML = '<div class="dashboard-release-empty">Nenhum item exige liberação.</div>';
    return;
  }

  dashboardReleaseList.innerHTML = pendingApprovals.map((item) => {
    const team = teamMap[item.teamId] || null;
    const masterItem = masterMap[item.masterItemId] || null;
    const itemLabel = masterItem?.descricao || masterItem?.material || `Item ${item.masterItemId}`;
    const teamLabel = team ? `${team.name1} e ${team.name2}` : `Equipe ${item.teamId}`;
    const approvalLabel = item.repeatedAttempt >= 3 ? '3ª contagem incorreta' : '2ª contagem incorreta';
    const nextStageStep = item.repeatedAttempt >= 3 ? '4ª contagem' : '3ª contagem';
    const releaseDescription = item.repeatedAttempt >= 3
      ? 'A 3ª contagem foi registrada com valor incorreto. Decida se libera para a 4ª contagem ou encerra o item.'
      : 'A 2ª contagem foi registrada com valor incorreto. Decida se libera para a 3ª contagem ou encerra o item.';
    const unitValue = Number(masterItem?.unit_value ?? 0);
    const currency = normalizeCurrencyCode(masterItem?.currency || 'BRL');
    const formatQtyValue = (quantity) => (unitValue > 0 ? ` (${formatMoney(Number(quantity ?? 0) * unitValue, currency)})` : '');
    const historyMarkup = (item.history || [])
      .map((entry) => `<li><span>${entry.attempt}ª contagem</span><strong>${entry.quantity}${formatQtyValue(entry.quantity)}</strong></li>`)
      .join('');

    return `
      <article class="dashboard-release-item">
        <div class="dashboard-release-item-header">
          <div class="dashboard-release-item-main">
            <h4>${itemLabel}</h4>
            <div class="dashboard-release-meta">
              <span><strong>Equipe:</strong> ${teamLabel}</span>
              <span><strong>Etapa:</strong> ${approvalLabel}</span>
              <span><strong>${item.repeatedAttempt - 1}ª:</strong> ${item.firstQuantity}${formatQtyValue(item.firstQuantity)}</span>
              <span><strong>${item.repeatedAttempt}ª:</strong> ${item.secondQuantity}${formatQtyValue(item.secondQuantity)}</span>
            </div>
          </div>
          <span class="dashboard-release-tag">Aguardando decisão</span>
        </div>

        <div class="dashboard-release-note">
          <strong>Decisão necessária:</strong> ${releaseDescription} Próxima etapa: ${nextStageStep}.
        </div>

        <div class="dashboard-release-history">
          <div class="dashboard-release-history-title">Histórico da contagem</div>
          <ul class="dashboard-release-history-list">
            ${historyMarkup}
          </ul>
        </div>

        <div class="dashboard-release-actions">
          <button type="button" class="small-btn success" data-action="release-yes" data-assignment-id="${item.assignmentId}">Liberar para próxima etapa</button>
          <button type="button" class="small-btn danger" data-action="release-no" data-assignment-id="${item.assignmentId}">Encerrar item</button>
        </div>

        <div class="dashboard-release-target" data-target-id="${item.assignmentId}">
          <input type="number" min="1" placeholder="ID da equipe" data-team-input="${item.assignmentId}" />
          <button type="button" class="small-btn success" data-action="confirm-release" data-assignment-id="${item.assignmentId}">Confirmar equipe</button>
        </div>
      </article>
    `;
  }).join('');
}

async function loadDashboard() {
  if (!dashboardMaterialTotal || !dashboardTotalCounted || !dashboardTotalProgress || !dashboardTotalApproval || !dashboardTotalTeams || !dashboardItems) {
    return;
  }

  await loadDashboardReleaseItems();

  const [{ data: assignments, error }, { data: countHistory, error: countError }, { data: allTeams, error: teamsError }, { data: allMasterItems, error: masterError }] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('team_item_assignments')
        .select('id, team_id, attempts, resolved, found_quantity, master_item_id, removed')
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('team_item_counts')
        .select('id, assignment_id, master_item_id, team_id, attempt_number, entered_quantity, created_at')
        .order('created_at', { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('teams')
        .select('id')
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('master_inventory_items')
        .select('id, descricao, material, base_quantity, unit_value, currency')
        .order('id', { ascending: true })
        .range(from, to)
    ),
  ]);

  if (error || countError || teamsError || masterError) {
    console.error('Erro ao carregar dashboard:', error || countError || teamsError || masterError);
    dashboardItems.innerHTML = '<p>Não foi possível carregar o dashboard no momento.</p>';
    if (dashboardStageGroups) dashboardStageGroups.innerHTML = '<p>Não foi possível carregar o acompanhamento das etapas.</p>';
    dashboardMaterialTotal.textContent = '0';
    dashboardTotalCounted.textContent = '0';
    dashboardTotalProgress.textContent = '0';
    dashboardTotalApproval.textContent = '0';
    dashboardTotalTeams.textContent = '0';
    return;
  }

  const masterIds = [...new Set([...(assignments || []).map((item) => item.master_item_id), ...(countHistory || []).map((item) => item.master_item_id)].filter(Boolean))];
  const teamIds = [...new Set([...(assignments || []).map((item) => item.team_id), ...(countHistory || []).map((item) => item.team_id)].filter(Boolean))];

  let masterItems = allMasterItems || [];
  let teams = allTeams || [];

  if (masterIds.length) {
    const { data: masterData, error: masterFetchError } = await fetchAllRows((from, to) =>
      supabase
        .from('master_inventory_items')
        .select('id, descricao, material, base_quantity, unit_value, currency')
        .in('id', masterIds)
        .range(from, to)
    );

    if (!masterFetchError && masterData) {
      masterItems = masterData;
    }
  }

  if (teamIds.length) {
    const { data: teamData, error: teamFetchError } = await fetchAllRows((from, to) =>
      supabase
        .from('teams')
        .select('id, name1, name2')
        .in('id', teamIds)
        .range(from, to)
    );

    if (!teamFetchError && teamData) {
      teams = teamData;
    }
  }

  const masterMap = Object.fromEntries(masterItems.map((item) => [item.id, item]));
  const teamMap = Object.fromEntries(teams.map((team) => [team.id, team]));

  const resolvedItems = (assignments || [])
    .filter((item) => item.resolved)
    .map((item) => ({
      ...item,
      itemData: masterMap[item.master_item_id] || null,
      teamData: teamMap[item.team_id] || null,
    }));

  const activeAssignments = (assignments || []).filter((item) => !item.resolved && !item.removed);
  const materialTotal = masterItems.length;
  const totalCounted = resolvedItems.length;
  const totalTeams = teams.length;
  const totalInProgress = activeAssignments.length;
  const totalApproval = (assignments || []).filter((item) => !item.resolved && !item.removed && Number(item.attempts ?? 0) >= 2 && Number(item.attempts ?? 0) <= 3 && item.found_quantity !== null && item.found_quantity !== undefined).length;

  dashboardMaterialTotal.textContent = String(materialTotal);
  dashboardTotalCounted.textContent = String(totalCounted);
  dashboardTotalProgress.textContent = String(totalInProgress);
  dashboardTotalApproval.textContent = String(totalApproval);
  dashboardTotalTeams.textContent = String(totalTeams);

  const stageGroups = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  const assignmentById = new Map((assignments || []).map((assignment) => [Number(assignment.id), assignment]));

  (assignments || [])
    .filter((assignment) => !assignment.resolved && !assignment.removed)
    .forEach((assignment) => {
      const assignmentId = Number(assignment.id);
      const attempts = Number(assignment.attempts ?? 0);
      const itemName = masterMap[assignment.master_item_id]?.descricao || masterMap[assignment.master_item_id]?.material || `Item ${assignment.master_item_id}`;
      const teamLabel = teamMap[assignment.team_id] ? `${teamMap[assignment.team_id].name1} e ${teamMap[assignment.team_id].name2}` : `Equipe ${assignment.team_id}`;
      const latestCount = (countHistory || [])
        .filter((count) => Number(count.assignment_id) === assignmentId)
        .sort((a, b) => Number(b.attempt_number ?? 0) - Number(a.attempt_number ?? 0))[0];

      const stageKey = attempts === 0 ? 1 : Math.min(4, attempts);

      stageGroups[stageKey].push({
        assignmentId,
        itemName,
        teamLabel,
        quantity: Number(latestCount?.entered_quantity ?? 0),
        status: attempts === 0 ? 'Não contado' : attempts >= 4 ? 'Última tentativa' : 'Em andamento',
        countNumber: attempts,
      });
    });

  if (dashboardStageGroups) {
    const stageLabels = {
      1: '1ª contagem',
      2: '2ª contagem',
      3: '3ª contagem',
      4: '4ª contagem',
    };

    const stageDescriptions = {
      1: 'Ainda não contado',
      2: 'Valor informado, mas não é o correto',
      3: 'Liberado após aprovação para nova contagem',
      4: 'Última tentativa antes do fechamento',
    };

    dashboardStageGroups.innerHTML = Object.entries(stageGroups)
      .map(([stage, items]) => {
        const safeItems = items || [];
        const content = safeItems.length
          ? safeItems.map((item) => {
              const statusClass = Number(stage) === 1 ? 'pending' : 'normal';
              const statusLabel = Number(stage) === 1 ? 'Sem contagem' : stageDescriptions[Number(stage)] || item.status;
              return `
                <li class="${statusClass}">
                  <span class="dashboard-stage-item-name">${item.itemName}</span>
                  <span class="dashboard-stage-item-meta">Equipe ${item.teamLabel}</span>
                  <span class="dashboard-stage-item-meta">Qtd: ${item.quantity || 0}</span>
                  <span class="dashboard-stage-status ${statusClass}">${statusLabel}</span>
                </li>
              `;
            }).join('')
          : '<li class="dashboard-stage-empty">Nenhum item nesta etapa.</li>';

        return `
          <div class="dashboard-stage-panel">
            <div class="dashboard-stage-header">
              <strong>${stageLabels[stage]}</strong>
              <span>${safeItems.length}</span>
            </div>
            <div class="dashboard-stage-subtitle">${stageDescriptions[Number(stage)]}</div>
            <ul class="dashboard-stage-list">${content}</ul>
          </div>
        `;
      })
      .join('');
  }

  if (!resolvedItems.length) {
    dashboardItems.innerHTML = '<p>Nenhum item foi contado e finalizado ainda.</p>';
    return;
  }

  dashboardItems.innerHTML = resolvedItems
    .sort((a, b) => Number(b.attempts ?? 0) - Number(a.attempts ?? 0))
    .map((item) => {
      const name = item.itemData?.descricao || item.itemData?.material || 'Item sem descrição';
      const baseQty = Number(item.itemData?.base_quantity ?? 0);
      const foundQty = Number(item.found_quantity ?? 0);
      const unitValue = Number(item.itemData?.unit_value ?? 0);
      const currency = normalizeCurrencyCode(item.itemData?.currency || 'BRL');
      const totalValue = foundQty * unitValue;
      const teamLabel = item.teamData ? `${item.teamData.name1} e ${item.teamData.name2}` : `Equipe ${item.team_id}`;
      const status = foundQty === baseQty ? 'Correto' : 'Finalizado';

      return `
        <article class="dashboard-item-card">
          <p><strong>Item:</strong> ${name}</p>
          <p><strong>Material:</strong> ${item.itemData?.material ?? '—'}</p>
          <p><strong>Equipe:</strong> ${teamLabel}</p>
          <p><strong>Base:</strong> ${baseQty}</p>
          <p><strong>Informado:</strong> ${foundQty}</p>
          <p><strong>Contagens:</strong> ${item.attempts ?? 0}</p>
          <p><strong>Valor total:</strong> ${unitValue > 0 ? formatMoney(totalValue, currency) : '—'}</p>
          <p class="dashboard-status"><strong>Status:</strong> ${status}</p>
        </article>
      `;
    })
    .join('');
}

// Busca as equipes no Supabase e cria os cards exibidos na tela.
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

// Substitui o card de uma equipe por campos para editar seus nomes.
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

// Valida os nomes, cadastra uma nova equipe e reorganiza os links alternativos.
async function createTeam() {
  const name1 = teamName1Input.value.trim();
  const name2 = teamName2Input.value.trim();
  if (!name1 || !name2) {
    teamMessage.textContent = 'Preencha os dois nomes.';
    return;
  }

  const { error } = await supabase.from('teams').insert({ name1, name2 });
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

// Atualiza os nomes de uma equipe existente no banco e recarrega a lista.
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

// Confirma e exclui uma equipe, marcando itens legados relacionados como removidos.
async function deleteTeam(teamId) {
  showConfirmModal({
    title: 'Excluir equipe',
    message: 'Deseja realmente excluir esta equipe?',
    confirmText: 'Excluir',
    onConfirm: async () => {
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
  });
}

// Define uma atribuição única de equipe alternativa para cada equipe cadastrada.
async function rebuildAltLinks() {
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .order('id', { ascending: true });

  if (!teams || teams.length === 0) return;

  const teamIds = [...teams.map((team) => team.id)];
  const shuffled = [...teamIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  const updates = shuffled.map((teamId, index) => ({
    id: teamId,
    alt_team_id: shuffled.length > 1 ? shuffled[(index + 1) % shuffled.length] : null,
  }));

  for (const item of updates) {
    const { error: updateErr } = await supabase
      .from('teams')
      .update({ alt_team_id: item.alt_team_id })
      .eq('id', item.id);

    if (updateErr) {
      console.error('Erro ao atualizar alt_team_id para', item.id, updateErr);
    }
  }
}

// Busca uma equipe pelo ID, atualiza seu resumo e carrega os itens atribuídos.
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

// Carrega os itens pela view principal e usa a tabela legada como fallback.
async function loadItemsForTeam(teamId) {
  // Dá preferência à view que une materiais mestres e atribuições; usa inventory_items como fallback.
  let data = null;
  let error = null;
  try {
    const viewResp = await fetchAllRows((from, to) =>
      supabase
        .from('view_items_for_team')
        .select('assignment_id, team_id, master_item_id, descricao, material, base_quantity, umb, unit_value, currency, found_quantity, attempts, resolved, removed')
        .eq('team_id', teamId)
        .range(from, to)
    );
    if (viewResp.error) throw viewResp.error;
    // Converte as linhas da view para o formato esperado pela interface.
    data = (viewResp.data || [])
      .filter((r) => !r.removed && !r.resolved)
      .filter((r) => !(Number(r.attempts ?? 0) >= 2 && r.found_quantity !== null && r.found_quantity !== undefined))
      .map((r) => ({
        id: r.assignment_id,
        name: r.descricao || r.material || `item-${r.master_item_id}`,
        base_quantity: r.base_quantity,
        attempts: r.attempts,
        assigned_team_id: r.team_id,
        resolved: r.resolved,
        removed: r.removed,
        master_item_id: r.master_item_id,
        found_quantity: r.found_quantity,
        _table: 'team_item_assignments',
      }));
      // Busca em lote os campos adicionais dos materiais mestres, quando existirem IDs.
    const masterIds = Array.from(new Set(data.map((i) => i.master_item_id).filter(Boolean)));
    if (masterIds.length) {
      const { data: masters, error: mastersErr } = await fetchAllRows((from, to) =>
        supabase
          .from('master_inventory_items')
          .select('id, material, descricao, pos_dpst, dep, desc_deposito, umb, unit_value, currency')
          .in('id', masterIds)
          .range(from, to)
      );
      if (mastersErr) {
        console.error('Erro ao buscar master_inventory_items:', mastersErr);
      } else if (masters) {
        const masterMap = Object.fromEntries(masters.map((m) => [m.id, m]));
        data = data.map((i) => ({ ...i, ...(i.master_item_id ? masterMap[i.master_item_id] : {}) }));
      }
    }
  } catch (e) {
    // Usa a tabela inventory_items se a view não existir ou apresentar erro.
    const resp = await supabase
      .from('inventory_items')
      .select('id, name, base_quantity, attempts, assigned_team_id, resolved, removed, found_quantity')
      .eq('assigned_team_id', teamId)
      .eq('removed', false)
      .order('id', { ascending: true });
    data = (resp.data || []).filter((item) => !(Number(item.attempts ?? 0) >= 2 && item.found_quantity !== null && item.found_quantity !== undefined));
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

  const orderedData = [...data].sort((a, b) => {
    const attemptsA = Number(a.attempts ?? 0);
    const attemptsB = Number(b.attempts ?? 0);
    return attemptsA - attemptsB;
  });

  inventoryListCard.classList.remove('hidden');
  // Renderiza os itens sem edição; eles vêm do cadastro mestre e devem ser únicos.
  orderedData.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    const unitValue = Number(item.unit_value ?? 0);
    const currency = normalizeCurrencyCode(item.currency || 'BRL');
    const materialCode = String(item.material ?? '').trim() || '—';
    const descriptionText = String(item.descricao ?? '').trim() || String(item.name ?? '').trim() || '—';
    card.innerHTML = `
      <p><strong>Código:</strong> ${materialCode}</p>
      <p><strong>Item:</strong> ${descriptionText}</p>
      <p><strong>Prateleira:</strong> ${item.pos_dpst ?? '—'}</p>
      <p><strong>Depósito:</strong> ${item.dep ?? '—'}</p>
      <p><strong>Unidade de medida:</strong> ${item.umb ?? '—'}</p>
      <p><strong>Valor unitário:</strong> ${unitValue > 0 ? formatMoney(unitValue, currency) : '—'}</p>
      <p><strong>Moeda:</strong> ${currency || '—'}</p>
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

// Limpa a tela e o estado do inventário ao entrar nessa seção novamente.
function clearInventoryView() {
  if (inventoryTeamInfo) inventoryTeamInfo.textContent = '';
  if (inventoryMessage) inventoryMessage.textContent = '';
  if (registerMessage) registerMessage.textContent = '';
  if (inventoryCreateCard) inventoryCreateCard.classList.add('hidden');
  if (inventoryListCard) inventoryListCard.classList.add('hidden');
  if (selectedItemCard) selectedItemCard.classList.add('hidden');
  if (inventoryItems) inventoryItems.innerHTML = '';
  if (teamIdInput) teamIdInput.value = '';
  if (itemNameInput) itemNameInput.value = '';
  if (itemBaseInput) itemBaseInput.value = '';
  if (itemFoundQtyInput) itemFoundQtyInput.value = '';
  state.currentTeam = null;
  state.selectedItem = null;
}

// Informa que a criação manual está desativada porque os itens vêm do cadastro mestre.
async function createItemForCurrentTeam() {
  if (!state.currentTeam) {
    inventoryMessage.textContent = 'Carregue uma equipe antes de criar itens.';
    return;
  }
  // Os itens vêm do cadastro mestre do Supabase pela view de atribuições.
  // A criação pela interface fica desativada para evitar duplicidades.
  inventoryMessage.textContent = 'Itens são carregados do banco (master); criação manual desabilitada.';
  return;
}

// Guarda o item escolhido e mostra seus dados no formulário de quantidade.
function selectItem(item) {
  state.selectedItem = item;
  const unitValue = Number(item.unit_value ?? 0);
  const currency = normalizeCurrencyCode(item.currency || 'BRL');
  const materialCode = String(item.material ?? '').trim() || '—';
  const descriptionText = String(item.descricao ?? '').trim() || String(item.name ?? '').trim() || '—';
  selectedItemInfo.innerHTML = `
    <p><strong>Código:</strong> ${materialCode}</p>
    <p><strong>Item:</strong> ${descriptionText}</p>
    <p><strong>Posição depósito:</strong> ${item.pos_dpst ?? '—'}</p>
    <p><strong>Departamento:</strong> ${item.dep ?? '—'}</p>
    <p><strong>Unidade de medida:</strong> ${item.umb ?? '—'}</p>
    <p><strong>Valor unitário:</strong> ${unitValue > 0 ? formatMoney(unitValue, currency) : '—'}</p>
    <p><strong>Moeda:</strong> ${currency || '—'}</p>
    <p data-total-value><strong>Valor total da quantidade:</strong> —</p>
    <p><strong>Tentativas até agora:</strong> ${item.attempts}</p>
  `;
  if (itemFoundQtyInput) itemFoundQtyInput.value = '';
  if (selectedItemCard) selectedItemCard.classList.remove('hidden');
  if (registerMessage) registerMessage.textContent = '';
  updateSelectedItemValuePreview();

  // Leva o formulário para a área visível e deixa o campo pronto para digitação.
  if (selectedItemCard) {
    selectedItemCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (itemFoundQtyInput) {
    window.setTimeout(() => itemFoundQtyInput.focus(), 350);
  }
}

// Monta o formulário antigo de edição de item, mantido para compatibilidade.
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

// Atualiza nome e quantidade base de um item da tabela legada.
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

// Registra a quantidade encontrada sem alterar a equipe atual do item.
async function registerItemQuantity() {
  if (!state.selectedItem || !state.currentTeam) {
    if (registerMessage) registerMessage.textContent = 'Selecione um item e equipe primeiro.';
    return;
  }

  const enteredQuantity = Number(itemFoundQtyInput ? itemFoundQtyInput.value : NaN);
  if (Number.isNaN(enteredQuantity)) {
    if (registerMessage) registerMessage.textContent = 'Informe uma quantidade válida.';
    return;
  }

  const item = state.selectedItem;
  const baseQuantity = Number(item.base_quantity ?? 0);
  const unitValue = Number(item.unit_value ?? 0);
  const currency = normalizeCurrencyCode(item.currency || 'BRL');
  const totalValue = unitValue > 0 ? enteredQuantity * unitValue : 0;

  if (item._table === 'team_item_assignments') {
    // A redistribuição pode recriar as atribuições enquanto a tela está aberta.
    // Por isso, confirma o ID atual usando o item mestre e a equipe carregada.
    let assignmentId = item.id;
    let currentAttempt = Number(item.attempts ?? 0);
    const { data: currentAssignment } = await supabase
      .from('team_item_assignments')
      .select('id, attempts, found_quantity')
      .eq('id', item.id)
      .eq('team_id', state.currentTeam.id)
      .maybeSingle();

    if (currentAssignment) {
      assignmentId = currentAssignment.id;
      currentAttempt = Number(currentAssignment.attempts ?? 0);
    } else if (item.master_item_id) {
      const { data: assignmentByMaster } = await supabase
        .from('team_item_assignments')
        .select('id, attempts, found_quantity')
        .eq('master_item_id', item.master_item_id)
        .eq('team_id', state.currentTeam.id)
        .maybeSingle();

      if (assignmentByMaster) {
        assignmentId = assignmentByMaster.id;
        currentAttempt = Number(assignmentByMaster.attempts ?? 0);
      } else {
        registerMessage.textContent = 'A atribuição deste item mudou. Recarregue a equipe e tente novamente.';
        await loadItemsForTeam(state.currentTeam.id);
        return;
      }
    }

    const { error } = await supabase
      .from('team_item_assignments')
      .update({ found_quantity: enteredQuantity })
      .eq('id', assignmentId);

    if (error) {
      console.error('Erro ao registrar quantidade do item:', error);
      registerMessage.textContent = `Erro ao registrar a quantidade: ${error.message}`;
      return;
    }

    // Consulta novamente a atribuição para capturar a equipe após a execução do trigger.
    let assignmentData = null;
    let fetchErr = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await supabase
        .from('team_item_assignments')
        .select('team_id, resolved, removed, attempts, found_quantity')
        .eq('id', assignmentId)
        .single();

      assignmentData = response.data;
      fetchErr = response.error;

      if (!fetchErr && assignmentData) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (fetchErr) {
      console.error('Erro ao buscar item atualizado:', fetchErr);
    }

    const successMessage = unitValue > 0
      ? `Quantidade registrada com sucesso. Valor da quantidade encontrada: ${formatMoney(totalValue, currency)}.`
      : 'Quantidade registrada com sucesso.';

    if (!assignmentData || Number(assignmentData.attempts ?? 0) <= currentAttempt) {
      // Fallback para projetos em que a migration do trigger ainda não foi aplicada.
      const nextAttempt = currentAttempt + 1;
      const { error: countError } = await supabase
        .from('team_item_counts')
        .insert({
          assignment_id: assignmentId,
          master_item_id: item.master_item_id,
          team_id: state.currentTeam.id,
          attempt_number: nextAttempt,
          entered_quantity: enteredQuantity,
          base_quantity: baseQuantity,
        });

      if (countError) {
        console.error('Erro ao registrar histórico da contagem:', countError);
        registerMessage.textContent = `Erro ao registrar no banco: ${countError.message}`;
        return;
      }

      const shouldResolve = enteredQuantity === baseQuantity || nextAttempt >= 4;
      if (shouldResolve) {
        const { error: resolveError } = await supabase
          .from('team_item_assignments')
          .update({ attempts: nextAttempt, resolved: true })
          .eq('id', assignmentId);

        if (resolveError) {
          console.error('Erro ao resolver atribuição:', resolveError);
          registerMessage.textContent = `Erro ao atualizar o item: ${resolveError.message}`;
          return;
        }
        registerMessage.textContent = enteredQuantity === baseQuantity
          ? `Quantidade correta salva. Item resolvido. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`
          : `Item encerrado após quatro tentativas. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
      } else if (nextAttempt === 1) {
        // 1ª contagem incorreta: move o item para a equipe alternativa (mesma regra do trigger SQL).
        const { data: teamRow } = await supabase
          .from('teams')
          .select('alt_team_id')
          .eq('id', state.currentTeam.id)
          .maybeSingle();

        let nextTeamId = teamRow?.alt_team_id ?? null;
        if (!nextTeamId || nextTeamId === state.currentTeam.id) {
          const { data: fallbackTeam } = await supabase
            .from('teams')
            .select('id')
            .neq('id', state.currentTeam.id)
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();
          nextTeamId = fallbackTeam?.id ?? state.currentTeam.id;
        }

        const { error: moveError } = await supabase
          .from('team_item_assignments')
          .update({
            team_id: nextTeamId,
            attempts: nextAttempt,
            found_quantity: null,
            resolved: false,
            removed: false,
          })
          .eq('id', assignmentId);

        if (moveError) {
          console.error('Erro ao mover item para equipe alternativa:', moveError);
          registerMessage.textContent = `Erro ao mover o item para a equipe alternativa: ${moveError.message}`;
          return;
        }

        registerMessage.textContent = `Quantidade registrada. O item foi movido para a equipe alternativa para a 2ª contagem. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
      } else {
        const updateData = {
          attempts: nextAttempt,
          found_quantity: enteredQuantity,
          resolved: false,
          removed: false,
        };

        const { error: keepError } = await supabase
          .from('team_item_assignments')
          .update(updateData)
          .eq('id', assignmentId);

        if (keepError) {
          console.error('Erro ao manter item para aprovação:', keepError);
          registerMessage.textContent = `Erro ao registrar item para aprovação: ${keepError.message}`;
          return;
        }

        registerMessage.textContent = `Quantidade registrada. O item foi enviado para aprovação manual antes da próxima etapa. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
      }

      await loadItemsForTeam(state.currentTeam.id);
    } else if (enteredQuantity === baseQuantity) {
      registerMessage.textContent = `Quantidade correta salva. Item resolvido. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
    } else if (assignmentData?.removed) {
      registerMessage.textContent = `O item foi removido após 4 tentativas incorretas. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
    } else if (assignmentData && assignmentData.team_id !== state.currentTeam.id) {
      registerMessage.textContent = `Quantidade registrada. O item foi enviado para aprovação manual antes da próxima etapa. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
    } else {
      registerMessage.textContent = successMessage;
    }

    // Mantém o ID digitado pelo usuário e apenas atualiza a lista da equipe atual.
    // O item movido deixa de aparecer aqui; a equipe alternativa será carregada
    // quando o usuário informar o ID dela no formulário.
    await loadItemsForTeam(state.currentTeam.id);
  } else {
    const { error } = await supabase
      .from('inventory_items')
      .update({ found_quantity: enteredQuantity })
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao registrar quantidade do item legado:', error);
      registerMessage.textContent = `Erro ao registrar a quantidade: ${error.message}`;
      return;
    }

    if (enteredQuantity === baseQuantity) {
      registerMessage.textContent = `Quantidade correta salva. Item resolvido. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
    } else {
      registerMessage.textContent = `Quantidade registrada. O sistema segue a regra do banco para movimentar ou remover o item. ${unitValue > 0 ? `Valor encontrado: ${formatMoney(totalValue, currency)}.` : ''}`;
    }

    await loadItemsForTeam(state.currentTeam.id);
  }

  state.selectedItem = null;
  if (selectedItemCard) selectedItemCard.classList.add('hidden');
  if (itemFoundQtyInput) itemFoundQtyInput.value = '';
}

init();
