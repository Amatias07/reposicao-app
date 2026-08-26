const STORAGE_KEY = 'reposicao-data-v2';

let state = loadState();
let tab = 'prateleiras';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return typeof SEED_DATA !== 'undefined' ? JSON.parse(JSON.stringify(SEED_DATA)) : { nextGroupId: 1, nextProductId: 1, nextBatchId: 1, groups: [], batches: [] };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 1600);
}

// ---- Date helpers ----
function daysLeft(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}
function statusInfo(days) {
  if (days < 0) return { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Expirado' };
  if (days <= 5) return { bg: 'var(--danger-bg)', color: 'var(--danger)', label: days + (days === 1 ? ' dia' : ' dias') };
  if (days <= 15) return { bg: 'var(--warning-bg)', color: 'var(--warning)', label: days + ' dias' };
  return { bg: 'var(--success-bg)', color: 'var(--success)', label: days + ' dias' };
}
function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ---- Image helper ----
function fileToDataUrl(file, cb) {
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

// ---- Dialogs ----
function openDialog(innerHtml, wire) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<div class="dialog-inner">${innerHtml}</div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  const close = () => { dlg.close(); dlg.remove(); };
  wire(dlg, close);
  return dlg;
}

function openConfirmDialog({ title, confirmLabel = 'Apagar', onConfirm }) {
  openDialog(`
    <p class="dtitle">${title}</p>
    <div class="dialog-actions">
      <button data-cancel>Cancelar</button>
      <button class="danger" data-ok>${confirmLabel}</button>
    </div>`, (dlg, close) => {
    dlg.querySelector('[data-cancel]').onclick = close;
    dlg.querySelector('[data-ok]').onclick = () => { onConfirm(); close(); };
  });
}

function openGroupDialog(onConfirm) {
  openDialog(`
    <p class="dtitle">Nova prateleira</p>
    <label>Nome</label>
    <input type="text" id="f-name" placeholder="ex: Prateleira X" maxlength="40">
    <div class="dialog-actions">
      <button data-cancel>Cancelar</button>
      <button class="primary" data-ok>Adicionar</button>
    </div>`, (dlg, close) => {
    const input = dlg.querySelector('#f-name');
    input.focus();
    dlg.querySelector('[data-cancel]').onclick = close;
    dlg.querySelector('[data-ok]').onclick = () => {
      const v = input.value.trim();
      if (v) { onConfirm(v); close(); }
    };
    input.onkeydown = e => { if (e.key === 'Enter') dlg.querySelector('[data-ok]').click(); };
  });
}

function openProductDialog(onConfirm) {
  let imgData = null;
  openDialog(`
    <p class="dtitle">Novo produto</p>
    <label>Nome</label>
    <input type="text" id="f-name" placeholder="ex: Coca-Cola 33cl" maxlength="40">
    <div class="img-picker-row">
      <img class="img-preview" id="f-preview" src="" style="display:none;">
      <div class="thumb-placeholder" id="f-preview-empty" style="cursor:default;">
        <i class="ti ti-photo" aria-hidden="true"></i>
      </div>
      <button type="button" class="img-pick-btn" id="f-pick">Adicionar imagem</button>
      <input type="file" id="f-file" accept="image/*">
    </div>
    <div class="dialog-actions">
      <button data-cancel>Cancelar</button>
      <button class="primary" data-ok>Adicionar</button>
    </div>`, (dlg, close) => {
    const input = dlg.querySelector('#f-name');
    input.focus();
    dlg.querySelector('#f-pick').onclick = () => dlg.querySelector('#f-file').click();
    dlg.querySelector('#f-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      fileToDataUrl(file, (dataUrl) => {
        imgData = dataUrl;
        dlg.querySelector('#f-preview').src = dataUrl;
        dlg.querySelector('#f-preview').style.display = 'block';
        dlg.querySelector('#f-preview-empty').style.display = 'none';
      });
    };
    dlg.querySelector('[data-cancel]').onclick = close;
    dlg.querySelector('[data-ok]').onclick = () => {
      const v = input.value.trim();
      if (v) { onConfirm(v, imgData); close(); }
    };
    input.onkeydown = e => { if (e.key === 'Enter') dlg.querySelector('[data-ok]').click(); };
  });
}

function openBatchDialog(onConfirm) {
  let imgData = null;
  const todayPlus10 = new Date(); todayPlus10.setDate(todayPlus10.getDate() + 10);
  const defaultDate = todayPlus10.toISOString().slice(0, 10);
  openDialog(`
    <p class="dtitle">Nova entrada com validade</p>
    <label>Produto</label>
    <input type="text" id="f-name" placeholder="ex: Chocolates" maxlength="40">
    <label>Quantidade</label>
    <input type="number" id="f-qty" min="1" value="1">
    <label>Validade</label>
    <input type="date" id="f-date" value="${defaultDate}">
    <div class="img-picker-row">
      <img class="img-preview" id="f-preview" src="" style="display:none;">
      <div class="thumb-placeholder" id="f-preview-empty" style="cursor:default;">
        <i class="ti ti-photo" aria-hidden="true"></i>
      </div>
      <button type="button" class="img-pick-btn" id="f-pick">Adicionar imagem</button>
      <input type="file" id="f-file" accept="image/*">
    </div>
    <div class="dialog-actions">
      <button data-cancel>Cancelar</button>
      <button class="primary" data-ok>Adicionar</button>
    </div>`, (dlg, close) => {
    const input = dlg.querySelector('#f-name');
    input.focus();
    dlg.querySelector('#f-pick').onclick = () => dlg.querySelector('#f-file').click();
    dlg.querySelector('#f-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      fileToDataUrl(file, (dataUrl) => {
        imgData = dataUrl;
        dlg.querySelector('#f-preview').src = dataUrl;
        dlg.querySelector('#f-preview').style.display = 'block';
        dlg.querySelector('#f-preview-empty').style.display = 'none';
      });
    };
    dlg.querySelector('[data-cancel]').onclick = close;
    dlg.querySelector('[data-ok]').onclick = () => {
      const name = input.value.trim();
      const qty = Math.max(1, parseInt(dlg.querySelector('#f-qty').value) || 1);
      const date = dlg.querySelector('#f-date').value;
      if (name && date) { onConfirm(name, qty, date, imgData); close(); }
    };
  });
}

// ---- Actions ----
function addGroup(name) { state.groups.push({ id: state.nextGroupId++, name, products: [] }); saveState(); render(); }
function addProduct(groupId, name, img) {
  const g = state.groups.find(x => x.id === groupId);
  g.products.push({ id: state.nextProductId++, name, qty: 0, img: img || null });
  saveState(); render();
}
function changeQty(productId, delta) {
  state.groups.forEach(g => g.products.forEach(p => { if (p.id === productId) p.qty = Math.max(0, p.qty + delta); }));
  saveState(); render();
}
function deleteProduct(productId) {
  state.groups.forEach(g => { g.products = g.products.filter(p => p.id !== productId); });
  saveState(); render();
}
function deleteGroup(groupId) { state.groups = state.groups.filter(g => g.id !== groupId); saveState(); render(); }
function clearAllQty() { state.groups.forEach(g => g.products.forEach(p => p.qty = 0)); saveState(); showToast('Quantidades limpas'); render(); }
function addBatch(product, qty, expiry, img) {
  state.batches.push({ id: state.nextBatchId++, product, qty, expiry, img: img || null });
  saveState(); render();
}
function deleteBatch(batchId) { state.batches = state.batches.filter(b => b.id !== batchId); saveState(); render(); }

// ---- Render ----
function render() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const app = document.getElementById('app');
  app.innerHTML = tab === 'validades' ? renderValidades() : tab === 'resumo' ? renderResumo() : renderPrateleiras();
  attachHandlers();
}

function thumbHtml(img, size) {
  if (img) return `<img class="thumb" src="${img}" style="width:${size}px;height:${size}px;">`;
  return `<div class="thumb-placeholder" style="width:${size}px;height:${size}px;"><i class="ti ti-photo" aria-hidden="true"></i></div>`;
}

function renderPrateleiras() {
  if (!state.groups.length) {
    return `<div class="empty-state">
        <p class="title">Sem prateleiras ainda</p>
        <p>Cria a primeira prateleira para começares a marcar o que falta.</p>
      </div>
      <button class="add-full-btn" id="add-group-btn">+ Nova prateleira</button>`;
  }
  let html = '';
  state.groups.forEach(g => {
    html += `<div class="card">
      <div class="card-head">
        <h3>${escapeHtml(g.name)}</h3>
        <div class="head-actions">
          <button class="add-product-btn" data-add-product="${g.id}">+ Produto</button>
          <button class="icon-btn danger" data-del-group="${g.id}" aria-label="Apagar prateleira"><i class="ti ti-trash" aria-hidden="true"></i></button>
        </div>
      </div>`;
    if (!g.products.length) html += `<p style="font-size:13px;color:var(--text-secondary);padding:6px 0;">Sem produtos nesta prateleira.</p>`;
    g.products.forEach(p => {
      html += `<div class="product-row">
        ${thumbHtml(p.img, 36)}
        <span class="pname">${escapeHtml(p.name)}</span>
        <div class="qty-controls">
          <button class="qty-btn" data-dec="${p.id}" aria-label="Diminuir">−</button>
          <span class="qty-value">${p.qty}</span>
          <button class="qty-btn" data-inc="${p.id}" aria-label="Aumentar">+</button>
          <button class="del-x" data-del-product="${p.id}" aria-label="Apagar produto"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  html += `<button class="add-full-btn" id="add-group-btn">+ Nova prateleira</button>`;
  html += `<button class="clear-btn" id="clear-btn">Limpar todas as quantidades</button>`;
  return html;
}

function restoreSeed() {
  if (typeof SEED_DATA === 'undefined') return;
  state = JSON.parse(JSON.stringify(SEED_DATA));
  saveState(); showToast('Produtos de exemplo repostos'); render();
}

function renderValidades() {
  if (!state.batches.length) {
    return `<div class="empty-state">
        <p class="title">Sem validades registadas</p>
        <p>Adiciona uma entrada para começares a acompanhar prazos de validade.</p>
      </div>
      <button class="add-full-btn" id="add-batch-btn">+ Nova entrada com validade</button>`;
  }
  const sorted = [...state.batches].sort((a, b) => daysLeft(a.expiry) - daysLeft(b.expiry));
  const grouped = {};
  sorted.forEach(b => { (grouped[b.product] = grouped[b.product] || []).push(b); });

  let html = '';
  Object.keys(grouped).forEach(prod => {
    html += `<p class="batch-group-label">${escapeHtml(prod)}</p>`;
    grouped[prod].forEach(b => {
      const days = daysLeft(b.expiry);
      const s = statusInfo(days);
      html += `<div class="batch-card">
        ${thumbHtml(b.img, 38)}
        <div class="batch-info">
          <p class="qty">Lote — qtd ${b.qty}</p>
          <p class="date">Validade: ${fmtDate(b.expiry)}</p>
        </div>
        <span class="badge" style="background:${s.bg};color:${s.color};">${s.label}</span>
        <button class="del-x" data-del-batch="${b.id}" aria-label="Apagar lote"><i class="ti ti-x" aria-hidden="true"></i></button>
      </div>`;
    });
  });
  html += `<button class="add-full-btn" id="add-batch-btn">+ Nova entrada com validade</button>`;
  return html;
}

function renderResumo() {
  const groupsWithItems = state.groups.map(g => ({ name: g.name, items: g.products.filter(p => p.qty > 0) })).filter(g => g.items.length);
  if (!groupsWithItems.length) {
    return `<div class="empty-state">
      <p class="title">Nada selecionado</p>
      <p>Marca quantidades nas prateleiras para veres aqui o que levar do armazém.</p>
    </div>`;
  }
  let html = '';
  groupsWithItems.forEach(g => {
    html += `<div class="summary-group"><h3>${escapeHtml(g.name)}</h3>`;
    g.items.forEach(p => { html += `<div class="summary-row"><span>${escapeHtml(p.name)}</span><span class="val">${p.qty}</span></div>`; });
    html += `</div>`;
  });
  return html;
}

function attachHandlers() {
  document.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => changeQty(+b.dataset.inc, 1));
  document.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => changeQty(+b.dataset.dec, -1));

  document.querySelectorAll('[data-add-product]').forEach(b => b.onclick = () => {
    const groupId = +b.dataset.addProduct;
    openProductDialog((name, img) => addProduct(groupId, name, img));
  });
  document.querySelectorAll('[data-del-product]').forEach(b => b.onclick = () => {
    const id = +b.dataset.delProduct;
    let name = '';
    state.groups.forEach(g => g.products.forEach(p => { if (p.id === id) name = p.name; }));
    openConfirmDialog({ title: `Apagar o produto "${name}"?`, onConfirm: () => deleteProduct(id) });
  });
  document.querySelectorAll('[data-del-group]').forEach(b => b.onclick = () => {
    const id = +b.dataset.delGroup;
    const g = state.groups.find(x => x.id === id);
    openConfirmDialog({ title: `Apagar a prateleira "${g.name}" e todos os seus produtos?`, onConfirm: () => deleteGroup(id) });
  });
  document.querySelectorAll('[data-del-batch]').forEach(b => b.onclick = () => {
    const id = +b.dataset.delBatch;
    openConfirmDialog({ title: 'Apagar este lote?', onConfirm: () => deleteBatch(id) });
  });

  const addGroupBtn = document.getElementById('add-group-btn');
  if (addGroupBtn) addGroupBtn.onclick = () => openGroupDialog(addGroup);

  const addBatchBtn = document.getElementById('add-batch-btn');
  if (addBatchBtn) addBatchBtn.onclick = () => openBatchDialog(addBatch);

  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) clearBtn.onclick = () => openConfirmDialog({ title: 'Limpar todas as quantidades selecionadas?', confirmLabel: 'Limpar', onConfirm: clearAllQty });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ---- Navigation ----
document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });

// ---- Service worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

render();
