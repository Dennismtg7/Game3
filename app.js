(() => {
  "use strict";

  // ---------- storage keys ----------
  const INDEX_KEY = "fieldbook:__index";
  const CURRENT_KEY = "fieldbook:__current";
  const CURRENT_NAME_KEY = "fieldbook:__currentName";
  const projectKey = (name) => `fieldbook:project:${name}`;

  // ---------- state ----------
  let sheet = loadCurrent() || blankSheet();
  let currentName = localStorage.getItem(CURRENT_NAME_KEY) || null;

  function blankSheet() {
    return {
      date: "",
      levelType: "",
      surveyor: "",
      booker: "",
      fromPoint: "",
      toPoint: "",
      startRL: "100.000",
      rows: [emptyRow(), emptyRow(), emptyRow()],
    };
  }

  function emptyRow() {
    return { id: cryptoId(), bs: "", is: "", fs: "", distance: "", remarks: "" };
  }

  function cryptoId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function loadCurrent() {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ---------- calculation ----------
  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  function fmt(n) {
    return n === null || n === undefined ? "" : n.toFixed(3);
  }

  function computeRows(rows, startRL) {
    let prevReading = null;
    let prevRL = num(startRL);
    const firstRL = prevRL;
    const out = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const bs = num(r.bs), is = num(r.is), fs = num(r.fs);
      const current = bs !== null ? bs : is !== null ? is : fs !== null ? fs : null;

      let rise = null, fall = null, rl = null;

      if (i === 0) {
        rl = prevRL;
      } else if (current !== null && prevReading !== null && prevRL !== null) {
        const diff = prevReading - current;
        if (diff >= 0) rise = diff;
        else fall = -diff;
        rl = prevRL + (rise || 0) - (fall || 0);
      }

      out.push({ ...r, rise, fall, rl });

      if (current !== null) {
        prevReading = current;
        prevRL = rl !== null ? rl : prevRL;
      }
    }

    const lastRL = out.length ? out[out.length - 1].rl : null;
    return { rows: out, firstRL, lastRL };
  }

  // ---------- DOM refs ----------
  const rowBody = document.getElementById("row-body");
  const metaGrid = document.getElementById("meta-grid");
  const saveMsgEl = document.getElementById("save-msg");
  const activeProjectEl = document.getElementById("active-project");

  // ---------- rendering ----------
  function renderMeta() {
    metaGrid.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      input.value = sheet[field] ?? "";
    });
  }

  function renderRows() {
    rowBody.innerHTML = "";
    sheet.rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (i % 2 === 1) tr.className = "row-alt";
      tr.dataset.id = r.id;
      tr.innerHTML = `
        <td><input class="cell-input bs" data-field="bs" value="${escapeAttr(r.bs)}" inputmode="decimal" /></td>
        <td><input class="cell-input" data-field="is" value="${escapeAttr(r.is)}" inputmode="decimal" /></td>
        <td><input class="cell-input fs" data-field="fs" value="${escapeAttr(r.fs)}" inputmode="decimal" /></td>
        <td><div class="readonly-cell" data-out="rise"></div></td>
        <td><div class="readonly-cell" data-out="fall"></div></td>
        <td><div class="readonly-cell rl" data-out="rl"></div></td>
        <td><input class="cell-input plain" data-field="distance" value="${escapeAttr(r.distance)}" /></td>
        <td class="remarks-cell"><input class="cell-input plain" data-field="remarks" value="${escapeAttr(r.remarks)}" /></td>
        <td style="text-align:center"><button class="delete-btn" data-action="delete" title="Delete row">✕</button></td>
      `;
      rowBody.appendChild(tr);
    });
    updateDerived();
  }

  function updateDerived() {
    const { rows: computed, firstRL, lastRL } = computeRows(sheet.rows, sheet.startRL);

    computed.forEach((r) => {
      const tr = rowBody.querySelector(`tr[data-id="${r.id}"]`);
      if (!tr) return;
      tr.querySelector('[data-out="rise"]').textContent = fmt(r.rise);
      tr.querySelector('[data-out="fall"]').textContent = fmt(r.fall);
      tr.querySelector('[data-out="rl"]').textContent = fmt(r.rl);
    });

    const totals = computed.reduce(
      (acc, r) => {
        acc.bs += num(r.bs) || 0;
        acc.fs += num(r.fs) || 0;
        acc.rise += r.rise || 0;
        acc.fall += r.fall || 0;
        return acc;
      },
      { bs: 0, fs: 0, rise: 0, fall: 0 }
    );

    const checkA = (totals.bs - totals.fs);
    const checkB = (totals.rise - totals.fall);
    const checkC = firstRL !== null && lastRL !== null ? (lastRL - firstRL) : null;
    const balanced =
      checkC !== null &&
      Math.abs(checkA - checkB) < 0.0015 &&
      Math.abs(checkA - checkC) < 0.0015;

    document.getElementById("chk-bs").textContent = totals.bs.toFixed(3);
    document.getElementById("chk-fs").textContent = totals.fs.toFixed(3);
    document.getElementById("chk-a").textContent = checkA.toFixed(3);
    document.getElementById("chk-b").textContent = checkB.toFixed(3);
    document.getElementById("chk-c").textContent = checkC !== null ? checkC.toFixed(3) : "—";

    const badge = document.getElementById("check-badge");
    badge.textContent = balanced ? "✓ Checks agree — booking balances" : "checks do not yet agree";
    badge.className = "check-badge " + (balanced ? "check-ok" : "check-bad");
  }

  function escapeAttr(v) {
    return String(v ?? "").replace(/"/g, "&quot;");
  }

  function renderActiveProject() {
    activeProjectEl.textContent = currentName ? `— ${currentName}` : "";
  }

  // ---------- persistence ----------
  let saveTimer = null;
  function persistCurrent() {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(sheet));
    if (currentName) {
      localStorage.setItem(projectKey(currentName), JSON.stringify(sheet));
      localStorage.setItem(CURRENT_NAME_KEY, currentName);
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistCurrent, 400);
  }

  function getIndex() {
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function setIndex(list) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  }
  function ensureIndexed(name) {
    const list = getIndex();
    if (!list.includes(name)) {
      list.push(name);
      setIndex(list);
    }
  }

  // ---------- event handlers ----------
  metaGrid.addEventListener("input", (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    sheet[field] = e.target.value;
    if (field === "startRL") updateDerived();
    scheduleSave();
  });

  rowBody.addEventListener("input", (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    const tr = e.target.closest("tr");
    const id = tr.dataset.id;
    const row = sheet.rows.find((r) => r.id === id);
    if (!row) return;
    row[field] = e.target.value;
    if (field === "bs" || field === "is" || field === "fs") updateDerived();
    scheduleSave();
  });

  rowBody.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr.dataset.id;
    sheet.rows = sheet.rows.filter((r) => r.id !== id);
    renderRows();
    scheduleSave();
  });

  document.getElementById("btn-add-row").addEventListener("click", () => {
    sheet.rows.push(emptyRow());
    renderRows();
    scheduleSave();
  });

  document.getElementById("btn-new").addEventListener("click", () => {
    if (confirm("Clear this field book and start a new one? Unsaved changes to any named project are already autosaved, but this current sheet will be replaced.")) {
      sheet = blankSheet();
      currentName = null;
      localStorage.removeItem(CURRENT_NAME_KEY);
      renderMeta();
      renderRows();
      renderActiveProject();
      persistCurrent();
    }
  });

  document.getElementById("btn-save").addEventListener("click", () => {
    const suggestion = currentName || (sheet.fromPoint ? `${sheet.fromPoint}_${sheet.date || "undated"}` : `book_${new Date().toISOString().slice(0, 10)}`);
    const name = prompt("Save this field book as:", suggestion);
    if (!name) return;
    currentName = name;
    localStorage.setItem(projectKey(name), JSON.stringify(sheet));
    localStorage.setItem(CURRENT_NAME_KEY, name);
    ensureIndexed(name);
    renderActiveProject();
    saveMsgEl.textContent = `Saved as "${name}"`;
    setTimeout(() => (saveMsgEl.textContent = ""), 2500);
  });

  // ---------- library modal ----------
  const overlay = document.getElementById("modal-overlay");
  const modalBody = document.getElementById("modal-body");

  document.getElementById("btn-open").addEventListener("click", () => {
    const list = getIndex();
    if (list.length === 0) {
      modalBody.innerHTML = `<div class="modal-empty">No saved field books yet.</div>`;
    } else {
      modalBody.innerHTML = `<div class="modal-list">${list
        .map(
          (name) => `
        <div class="modal-item" data-name="${escapeAttr(name)}">
          <span>${escapeHtml(name)}</span>
          <button class="delete-btn" data-action="delete-project" data-name="${escapeAttr(name)}" title="Delete">✕</button>
        </div>`
        )
        .join("")}</div>`;
    }
    overlay.hidden = false;
  });

  modalBody.addEventListener("click", (e) => {
    const delBtn = e.target.closest('[data-action="delete-project"]');
    if (delBtn) {
      e.stopPropagation();
      const name = delBtn.dataset.name;
      localStorage.removeItem(projectKey(name));
      setIndex(getIndex().filter((n) => n !== name));
      if (name === currentName) {
        currentName = null;
        localStorage.removeItem(CURRENT_NAME_KEY);
        renderActiveProject();
      }
      document.getElementById("btn-open").click();
      return;
    }
    const item = e.target.closest(".modal-item");
    if (item) {
      const name = item.dataset.name;
      const raw = localStorage.getItem(projectKey(name));
      if (raw) {
        sheet = JSON.parse(raw);
        currentName = name;
        localStorage.setItem(CURRENT_NAME_KEY, name);
        renderMeta();
        renderRows();
        renderActiveProject();
        persistCurrent();
      }
      overlay.hidden = true;
    }
  });

  document.getElementById("btn-close-modal").addEventListener("click", () => (overlay.hidden = true));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- offline indicator ----------
  const offlineBanner = document.getElementById("offline-banner");
  function updateOnlineStatus() {
    offlineBanner.hidden = navigator.onLine;
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // ---------- init ----------
  renderMeta();
  renderRows();
  renderActiveProject();

  // ---------- service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    });
  }
})();
