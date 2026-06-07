// ============================================================
//  Pagina ospiti — Fuochi di San Giovanni
// ============================================================

let guestName     = localStorage.getItem('guestName')     || '';
let confirmedName = localStorage.getItem('confirmedName') || '';
let items = [];
let selectionsMap = {};   // item_id → [guest_name, ...]
let mySelections = new Set();

// ── DOM references ──
const nameSection        = document.getElementById('name-section');
const confirmSection     = document.getElementById('confirm-section');
const itemsSection       = document.getElementById('items-section');
const guestNameInput     = document.getElementById('guest-name');
const confirmNameBtn     = document.getElementById('confirm-name-btn');
const changeNameBtn      = document.getElementById('change-name-btn');
const displayNameEl      = document.getElementById('display-name');
const itemsGrid          = document.getElementById('items-grid');
const emptyState         = document.getElementById('empty-state');
const loadingEl          = document.getElementById('loading');
const confirmNameInput   = document.getElementById('confirm-name-input');
const confirmPresenceBtn = document.getElementById('confirm-presence-btn');

// ── Controlla se le prenotazioni sono aperte ──
async function checkBookingEnabled() {
  try {
    const { data } = await window.dbClient
      .from('settings')
      .select('value')
      .eq('key', 'booking_enabled')
      .maybeSingle();
    return !data || data.value === 'true';
  } catch {
    return true;
  }
}

// ── Conferma presenza ──
function showConfirmSection() {
  nameSection.classList.add('hidden');
  itemsSection.classList.add('hidden');
  confirmSection.classList.remove('hidden');
  if (confirmedName) {
    showConfirmedState(confirmedName);
  } else {
    if (guestName) confirmNameInput.value = guestName;
    setTimeout(() => confirmNameInput.focus(), 50);
  }
}

function showConfirmedState(name) {
  document.getElementById('confirm-input-state').classList.add('hidden');
  document.getElementById('confirm-done-state').classList.remove('hidden');
  document.getElementById('confirm-display-name').textContent = name;
}

async function confirmPresence() {
  const name = confirmNameInput.value.trim();
  if (!name) {
    confirmNameInput.classList.add('shake');
    setTimeout(() => confirmNameInput.classList.remove('shake'), 500);
    return;
  }
  confirmPresenceBtn.disabled = true;
  await window.dbClient
    .from('confirmations')
    .upsert({ guest_name: name }, { onConflict: 'guest_name' });
  confirmedName = name;
  localStorage.setItem('confirmedName', name);
  showConfirmedState(name);
}

// ── Init ──
async function init() {
  const enabled = await checkBookingEnabled();
  if (!enabled) {
    showConfirmSection();
    return;
  }
  if (guestName) {
    showItemsSection();
  } else {
    if (confirmedName) guestNameInput.value = confirmedName;
    guestNameInput.focus();
  }
}

init();

// ── Event listeners ──
confirmPresenceBtn.addEventListener('click', confirmPresence);
confirmNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') confirmPresence(); });

guestNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') confirmName(); });
confirmNameBtn.addEventListener('click', confirmName);

changeNameBtn.addEventListener('click', () => {
  localStorage.removeItem('guestName');
  guestName = '';
  nameSection.classList.remove('hidden');
  itemsSection.classList.add('hidden');
  guestNameInput.value = '';
  setTimeout(() => guestNameInput.focus(), 50);
});

// ── Name confirmation ──
function confirmName() {
  const raw = guestNameInput.value.trim();
  if (!raw) {
    guestNameInput.classList.add('shake');
    setTimeout(() => guestNameInput.classList.remove('shake'), 500);
    return;
  }
  guestName = raw;
  localStorage.setItem('guestName', raw);
  showItemsSection();
}

// ── Show items section ──
async function showItemsSection() {
  guestNameInput.value = guestName;
  displayNameEl.textContent = guestName;
  nameSection.classList.add('hidden');
  itemsSection.classList.remove('hidden');
  loadingEl.classList.remove('hidden');
  itemsGrid.classList.add('hidden');

  await loadData();
  subscribeToChanges();
}

// ── Load data from Supabase ──
async function loadData() {
  const [{ data: itemsData }, { data: selData }] = await Promise.all([
    window.dbClient.from('items').select('*').eq('is_active', true).order('created_at'),
    window.dbClient.from('selections').select('item_id, guest_name'),
  ]);

  items = itemsData || [];

  selectionsMap = {};
  mySelections  = new Set();

  for (const sel of (selData || [])) {
    if (!selectionsMap[sel.item_id]) selectionsMap[sel.item_id] = [];
    selectionsMap[sel.item_id].push(sel.guest_name);
    if (sel.guest_name.toLowerCase() === guestName.toLowerCase()) {
      mySelections.add(sel.item_id);
    }
  }

  renderItems();
}

// ── Render ──
function renderItems() {
  loadingEl.classList.add('hidden');
  itemsGrid.classList.remove('hidden');

  const visible = items.filter(item => {
    const count  = (selectionsMap[item.id] || []).length;
    const isFull = count >= item.quantity_needed;
    return !isFull || mySelections.has(item.id);
  });

  if (visible.length === 0) {
    emptyState.classList.remove('hidden');
    itemsGrid.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  itemsGrid.innerHTML = visible.map(item => {
    const count      = (selectionsMap[item.id] || []).length;
    const isFull     = count >= item.quantity_needed;
    const isSelected = mySelections.has(item.id);

    const pct = Math.min(100, Math.round((count / item.quantity_needed) * 100));

    return `
      <div class="item-card ${isSelected ? 'selected' : ''} ${isFull && !isSelected ? 'full' : ''}">
        <div class="item-content">
          <h3 class="item-name">${esc(item.name)}</h3>
          ${item.description ? `<p class="item-desc">${esc(item.description)}</p>` : ''}
          <div class="item-meta">
            <span class="item-count">${count} / ${item.quantity_needed}</span>
            ${isSelected ? '<span class="badge badge-mine">Tu porti questo ✓</span>' : ''}
            ${isFull && !isSelected ? '<span class="badge badge-full">Già coperto</span>' : ''}
          </div>
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-fill ${isFull ? 'full' : ''}" style="width:${pct}%"></div>
          </div>
        </div>
        ${(!isFull || isSelected) ? `
          <button
            class="item-btn ${isSelected ? 'btn-remove' : 'btn-add'}"
            onclick="toggleItem('${item.id}', ${isSelected})"
            ${isFull && !isSelected ? 'disabled' : ''}
          >${isSelected ? 'Rimuovi' : 'Porto io!'}</button>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ── Toggle selection ──
async function toggleItem(itemId, currentlySelected) {
  const btn = event.currentTarget;
  btn.disabled = true;

  if (currentlySelected) {
    const { error } = await window.dbClient
      .from('selections')
      .delete()
      .eq('item_id', itemId)
      .ilike('guest_name', guestName);

    if (!error) {
      mySelections.delete(itemId);
      if (selectionsMap[itemId]) {
        selectionsMap[itemId] = selectionsMap[itemId]
          .filter(n => n.toLowerCase() !== guestName.toLowerCase());
      }
    }
  } else {
    const { error } = await window.dbClient
      .from('selections')
      .insert({ item_id: itemId, guest_name: guestName });

    if (!error) {
      mySelections.add(itemId);
      if (!selectionsMap[itemId]) selectionsMap[itemId] = [];
      selectionsMap[itemId].push(guestName);
    }
  }

  renderItems();
}

// ── Real-time subscription ──
function subscribeToChanges() {
  window.dbClient.channel('realtime-selections')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'selections' }, loadData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' },      loadData)
    .subscribe();
}

// ── Utils ──
function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
