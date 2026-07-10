/* ============================================================
   LEADERBOARD
   Τώρα: local (localStorage, ανά συσκευή).
   Για GLOBAL: ο συνάδελφος αλλάζει ΜΟΝΟ το CONFIG παρακάτω —
   mode: 'remote' και το endpoint του. Τίποτα άλλο.
   Το API contract περιγράφεται στο README.
   ============================================================ */
const Leaderboard = (() => {
  const CONFIG = {
    mode: 'local',              // 'local' | 'remote'   <-- ΜΟΝΗ ΑΛΛΑΓΗ ΓΙΑ GLOBAL
    remoteUrl: '',              // π.χ. 'https://luben.tv/api/lagokefalos/scores'
    maxEntries: 10,
    storageKey: 'lagokefalos_scores_v1'
  };

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

  async function remoteSave(name, score) {
    const res = await fetch(CONFIG.remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score })
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

    async submit(name, score) {
      const clean = String(name).trim().slice(0, 12) || 'ΑΝΩΝΥΜΟΣ';
      if (CONFIG.mode === 'remote') {
        try { return await remoteSave(clean, score); }
        catch (e) { console.warn('Remote save failed, fallback σε local', e); return localSave(clean, score); }
      }
      return localSave(clean, score);
    }
  };
})();
