// ============================================================
//  Pagina admin — Fuochi di San Giovanni
// ============================================================

let allItems      = [];
let allSelections = [];
let editingItemId = null;

// ── Auth ──
const authOverlay  = document.getElementById('auth-overlay');
const adminContent = document.getElementById('admin-content');
const pwdInput     = document.getElementById('admin-password');
const loginBtn     = document.getElementById('login-btn');
const loginError   = document.getElementById('login-error');

loginBtn.addEventListener('click', authenticate);
pwdInput.addEventListener('keypress', e => { if (e.key === 'Enter') authenticate(); });

function authenticate() {
  if (pwdInput.value === ADMIN_PASSWORD) {
    authOverlay.classList.add('hidden');
    adminContent.classList.remove('hidden');
    loadAdminData();
    setInterval(loadAdminData, 30_000);
  } else {
    loginError.classList.remove('hidden');
    pwdInput.value = '';
    pwdInput.classList.add('shake');
    setTimeout(() => pwdInput.classList.remove('shake'), 500);
    pwdInput.focus();
  }
}

// ── Load data ──
async function loadAdminData() {
  const [{ data: items }, { data: selections }] = await Promise.all([
    db.from('items').select('*').order('created_at'),
    db.from('selections').select('*, items(name)').order('created_at'),
  ]);

  allItems      = items      || [];
  allSelections = selections || [];

  renderStats();
  renderItemsTable();
  renderGuestList();
}

// ── Stats ──
function renderStats() {
  const active  = allItems.filter(i => i.is_active).length;
  const covered = allItems.filter(i => {
    const n = allSelections.filter(s => s.item_id === i.id).length;
    return n >= i.quantity_needed;
  }).length;
  const guests = new Set(allSelections.map(s => s.guest_name)).size;

  document.getElementById('stat-items').textContent   = active;
  document.getElementById('stat-covered').textContent = covered;
  document.getElementById('stat-guests').textContent  = guests;
  document.getElementById('stat-total').textContent   = allSelections.length;
}

// ── Items table ──
function renderItemsTable() {
  const tbody = document.getElementById('items-table-body');

  if (allItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Nessun elemento ancora. Aggiungine uno!</td></tr>`;
    return;
  }

  tbody.innerHTML = allItems.map(item => {
    const sels   = allSelections.filter(s => s.item_id === item.id);
    const count  = sels.length;
    const guests = sels.map(s => esc(s.guest_name)).join(', ');
    const isFull = count >= item.quantity_needed;

    return `
      <tr class="${!item.is_active ? 'inactive-row' : ''}">
        <td><strong>${esc(item.name)}</strong></td>
        <td style="max-width:180px;word-break:break-word;">${esc(item.description || '—')}</td>
        <td class="center">
          <strong style="font-size:1.05em;">${count}</strong>
          <span style="color:var(--text-muted)"> / ${item.quantity_needed}</span>
        </td>
        <td style="max-width:220px;word-break:break-word;">${guests || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td class="center">
          <span class="status-badge ${isFull ? 'status-full' : item.is_active ? 'status-open' : 'status-inactive'}">
            ${isFull ? 'Coperto' : item.is_active ? 'Aperto' : 'Disattivo'}
          </span>
        </td>
        <td class="actions">
          <button onclick="openEditModal('${item.id}')"            class="btn-sm" title="Modifica">✏️</button>
          <button onclick="toggleActive('${item.id}', ${item.is_active})" class="btn-sm" title="${item.is_active ? 'Disattiva' : 'Attiva'}">${item.is_active ? '🔕' : '✅'}</button>
          <button onclick="deleteItem('${item.id}')"               class="btn-sm btn-danger" title="Elimina">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Guest list ──
function renderGuestList() {
  const container = document.getElementById('guest-list');
  const guests = {};

  for (const sel of allSelections) {
    if (!guests[sel.guest_name]) guests[sel.guest_name] = [];
    guests[sel.guest_name].push(sel.items?.name || '?');
  }

  const entries = Object.entries(guests);

  if (entries.length === 0) {
    container.innerHTML = '<p class="muted">Nessuna iscrizione ancora.</p>';
    return;
  }

  container.innerHTML = `<div class="guest-grid">` +
    entries.map(([name, itemNames]) => `
      <div class="guest-card">
        <strong>${esc(name)}</strong>
        <span>${itemNames.map(esc).join(', ')}</span>
      </div>
    `).join('') +
  `</div>`;
}

// ── Modal: add / edit ──
const modal      = document.getElementById('item-modal');
const modalTitle = document.getElementById('modal-title');
const itemForm   = document.getElementById('item-form');

document.getElementById('add-item-btn').addEventListener('click', () => {
  editingItemId = null;
  modalTitle.textContent = 'Aggiungi elemento';
  itemForm.reset();
  document.getElementById('item-quantity').value = 1;
  modal.classList.remove('hidden');
  document.getElementById('item-name').focus();
});

document.getElementById('modal-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
itemForm.addEventListener('submit', saveItem);

function openEditModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  editingItemId = id;
  modalTitle.textContent = 'Modifica elemento';
  document.getElementById('item-name').value        = item.name;
  document.getElementById('item-description').value = item.description || '';
  document.getElementById('item-quantity').value    = item.quantity_needed;
  modal.classList.remove('hidden');
  document.getElementById('item-name').focus();
}

function closeModal() {
  modal.classList.add('hidden');
  editingItemId = null;
  itemForm.reset();
}

async function saveItem(e) {
  e.preventDefault();
  const submitBtn = itemForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const payload = {
    name:            document.getElementById('item-name').value.trim(),
    description:     document.getElementById('item-description').value.trim(),
    quantity_needed: parseInt(document.getElementById('item-quantity').value, 10),
  };

  if (editingItemId) {
    await db.from('items').update(payload).eq('id', editingItemId);
  } else {
    await db.from('items').insert({ ...payload, is_active: true });
  }

  submitBtn.disabled = false;
  closeModal();
  loadAdminData();
}

// ── Toggle active ──
async function toggleActive(id, current) {
  await db.from('items').update({ is_active: !current }).eq('id', id);
  loadAdminData();
}

// ── Delete ──
async function deleteItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!confirm(`Eliminare "${item?.name}"?\nVerranno cancellate anche tutte le iscrizioni per questo elemento.`)) return;
  await db.from('items').delete().eq('id', id);
  loadAdminData();
}

// ── CSV export ──
document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

function exportCSV() {
  const rows = [
    ['Elemento', 'Ospite', 'Data iscrizione'],
    ...allSelections.map(s => [
      s.items?.name || '',
      s.guest_name,
      new Date(s.created_at).toLocaleString('it-IT'),
    ]),
  ];

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fuochi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Refresh button ──
document.getElementById('refresh-btn').addEventListener('click', loadAdminData);

// ── Utils ──
function esc(text) {
  const d = document.createElement('div');
  d.textContent = String(text);
  return d.innerHTML;
}
