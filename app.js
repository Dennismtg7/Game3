import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

(() => {
  "use strict";

  // ---------- firebase init ----------
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  let db;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.error("Offline persistence unavailable, falling back to default cache:", e);
    db = initializeFirestore(app, {});
  }

  // ---------- state ----------
  let sheet = blankSheet();
  let currentProjectId = null; // Firestore doc id of the loaded named project, if any
  let currentUid = null;
  let fieldbooksUnsub = null;
  let savedList = []; // [{id, name, updatedAt}]

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
  const userEmailEl = document.getElementById("user-email");
  const btnSignout = document.getElementById("btn-signout");
  const authOverlay = document.getElementById("auth-overlay");

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

    const checkA = totals.bs - totals.fs;
    const checkB = totals.rise - totals.fall;
    const checkC = firstRL !== null && lastRL !== null ? lastRL - firstRL : null;
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
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderActiveProject() {
    const name = savedList.find((p) => p.id === currentProjectId)?.name;
    activeProjectEl.textContent = name ? `— ${name}` : "";
  }

  // ---------- firestore paths ----------
  const draftRef = () => doc(db, "users", currentUid, "current", "draft");
  const fieldbooksCol = () => collection(db, "users", currentUid, "fieldbooks");
  const fieldbookRef = (id) => doc(db, "users", currentUid, "fieldbooks", id);

  // ---------- persistence ----------
  let saveTimer = null;
  function persistCurrent() {
    if (!currentUid) return;
    setDoc(draftRef(), { sheet, currentProjectId, updatedAt: serverTimestamp() }).catch((e) =>
      console.error("draft save failed", e)
    );
    if (currentProjectId) {
      setDoc(fieldbookRef(currentProjectId), { sheet, updatedAt: serverTimestamp() }, { merge: true }).catch((e) =>
        console.error("project save failed", e)
      );
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistCurrent, 400);
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
    if (confirm("Clear this field book and start a new one? Any named project you had open stays saved as-is.")) {
      sheet = blankSheet();
      currentProjectId = null;
      renderMeta();
      renderRows();
      renderActiveProject();
      persistCurrent();
    }
  });

  document.getElementById("btn-save").addEventListener("click", async () => {
    const currentName = savedList.find((p) => p.id === currentProjectId)?.name;
    const suggestion =
      currentName || (sheet.fromPoint ? `${sheet.fromPoint}_${sheet.date || "undated"}` : `book_${new Date().toISOString().slice(0, 10)}`);
    const name = prompt("Save this field book as:", suggestion);
    if (!name) return;

    try {
      if (currentName && name === currentName && currentProjectId) {
        await setDoc(fieldbookRef(currentProjectId), { name, sheet, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        const newRef = doc(fieldbooksCol());
        await setDoc(newRef, { name, sheet, updatedAt: serverTimestamp() });
        currentProjectId = newRef.id;
      }
      persistCurrent();
      renderActiveProject();
      saveMsgEl.textContent = `Saved as "${name}"`;
      setTimeout(() => (saveMsgEl.textContent = ""), 2500);
    } catch (e) {
      console.error(e);
      saveMsgEl.textContent = "Save queued — will sync when back online";
      setTimeout(() => (saveMsgEl.textContent = ""), 3500);
    }
  });

  // ---------- library modal ----------
  const overlay = document.getElementById("modal-overlay");
  const modalBody = document.getElementById("modal-body");

  document.getElementById("btn-open").addEventListener("click", () => {
    renderLibraryList();
    overlay.hidden = false;
  });

  function renderLibraryList() {
    if (savedList.length === 0) {
      modalBody.innerHTML = `<div class="modal-empty">No saved field books yet.</div>`;
      return;
    }
    modalBody.innerHTML = `<div class="modal-list">${savedList
      .map(
        (p) => `
      <div class="modal-item" data-id="${escapeAttr(p.id)}">
        <span>${escapeHtml(p.name)}</span>
        <button class="delete-btn" data-action="delete-project" data-id="${escapeAttr(p.id)}" title="Delete">✕</button>
      </div>`
      )
      .join("")}</div>`;
  }

  modalBody.addEventListener("click", async (e) => {
    const delBtn = e.target.closest('[data-action="delete-project"]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.id;
      try {
        await deleteDoc(fieldbookRef(id));
      } catch (err) {
        console.error(err);
      }
      if (id === currentProjectId) {
        currentProjectId = null;
        renderActiveProject();
      }
      return;
    }
    const item = e.target.closest(".modal-item");
    if (item) {
      const id = item.dataset.id;
      try {
        const snap = await getDoc(fieldbookRef(id));
        if (snap.exists()) {
          sheet = snap.data().sheet;
          currentProjectId = id;
          renderMeta();
          renderRows();
          renderActiveProject();
          persistCurrent();
        }
      } catch (err) {
        console.error(err);
      }
      overlay.hidden = true;
    }
  });

  document.getElementById("btn-close-modal").addEventListener("click", () => (overlay.hidden = true));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });

  // ---------- offline indicator ----------
  const offlineBanner = document.getElementById("offline-banner");
  function updateOnlineStatus() {
    offlineBanner.hidden = navigator.onLine;
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // ---------- auth ----------
  let authMode = "signin";
  let pendingUnverifiedUser = null;
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authConfirm = document.getElementById("auth-confirm");
  const authConfirmField = document.getElementById("auth-confirm-field");
  const authError = document.getElementById("auth-error");
  const authNotice = document.getElementById("auth-notice");
  const authTitle = document.getElementById("auth-title");
  const authBlurb = document.getElementById("auth-blurb");
  const authSubmitBtn = document.getElementById("btn-auth-submit");
  const authSwitchBtn = document.getElementById("btn-auth-switch");
  const authSwitchText = document.getElementById("auth-switch-text");
  const btnResend = document.getElementById("btn-resend");

  function showAuthError(msg) {
    authNotice.hidden = true;
    authError.textContent = msg;
    authError.hidden = false;
  }
  function showAuthNotice(msg) {
    authError.hidden = true;
    authNotice.textContent = msg;
    authNotice.hidden = false;
  }
  function clearAuthMessages() {
    authError.hidden = true;
    authNotice.hidden = true;
    btnResend.hidden = true;
  }

  function setAuthMode(mode) {
    authMode = mode;
    clearAuthMessages();
    authConfirm.value = "";
    if (mode === "signin") {
      authTitle.textContent = "Sign in";
      authBlurb.textContent = "Sign in to sync your field books across devices. You'll still be able to work fully offline after your first sign-in.";
      authSubmitBtn.textContent = "Sign in";
      authSwitchText.textContent = "Don't have an account?";
      authSwitchBtn.textContent = "Create one";
      authConfirmField.hidden = true;
    } else {
      authTitle.textContent = "Create account";
      authBlurb.textContent = "You'll get a verification email — you'll need to confirm it before you can sign in.";
      authSubmitBtn.textContent = "Create account";
      authSwitchText.textContent = "Already have an account?";
      authSwitchBtn.textContent = "Sign in";
      authConfirmField.hidden = false;
    }
  }

  authSwitchBtn.addEventListener("click", () => setAuthMode(authMode === "signin" ? "signup" : "signin"));

  // show/hide password toggles
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.classList.toggle("active", !showing);
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });

  authSubmitBtn.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    clearAuthMessages();

    if (!email || !password) {
      showAuthError("Enter an email and password.");
      return;
    }
    if (authMode === "signup") {
      if (password.length < 6) {
        showAuthError("Password should be at least 6 characters.");
        return;
      }
      if (password !== authConfirm.value) {
        showAuthError("Passwords don't match.");
        return;
      }
    }

    authSubmitBtn.disabled = true;
    try {
      if (authMode === "signin") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          pendingUnverifiedUser = cred.user;
          let resent = false;
          try {
            await sendEmailVerification(cred.user);
            resent = true;
          } catch (err) {
            console.error("auto-resend failed", err);
          }
          await signOut(auth);
          const msg = resent
            ? `Your email isn't verified yet. We just sent a new verification link to ${email} — check your inbox (and spam folder), tap the link, then come back and sign in.`
            : `Your email isn't verified yet. Check ${email} for the verification link (including spam), or tap "Resend verification email" below.`;
          alert(msg);
          showAuthError(msg);
          btnResend.hidden = false;
        }
        // if verified, onAuthStateChanged takes it from here
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setAuthMode("signin");
        authEmail.value = email;
        const msg = `Verification email sent to ${email}. Open it, tap the link, then sign in here.`;
        alert(msg);
        showAuthNotice(msg);
      }
    } catch (e) {
      showAuthError(friendlyAuthError(e));
    } finally {
      authSubmitBtn.disabled = false;
    }
  });

  btnResend.addEventListener("click", async () => {
    if (!pendingUnverifiedUser) return;
    btnResend.disabled = true;
    try {
      await sendEmailVerification(pendingUnverifiedUser);
      showAuthNotice("Verification email sent — check your inbox.");
    } catch (e) {
      showAuthError(friendlyAuthError(e));
    } finally {
      btnResend.disabled = false;
    }
  });

  document.getElementById("btn-forgot").addEventListener("click", async () => {
    const email = authEmail.value.trim();
    if (!email) {
      showAuthError("Enter your email above first, then tap Forgot password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      const msg = `Password reset email sent to ${email}. Open it, tap the link, and set a new password — then come back here and sign in with it.`;
      alert(msg);
      showAuthNotice(msg);
    } catch (e) {
      showAuthError(friendlyAuthError(e));
    }
  });

  function friendlyAuthError(e) {
    const code = e && e.code ? e.code : "";
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Incorrect email or password.";
    if (code.includes("user-not-found")) return "No account with that email.";
    if (code.includes("email-already-in-use")) return "An account with that email already exists.";
    if (code.includes("weak-password")) return "Password should be at least 6 characters.";
    if (code.includes("invalid-email")) return "That email address looks invalid.";
    if (code.includes("network-request-failed")) return "No connection — try again once you're online.";
    return "Something went wrong. Please try again.";
  }

  btnSignout.addEventListener("click", () => signOut(auth));
  setAuthMode("signin");

  onAuthStateChanged(auth, async (user) => {
    if (user && !user.emailVerified) {
      // safety net: shouldn't normally reach here since unverified sign-ins are
      // signed back out immediately above, but guard against stale sessions.
      await signOut(auth);
      return;
    }

    if (fieldbooksUnsub) {
      fieldbooksUnsub();
      fieldbooksUnsub = null;
    }

    if (!user) {
      currentUid = null;
      currentProjectId = null;
      savedList = [];
      sheet = blankSheet();
      userEmailEl.textContent = "";
      btnSignout.hidden = true;
      authOverlay.hidden = false;
      authPassword.value = "";
      return;
    }

    pendingUnverifiedUser = null;
    currentUid = user.uid;
    userEmailEl.textContent = user.email || "";
    btnSignout.hidden = false;
    authOverlay.hidden = true;
    clearAuthMessages();

    // live list of saved field books (also primes the offline cache)
    fieldbooksUnsub = onSnapshot(
      query(fieldbooksCol(), orderBy("updatedAt", "desc")),
      (snap) => {
        savedList = snap.docs.map((d) => ({ id: d.id, name: d.data().name, updatedAt: d.data().updatedAt }));
        renderActiveProject();
        if (!overlay.hidden) renderLibraryList();
      },
      (err) => console.error("fieldbooks listener error", err)
    );

    // restore last working draft
    try {
      const draftSnap = await getDoc(draftRef());
      if (draftSnap.exists() && draftSnap.data().sheet) {
        sheet = draftSnap.data().sheet;
        currentProjectId = draftSnap.data().currentProjectId || null;
      } else {
        sheet = blankSheet();
        currentProjectId = null;
      }
    } catch (e) {
      console.error("draft load failed", e);
      sheet = blankSheet();
      currentProjectId = null;
    }

    renderMeta();
    renderRows();
    renderActiveProject();
  });

  // ---------- service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    });
  }
})();
