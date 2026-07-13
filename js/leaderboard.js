/* ============================================================
   LEADERBOARD
   Τώρα: local (localStorage, ανά συσκευή).
   Για GLOBAL: ο συνάδελφος αλλάζει ΜΟΝΟ το CONFIG παρακάτω —
   mode: 'remote' και το endpoint του. Τίποτα άλλο.
   Το API contract περιγράφεται στο README.
   ============================================================ */
const Leaderboard = (() => {
  const CONFIG = {
    mode: 'remote',
    /* Σχετικό path, μέσα στο ίδιο repo: api/scores.php (SQLite).
       Οπουδήποτε δεν τρέχει PHP (local dev με static server, GitHub Pages) δίνει
       404 και το leaderboard πέφτει ΜΟΝΟ ΤΟΥ σε localStorage — άρα το παιχνίδι
       παίζει παντού χωρίς να πειράξει κανείς το CONFIG. */
    remoteUrl: 'api/scores.php',
    maxEntries: 10,
    storageKey: 'lagokefalos_scores_v1',

    /* ΠΡΟΣΟΧΗ — ΤΙ ΠΙΑΝΕΙ ΚΑΙ ΤΙ ΟΧΙ:
       Το salt είναι ΟΡΑΤΟ σε όποιον ανοίξει το JS. Άρα η υπογραφή κόβει τους
       casual cheaters (που απλά αλλάζουν το POST body από DevTools) — ΔΕΝ κόβει
       κάποιον αποφασισμένο που θα διαβάσει το salt και θα φτιάξει σωστό hash.
       Η ΠΡΑΓΜΑΤΙΚΗ άμυνα είναι server-side (δες README: plausibility checks). */
    salt: 'lbn_lgk_summer_2026_a7f3d9'
  };

  /* SHA-256 υπογραφή του (name|score|duration|salt) */
  async function sign(name, score, duration) {
    if (!(window.crypto && window.crypto.subtle)) return '';   // π.χ. σε file://
    const msg = `${name}|${score}|${duration}|${CONFIG.salt}`;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- LOCAL ---------- */
  function localGet() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || [];
    } catch (e) { return []; }
  }

  function localSave(name, score) {
    const list = localGet();
    list.push({ name, score, ts: Date.now() });
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, CONFIG.maxEntries);
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(trimmed));
    return trimmed;
  }

  /* ---------- REMOTE (έτοιμο, ενεργοποιείται με το CONFIG) ---------- */
  async function remoteGet() {
    const res = await fetch(CONFIG.remoteUrl, { method: 'GET' });
    if (!res.ok) throw new Error('leaderboard fetch failed');
    return res.json(); // περιμένει [{name, score}, ...] ταξινομημένο desc
  }

  async function remoteSave(name, score, duration) {
    const sig = await sign(name, score, duration);
    const res = await fetch(CONFIG.remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, duration, sig })
    });
    if (!res.ok) throw new Error('leaderboard save failed');
    return res.json(); // επιστρέφει το ενημερωμένο top-10
  }

  /* ---------- PUBLIC API ---------- */
  return {
    async top() {
      if (CONFIG.mode === 'remote') {
        try { return await remoteGet(); }
        catch (e) { console.warn('Remote leaderboard down, fallback σε local', e); return localGet(); }
      }
      return localGet();
    },

    /* duration = δευτερόλεπτα παρτίδας — το backend το χρειάζεται για
       plausibility check (π.χ. 5000 πόντοι σε 3 δευτ. = προφανές cheat). */
    async submit(name, score, duration = 0) {
      const clean = String(name).trim().slice(0, 12) || 'ΑΝΩΝΥΜΟΣ';
      if (CONFIG.mode === 'remote') {
        try { return await remoteSave(clean, score, duration); }
        catch (e) { console.warn('Remote save failed, fallback σε local', e); return localSave(clean, score); }
      }
      return localSave(clean, score);
    }
  };
})();
