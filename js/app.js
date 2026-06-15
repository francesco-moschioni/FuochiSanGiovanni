// ============================================================
//  Pagina ospiti — Fuochi di San Giovanni
// ============================================================

let guestName    = localStorage.getItem('guestName') || '';
let items        = [];
let selectionsMap = {};
let mySelections  = new Set();
let otherItems    = [];
let myOtherItem   = null;
let commentLoaded = false;

// ── DOM references ──
const nameSection    = document.getElementById('name-section');
const closedSection  = document.getElementById('closed-section');
const itemsSection   = document.getElementById('items-section');
const guestNameInput = document.getElementById('guest-name');
const confirmNameBtn = document.getElementById('confirm-name-btn');
const changeNameBtn  = document.getElementById('change-name-btn');
const displayNameEl  = document.getElementById('display-name');
const itemsGrid      = document.getElementById('items-grid');
const altroCard      = document.getElementById('altro-card');
const emptyState     = document.getElementById('empty-state');
const loadingEl      = document.getElementById('loading');

// ── Controlla se la lista è aperta ──
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

// ── Init ──
async function init() {
  const enabled = await checkBookingEnabled();
  if (!enabled) {
    nameSection.classList.add('hidden');
    closedSection.classList.remove('hidden');
    return;
  }
  if (guestName) {
    showItemsSection();
  } else {
    guestNameInput.focus();
  }
}

init();

// ── Event listeners ──
guestNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') confirmName(); });
confirmNameBtn.addEventListener('click', confirmName);

changeNameBtn.addEventListener('click', () => {
  localStorage.removeItem('guestName');
  guestName = '';
  commentLoaded = false;
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
  altroCard.classList.add('hidden');

  await loadData();
  subscribeToChanges();
}

// ── Load data from Supabase ──
async function loadData() {
  const [{ data: itemsData }, { data: selData }, { data: otherData }, { data: commentData }] = await Promise.all([
    window.dbClient.from('items').select('*').eq('is_active', true).order('created_at'),
    window.dbClient.from('selections').select('item_id, guest_name'),
    window.dbClient.from('other_items').select('*').order('created_at'),
    window.dbClient.from('comments').select('content').eq('guest_name', guestName).maybeSingle(),
  ]);

  items       = itemsData  || [];
  otherItems  = otherData  || [];
  myOtherItem = otherItems.find(o => o.guest_name.toLowerCase() === guestName.toLowerCase()) || null;

  selectionsMap = {};
  mySelections  = new Set();
  for (const sel of (selData || [])) {
    if (!selectionsMap[sel.item_id]) selectionsMap[sel.item_id] = [];
    selectionsMap[sel.item_id].push(sel.guest_name);
    if (sel.guest_name.toLowerCase() === guestName.toLowerCase()) {
      mySelections.add(sel.item_id);
    }
  }

  // Popola il commento solo al primo caricamento (evita di sovrascrivere mentre si scrive)
  if (!commentLoaded) {
    const ta = document.getElementById('comment-textarea');
    if (ta) ta.value = commentData?.content || '';
    commentLoaded = true;
    document.getElementById('comment-section')?.classList.remove('hidden');
  }

  renderItems();
}

// ── Render items ──
function renderItems() {
  loadingEl.classList.add('hidden');
  itemsGrid.classList.remove('hidden');
  altroCard.classList.remove('hidden');

  const visible = items.filter(item => {
    const count  = (selectionsMap[item.id] || []).length;
    const isFull = count >= item.quantity_needed;
    return !isFull || mySelections.has(item.id);
  });

  if (visible.length === 0) {
    emptyState.classList.remove('hidden');
    itemsGrid.innerHTML = '';
  } else {
    emptyState.classList.add('hidden');
    itemsGrid.innerHTML = visible.map(item => {
      const count      = (selectionsMap[item.id] || []).length;
      const isFull     = count >= item.quantity_needed;
      const isSelected = mySelections.has(item.id);
      const pct        = Math.min(100, Math.round((count / item.quantity_needed) * 100));

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

  renderAltroCard();
}

// ── Render card "Altro" ──
function renderAltroCard() {
  const others = otherItems.filter(o => o.guest_name.toLowerCase() !== guestName.toLowerCase());
  const desc = others.map(o => `<strong>${esc(o.guest_name)}</strong>: ${esc(o.description)}`).join(' &middot; ');

  altroCard.innerHTML = `
    <div class="item-card ${myOtherItem ? 'selected' : ''}">
      <div class="item-content">
        <h3 class="item-name">Altro</h3>
        ${desc ? `<p class="item-desc" style="margin-top:.35rem;">${desc}</p>` : ''}
        ${myOtherItem ? `
          <div class="item-meta" style="margin-top:.5rem;">
            <span class="badge badge-mine">Tu porti: ${esc(myOtherItem.description)} ✓</span>
          </div>` : ''}
      </div>
      ${myOtherItem
        ? `<button class="item-btn btn-remove" onclick="removeOtherItem()">Rimuovi</button>`
        : `<div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.5rem;">
            <input
              type="text" id="other-item-input"
              placeholder="Es. torta, chitarra, sdraio..."
              maxlength="120"
              style="padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-size:.9rem;font-family:inherit;outline:none;transition:border-color .18s ease;"
              onfocus="this.style.borderColor='var(--blue-mid)'"
              onblur="this.style.borderColor='var(--border)'"
              onkeypress="if(event.key==='Enter') saveOtherItem()"
            />
            <button class="item-btn btn-add" onclick="saveOtherItem()">Aggiungo io!</button>
          </div>`
      }
    </div>
  `;
}

// ── Salva "Altro" ──
async function saveOtherItem() {
  const input = document.getElementById('other-item-input');
  const desc  = input?.value.trim();
  if (!desc) {
    input?.classList.add('shake');
    setTimeout(() => input?.classList.remove('shake'), 500);
    return;
  }
  await window.dbClient
    .from('other_items')
    .upsert({ guest_name: guestName, description: desc }, { onConflict: 'guest_name' });
  await loadData();
}

// ── Rimuovi "Altro" ──
async function removeOtherItem() {
  await window.dbClient
    .from('other_items')
    .delete()
    .ilike('guest_name', guestName);
  await loadData();
}

// ── Salva commento ──
async function saveComment() {
  const ta      = document.getElementById('comment-textarea');
  const content = ta?.value.trim();
  if (!content) return;

  await window.dbClient
    .from('comments')
    .upsert({ guest_name: guestName, content }, { onConflict: 'guest_name' });

  const msg = document.getElementById('comment-saved-msg');
  msg?.classList.remove('hidden');
  setTimeout(() => msg?.classList.add('hidden'), 2500);
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'selections' },  loadData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' },       loadData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'other_items' }, loadData)
    .subscribe();
}

// ── Utils ──
function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
