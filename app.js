// app.js
(function () {
  'use strict';
  if (!Auth.isLoggedIn()) return;
 
  const CFG = window.APP_CONFIG;
  const DATA = window.PRICE_DATA;
  const TERMS = [12, 18, 24, 30, 36];
  const CUSTOM_KEY = 'sumisho_custom_units_v1';
  const BRAND_KEY = 'sumisho_last_brand';
 
  const $ = (id) => document.getElementById(id);
  const el = {
    results: $('results'), search: $('searchInput'), clear: $('clearSearch'),
    term: $('termFilter'), sort: $('sortSelect'), reset: $('resetBtn'), toggleAll: $('toggleAll'),
    brandFooter: $('brandFooter'), modelCount: $('modelCount'), rowCount: $('rowCount'),
    tabs: document.querySelectorAll('.tab'), dlg: $('addDialog'), form: $('addForm'), formError: $('formError'),
    toast: $('toast')
  };
  $('storeName').textContent = CFG.storeName;
 
  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const peso = (n) => '₱' + Number(n).toLocaleString('en-PH');
  const num = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₱\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
 
  // ---------- data ----------
  const baseCache = {};
  function baseRows(brand) {
    if (!baseCache[brand]) {
      baseCache[brand] = DATA[brand].rows.map((r, i) => ({
        uid: brand + '-' + i, custom: false,
        model: r[0], code: r[1] && r[1] !== '-' ? r[1] : '', srp: r[2], dp: r[3],
        t: r.slice(4, 9).map(num)
      }));
    }
    return baseCache[brand];
  }
  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {}; } catch (e) { return {}; }
  }
  let custom = loadCustom();
  function saveCustom() {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); }
    catch (e) { toast('Could not save – storage is full or blocked'); }
  }
  const allRows = (brand) => baseRows(brand).concat((custom[brand] || []).map((c) => ({ ...c, custom: true, uid: 'c-' + c.id })));
 
  // ---------- state ----------
  let brand = 'honda';
  try { const b = localStorage.getItem(BRAND_KEY); if (DATA[b]) brand = b; } catch (e) {}
  let visible = new Map();
 
  // ---------- filtering / grouping ----------
  function getFiltered() {
    const q = el.search.value.trim().toLowerCase();
    const digits = q.replace(/[₱,\s]/g, '');
    const term = el.term.value;
    const ti = term === 'all' ? -1 : TERMS.indexOf(Number(term));
    return allRows(brand).filter((r) => {
      if (q) {
        const hit = r.model.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) ||
          (/^\d+$/.test(digits) && (String(r.srp).includes(digits) || String(r.dp).includes(digits)));
        if (!hit) return false;
      }
      return ti < 0 || r.t[ti] !== null;
    });
  }
  function group(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const k = [r.model, r.code, r.srp].join('|');
      if (!map.has(k)) map.set(k, { model: r.model, code: r.code, srp: r.srp, opts: [] });
      map.get(k).opts.push(r);
    });
    const list = [...map.values()];
    const s = el.sort.value;
    if (s === 'srp-asc') list.sort((a, b) => a.srp - b.srp);
    else if (s === 'srp-desc') list.sort((a, b) => b.srp - a.srp);
    else if (s === 'name') list.sort((a, b) => a.model.localeCompare(b.model));
    return list;
  }
 
  // ---------- render ----------
  function render() {
    const rows = getFiltered();
    const groups = group(rows);
    const hl = el.term.value === 'all' ? -1 : TERMS.indexOf(Number(el.term.value));
    visible = new Map(rows.map((r) => [r.uid, r]));
    el.clear.hidden = !el.search.value;
 
    if (!groups.length) {
      el.results.innerHTML = '<div class="empty"><i class="fas fa-search-minus"></i>No models found</div>';
    } else {
      const autoOpen = false; // cards stay closed until tapped
      el.results.innerHTML = groups.map((g) => {
        const opts = g.opts.map((r) => {
          const terms = TERMS.map((m, i) => hl >= 0 && i !== hl ? '' : `<span class="term${r.t[i] === null ? ' na' : ''}${i === hl ? ' hl' : ''}"><b>${m} mo.</b>${r.t[i] === null ? '—' : peso(r.t[i])}</span>`).join('');
          return `<div class="opt">
            <button type="button" class="opt-main${hl >= 0 ? ' one' : ''}" data-uid="${esc(r.uid)}" aria-label="Copy quote for ${esc(g.model)}, down payment ${peso(r.dp)}">
              <span class="opt-dp"><small>Down payment</small>${peso(r.dp)}</span>
              <span class="terms${hl >= 0 ? ' single' : ''}">${terms}</span>
              <span class="opt-copy"><i class="far fa-copy"></i></span>
            </button>
            ${r.custom ? `<button type="button" class="opt-del" data-del="${esc(r.uid)}" aria-label="Delete this unit"><i class="fas fa-trash-alt"></i></button>` : ''}
          </div>`;
        }).join('');
        return `<details class="card"${autoOpen ? ' open' : ''}>
          <summary>
            <span class="card-title"><strong>${esc(g.model)}</strong>${g.code ? `<span class="chip">${esc(g.code)}</span>` : ''}</span>
            <span class="card-stats">
              <span class="stat srp"><small>SRP</small><strong>${peso(g.srp)}</strong></span>
            </span>
            <i class="fas fa-chevron-down chev"></i>
          </summary>
          <div class="opts"><div class="opts-head${hl >= 0 ? ' one' : ''}"><span>Down payment</span><span>${hl >= 0 ? TERMS[hl] + '-month installment' : 'Monthly installment by term'}</span></div>${opts}</div>
        </details>`;
      }).join('');
    }
    el.modelCount.textContent = groups.length;
    el.rowCount.textContent = rows.length;
    syncToggleIcon();
  }
 
  function syncToggleIcon() {
    const any = el.results.querySelector('details[open]');
    el.toggleAll.firstElementChild.className = any ? 'fas fa-angle-double-up' : 'fas fa-angle-double-down';
  }
 
  function setBrand(b, persist) {
    brand = b;
    if (persist) { try { localStorage.setItem(BRAND_KEY, b); } catch (e) {} }
    el.tabs.forEach((t) => { const on = t.dataset.brand === b; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
    el.brandFooter.textContent = cap(b);
    $('dlgTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add to ' + cap(b);
    el.search.value = ''; el.term.value = 'all';
    render();
    window.scrollTo({ top: 0 });
  }
 
  // ---------- copy ----------
  function quoteText(r) {
    const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const t = (i) => (r.t[i] === null ? 'N/A' : peso(r.t[i]));
    const sel = el.term.value === 'all' ? -1 : TERMS.indexOf(Number(el.term.value));
    const idx = sel >= 0 ? [sel] : TERMS.map((_, i) => i);
    const out = [
      `🏍️ ${CFG.storeName} - ${brand.toUpperCase()}`, line,
      `Model: ${r.model}${r.code ? ' (' + r.code + ')' : ''}`,
      `SRP: ${peso(r.srp)}`, `Down Payment: ${peso(r.dp)}`, line,
      '📊 INSTALLMENT PLANS', line,
      ...idx.map((i) => `${TERMS[i]} months: ${t(i)}`)
    ];
    if (CFG.rebit) out.push(`Rebit: ${CFG.rebit}`);
    return out.join('\n');
  }
  function copy(text) {
    const done = () => toast('✅ Quote copied');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;font-size:16px';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); ok ? done() : toast('❌ Copy failed – please copy manually');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }
 
  // ---------- events ----------
  el.results.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      const r = visible.get(del.dataset.del);
      if (r && confirm('Delete this unit from your list?\n' + r.model + ' – DP ' + peso(r.dp))) {
        custom[brand] = (custom[brand] || []).filter((c) => 'c-' + c.id !== r.uid);
        saveCustom(); render(); toast('Unit deleted');
      }
      return;
    }
    const main = e.target.closest('.opt-main');
    if (main) { const r = visible.get(main.dataset.uid); if (r) copy(quoteText(r)); }
  });
  el.results.addEventListener('toggle', syncToggleIcon, true);
 
  let debounce;
  el.search.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(render, 120); });
  el.clear.addEventListener('click', () => { el.search.value = ''; render(); el.search.focus(); });
  el.term.addEventListener('change', render);
  el.sort.addEventListener('change', render);
  el.reset.addEventListener('click', () => { el.search.value = ''; el.term.value = 'all'; el.sort.value = 'default'; render(); });
  el.toggleAll.addEventListener('click', () => {
    const open = !el.results.querySelector('details[open]');
    el.results.querySelectorAll('details').forEach((d) => (d.open = open));
    syncToggleIcon();
  });
  el.tabs.forEach((t) => t.addEventListener('click', () => { if (t.dataset.brand !== brand) setBrand(t.dataset.brand, true); }));
  $('logoutBtn').addEventListener('click', () => Auth.logout());
 
  // ---------- add unit dialog ----------
  const openDlg = () => { el.formError.textContent = ''; el.dlg.showModal(); $('fModel').focus(); };
  const closeDlg = () => { el.dlg.close(); el.form.reset(); };
  $('addUnitBtn').addEventListener('click', openDlg);
  $('dlgClose').addEventListener('click', closeDlg);
  $('dlgCancel').addEventListener('click', closeDlg);
  el.dlg.addEventListener('click', (e) => { if (e.target === el.dlg) closeDlg(); });
  el.dlg.addEventListener('cancel', () => el.form.reset());
 
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const model = $('fModel').value.trim();
    const srp = num($('fSrp').value), dp = num($('fDp').value);
    if (!model) return (el.formError.textContent = 'Please enter the model name.');
    if (!srp || !dp) return (el.formError.textContent = 'SRP and down payment must be numbers.');
    if (dp >= srp) return (el.formError.textContent = 'Down payment must be lower than SRP.');
    const t = TERMS.map((m) => num($('f' + m).value));
    if (t.every((v) => v === null)) return (el.formError.textContent = 'Enter at least one monthly amount.');
    (custom[brand] = custom[brand] || []).push({ id: Date.now().toString(36), model, code: $('fCode').value.trim(), srp, dp, t });
    saveCustom(); closeDlg();
    el.search.value = model; el.term.value = 'all'; render();
    toast('Unit added');
  });
 
  setBrand(brand, false);
})();