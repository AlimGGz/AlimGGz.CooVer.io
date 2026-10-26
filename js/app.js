(function () {
  'use strict';
  const STORAGE_KEY = 'conteoverde_inventory_v1';
  const $ = id => document.getElementById(id);
  const fmt = number => Number(number).toLocaleString('es-MX', { maximumFractionDigits: 3 });
  const quantity = milli => fmt(milli / 1000);
  const safe = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const normalize = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
  const dateShort = iso => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  let state = null, selectedId = null, toastTimer = null, isImporting = false;

  function toast(message, error = false) {
    const node = $('toast'); node.textContent = message;
    node.classList.toggle('error', error); node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3500);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { toast('No se pudo guardar en este navegador. Descarga tu reporte antes de cerrar.', true); }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.products) && saved.products.length > 0 && Array.isArray(saved.actions)) {
        // Normalize totals to integer thousandths for older / incomplete records.
        for (const p of saved.products) {
          p.totalMilli = Number.isSafeInteger(p.totalMilli) ? p.totalMilli : 0;
          if (!Array.isArray(p.history)) p.history = [];
        }
        state = saved;
        selectedId = saved.selectedId || saved.products[0].id;
      }
    } catch { try { localStorage.removeItem(STORAGE_KEY); } catch { /* El almacenamiento local puede estar bloqueado. */ } }
  }
  function counts() {
    const counted = state.products.filter(p => p.totalMilli > 0).length;
    return { counted, pending: state.products.length - counted, percent: Math.round(counted / state.products.length * 100) };
  }
  function productById(id) { return state?.products.find(p => p.id === id); }
  function getFiltered() {
    if (!state) return [];
    const text = normalize($('search-input').value.trim());
    const family = $('family-filter').value, status = $('status-filter').value;
    return state.products.filter(p => {
      if (family !== 'all' && p.family !== family) return false;
      if (status === 'counted' && p.totalMilli <= 0) return false;
      if (status === 'pending' && p.totalMilli > 0) return false;
      return !text || normalize(`${p.description} ${p.family} ${p.code}`).includes(text);
    });
  }
  function renderStats() {
    const { counted, pending, percent } = counts();
    $('stat-total').textContent = fmt(state.products.length);
    $('stat-counted').textContent = fmt(counted);
    $('stat-pending').textContent = fmt(pending);
    $('stat-progress').textContent = `${percent}%`;
    $('progress-fill').style.width = `${percent}%`;
    $('session-tag').textContent = state.completedAt ? '● FINALIZADO' : '● EN PROGRESO';
    $('session-tag').title = `Archivo: ${state.filename}`;
    $('finalize-btn').textContent = state.completedAt ? 'Descargar reporte ↗' : 'Finalizar inventario ↗';
  }
  function renderList() {
    const matches = getFiltered();
    $('visible-count').textContent = fmt(matches.length);
    $('list-range').textContent = `${matches.length} de ${state.products.length}`;
    const fragment = document.createDocumentFragment();
    for (const p of matches) {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'product-item' + (p.id === selectedId ? ' selected' : '');
      item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(p.id === selectedId));
      const left = document.createElement('div'); left.className = 'product-item-left';
      const code = document.createElement('div'); code.className = 'product-item-code'; code.textContent = p.code ? `SKU ${p.code}` : 'PRODUCTO';
      const name = document.createElement('div'); name.className = 'product-item-name'; name.textContent = p.name || p.description;
      const family = document.createElement('div'); family.className = 'product-item-family'; family.textContent = p.family;
      const qty = document.createElement('span'); qty.className = 'product-item-qty' + (p.totalMilli > 0 ? ' positive' : ''); qty.textContent = quantity(p.totalMilli);
      left.append(code, name, family); item.append(left, qty);
      item.addEventListener('click', () => { selectedId = p.id; state.selectedId = selectedId; save(); renderList(); renderDetail(); });
      fragment.append(item);
    }
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'no-results'; empty.textContent = 'No encontramos artículos con esos filtros.';
      fragment.append(empty);
    }
    $('product-list').replaceChildren(fragment);
  }
  function renderDetail() {
    const p = productById(selectedId);
    if (!p) { $('detail-content').innerHTML = '<div class="empty-detail"><h2>Selecciona un producto</h2></div>'; return; }
    const closed = Boolean(state.completedAt);
    $('detail-status').textContent = closed ? 'Finalizado' : (p.totalMilli > 0 ? '✓ Con conteo' : 'Sin conteo');
    $('detail-status').className = 'status-pill' + (closed ? ' closed' : (p.totalMilli > 0 ? ' done' : ''));
    const history = [...p.history].reverse().slice(0, 5);
    $('detail-content').innerHTML = `
      <div class="detail-product">
        <h2 class="detail-name">${safe(p.name || p.description)}</h2>
        <div class="detail-meta"><span class="meta-tag">${p.code ? 'SKU ' + safe(p.code) : 'Sin código'}</span><span class="meta-tag">${safe(p.family)}</span><span class="meta-tag">${safe(p.unit || 'Unidad no indicada')}</span></div>
      </div>
      <div class="total-card"><span>TOTAL CONTADO</span><div class="total-display">${quantity(p.totalMilli)}</div><div class="total-unit">${safe(p.unit || 'UNIDADES')}</div></div>
      ${closed ? `<div class="closed-note">Este inventario está finalizado. Puedes descargar el reporte o reabrirlo para corregir algún conteo.</div><button class="button button-outline reopen-button" id="reopen-btn" type="button">Reabrir inventario</button>` : `
      <div class="add-section"><div class="field-heading">AGREGAR CANTIDAD CONTADA</div><div class="amount-row"><input class="amount-input" type="text" inputmode="decimal" autocomplete="off" id="amount-input" placeholder="Ej. 1.5" aria-label="Cantidad que deseas sumar"/><button class="button button-primary" type="button" id="add-button">+ Sumar cantidad</button></div>
      <div class="quick-buttons"><button type="button" data-quick="0.5">+ 0.5</button><button type="button" data-quick="1">+ 1</button><button type="button" data-quick="5">+ 5</button></div></div>`}
      <div class="history-head"><strong>Historial del producto</strong><button type="button" class="text-button" id="undo-button" ${closed || !p.history.length ? 'disabled' : ''}>↶ Deshacer último</button></div>
      <div class="history-list">${history.length ? history.map(h => `<div class="history-entry"><span>${safe(dateShort(h.at))}</span><strong>+ ${quantity(h.milli)} ${safe(p.unit)}</strong></div>`).join('') : '<p class="empty-note">Todavía no hay conteos de este producto.</p>'}</div>`;
    if (closed) $('reopen-btn').addEventListener('click', () => {
      if (confirm('¿Quieres reabrir el inventario para continuar editando los conteos?')) {
        state.completedAt = null; save(); render(); toast('Inventario reabierto. Ya puedes continuar contando.');
      }
    });
    else {
      $('amount-input').addEventListener('keydown', event => { if (event.key === 'Enter') addTypedAmount(); });
      $('add-button').addEventListener('click', addTypedAmount);
      document.querySelectorAll('[data-quick]').forEach(btn => btn.addEventListener('click', () => addAmount(btn.dataset.quick)));
    }
    $('undo-button').addEventListener('click', undoLast);
  }
  function parseAmount(raw) {
    const value = String(raw).trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
    const milli = Math.round(Number(value) * 1000);
    return Number.isSafeInteger(milli) && milli > 0 ? milli : null;
  }
  function addTypedAmount() { addAmount($('amount-input').value); }
  function addAmount(amount) {
    if (!state || state.completedAt) return;
    const milli = parseAmount(amount);
    if (milli === null) { toast('Escribe una cantidad positiva, con máximo tres decimales (ej. 2.5).', true); $('amount-input')?.focus(); return; }
    const p = productById(selectedId);
    if (!p || !Number.isSafeInteger(p.totalMilli + milli)) { toast('Cantidad demasiado grande.', true); return; }
    const id = `a-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const at = new Date().toISOString();
    p.totalMilli += milli;
    p.history.push({ id, milli, at });
    state.actions.push({ id, productId: p.id, milli, at });
    save(); render(); toast(`Se sumaron ${quantity(milli)} a ${p.code || p.name}.`);
  }
  function undoLast() {
    if (!state || state.completedAt) return;
    const p = productById(selectedId);
    if (!p || !p.history.length) return;
    const change = p.history.pop();
    p.totalMilli = Math.max(0,p.totalMilli - change.milli);
    state.actions = state.actions.filter(a => a.id !== change.id);
    save(); render(); toast('Se deshizo el último conteo de este producto.');
  }
  function renderRecent() {
    const rows = [...state.actions].reverse().slice(0,5);
    if (!rows.length) { $('recent-content').innerHTML = '<p class="empty-note">Los movimientos que registres aparecerán aquí.</p>'; return; }
    $('recent-content').innerHTML = rows.map(a => {
      const p = productById(a.productId);
      if (!p) return '';
      return `<div class="recent-row"><div><strong>${safe(p.name || p.description)}</strong><small>${safe(p.code)} · ${safe(p.family)}</small></div><span class="recent-qty">+ ${quantity(a.milli)} ${safe(p.unit)}</span><time class="recent-time">${safe(dateShort(a.at))}</time></div>`;
    }).join('');
  }
  function render() {
    $('setup-section').hidden = Boolean(state);
    $('workspace').hidden = !state;
    $('hero-actions').hidden = !state;
    $('change-file-btn').disabled = !state;
    if (!state) return;
    if (!productById(selectedId)) selectedId = state.products[0]?.id;
    renderStats(); renderList(); renderDetail(); renderRecent();
  }
  async function importFile(file) {
    if (!file || isImporting) return;
    isImporting = true;
    const input = $('file-input');
    try {
      const imported = await InventoryExcel.readExcel(file);
      if (state && !confirm(`Ya hay un inventario cargado (${state.products.length} productos). Si importas otro Excel, se reemplazará y se perderán los conteos actuales de este navegador. ¿Continuar?`)) return;
      state = { filename: imported.filename, worksheet: imported.worksheet, importedAt: new Date().toISOString(), completedAt: null, products: imported.products, actions: [], selectedId: imported.products[0].id };
      selectedId = state.selectedId;
      $('search-input').value = ''; $('status-filter').value = 'all';
      const familyOptions = [...new Set(state.products.map(p => p.family))].sort((a,b) => a.localeCompare(b,'es-MX'));
      setFamilyOptions(familyOptions);
      save(); render(); toast(`${state.products.length} productos cargados. ¡Comienza tu inventario!`);
    } catch(error) { console.error(error); toast(error?.message || 'No se pudo cargar el Excel.', true); }
    finally { input.value = ''; isImporting = false; }
  }
  function setFamilyOptions(families) {
    $('family-filter').replaceChildren(new Option('Todas las familias', 'all'), ...families.map(f => new Option(f, f)));
  }
  function openExport() {
    if (!state) return;
    $('export-quantity').textContent = fmt(counts().counted);
    $('export-total').textContent = fmt(state.products.length);
    $('export-modal').hidden = false;
    $('close-modal').focus();
  }
  function closeExport() { $('export-modal').hidden = true; $('finalize-btn').focus(); }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }
  async function generateReport() {
    if (!state) return;
    const btn = $('download-btn');
    const format = document.querySelector('input[name="export-format"]:checked').value;
    const data = $('include-zero').checked ? state.products : state.products.filter(p => p.totalMilli > 0);
    if (!data.length && !$('include-zero').checked) { toast('No hay productos contabilizados. Activa «Incluir productos sin conteo».', true); return; }
    btn.disabled = true; btn.textContent = 'Generando reporte…';
    try {
      const info = {filename:state.filename, importedAt:state.importedAt};
      const blob = format === 'xlsx' ? await InventoryExcel.exportExcel(data, info) : InventoryPDF.exportPDF(data, info);
      const now = new Date(); const day = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
      download(blob,`Inventario_Contado_${day}.${format}`);
      state.completedAt = new Date().toISOString(); save();
      $('export-modal').hidden = true; render();
      toast(`¡Inventario finalizado! Reporte ${format.toUpperCase()} descargado.`);
    } catch(error) { console.error(error); toast('Hubo un problema al generar el reporte. Vuelve a intentarlo.', true); }
    finally { btn.disabled = false; btn.innerHTML = 'Generar y descargar reporte <span aria-hidden="true">↓</span>'; }
  }
  function resetCounts() {
    if (!state) return;
    if (!confirm('¿Reiniciar todos los conteos? Esto pondrá los totales en cero y borrará el historial. Esta acción no se puede deshacer.')) return;
    for (const p of state.products) { p.totalMilli = 0; p.history = []; }
    state.actions = []; state.completedAt = null;
    save(); render(); toast('Se reiniciaron los conteos de todos los productos.');
  }
  function wire() {
    $('change-file-btn').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', e => importFile(e.target.files[0]));
    $('drop-zone').addEventListener('click', () => $('file-input').click());
    $('drop-zone').addEventListener('keydown', e => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); $('file-input').click(); } });
    for (const event of ['dragenter','dragover']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.add('drag-over'); });
    for (const event of ['dragleave','drop']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.remove('drag-over'); });
    $('drop-zone').addEventListener('drop', e => importFile(e.dataTransfer?.files?.[0]));
    $('search-input').addEventListener('input', renderList);
    $('search-input').addEventListener('keydown',e=>{ if(e.key==='Enter'){const first=getFiltered()[0];if(first){selectedId=first.id;state.selectedId=selectedId;save();renderList();renderDetail();$('amount-input')?.focus();}} });
    $('family-filter').addEventListener('change', renderList);
    $('status-filter').addEventListener('change', renderList);
    $('finalize-btn').addEventListener('click', openExport);
    $('close-modal').addEventListener('click', closeExport);
    $('export-modal').addEventListener('click',e=>{if(e.target===$('export-modal'))closeExport();});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape' && !$('export-modal').hidden)closeExport();
      if(e.key==='/' && $('export-modal').hidden && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();if(state)$('search-input').focus();}
    });
    $('download-btn').addEventListener('click',generateReport);
    $('reset-btn').addEventListener('click',resetCounts);
  }
  restore();
  if (state) setFamilyOptions([...new Set(state.products.map(p=>p.family))].sort((a,b)=>a.localeCompare(b,'es-MX')));
  wire(); render();
})();
