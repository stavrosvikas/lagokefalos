/* ============================================================
   SFX — placeholder ήχοι με WebAudio (θα αντικατασταθούν).
   Για να βάλεις δικά σου αρχεία: δες README, ενότητα "Ήχοι".
   ============================================================ */
const SFX = (() => {
  let ctx = null;
  let muted = false;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.25, when = 0, slideTo = null) {
    if (muted) return;
    const a = ac();
    const t0 = a.currentTime + when;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() { ac(); },
    setMute(m) { muted = m; },

    catch()  { tone(620, 0.12, 'square', 0.18, 0, 900); },

    combo(level) {
      const base = 520;
      const n = Math.min(level, 3);
      for (let i = 0; i < n; i++) {
        tone(base + i * 180, 0.1, 'square', 0.16, i * 0.07);
      }
    },

    jump()   { tone(300, 0.18, 'sine', 0.2, 0, 560); },

    hit()    { tone(220, 0.3, 'sawtooth', 0.25, 0, 80); },

    splash() { tone(180, 0.15, 'triangle', 0.15, 0, 90); },

    /* Μηχανισμός καλαμιού «βζζζ» όσο κατεβαίνει η πετονιά (ρατσέτα) */
    reel(duration = 1.0) {
      const a = ac();
      const t0 = a.currentTime;
      const d = Math.max(0.3, Math.min(duration, 2.2));
      const osc = a.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(56, t0);
      osc.frequency.linearRampToValueAtTime(90, t0 + d);      // ανεβαίνει καθώς ξετυλίγεται
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.06, t0 + 0.05);
      g.gain.setValueAtTime(0.06, t0 + d - 0.08);
      g.gain.linearRampToValueAtTime(0.0001, t0 + d);
      // ρατσέτα: γρήγορο τρέμολο = κλικ-κλικ μηχανισμού
      const lfo = a.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(24, t0);
      lfo.frequency.linearRampToValueAtTime(34, t0 + d);
      const lfoGain = a.createGain();
      lfoGain.gain.setValueAtTime(0.05, t0);
      lfo.connect(lfoGain).connect(g.gain);
      const lp = a.createBiquadFilter();   // λίγο φιλτράρισμα να μην τσιρίζει
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(850, t0);
      osc.connect(g).connect(lp).connect(a.destination);
      osc.start(t0); lfo.start(t0);
      osc.stop(t0 + d + 0.05); lfo.stop(t0 + d + 0.05);
    },

    turtleWarn() { tone(880, 0.09, 'square', 0.14); tone(880, 0.09, 'square', 0.14, 0.16); },

    gameOver() {
      [440, 392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.18));
    },

    start() {
      [392, 523, 659].forEach((f, i) => tone(f, 0.14, 'square', 0.18, i * 0.09));
    }
  };
})();
