/* ============================================================
   AUDIO — μουσική (menu/game), ambient υποβρύχιο, φωνές-ατάκες.
   - playMusic(scene, key): αλλάζει το τρέχον loop (menu ↔ game).
   - voice(scene, keys): παίζει ΜΙΑ ατάκα· αν παίζει ήδη κάποια,
     την αγνοεί (reject) ώστε να ακούγονται ολόκληρες.
   - ambient: synth υποβρύχιο bed (χαμηλά, μόνο στο παιχνίδι).
   Mute: μέσω UI.muteButton (SFX + AUDIO + Phaser sounds μαζί).
   ============================================================ */
const AUDIO = (() => {
  let ctx = null, master = null, muted = false;
  let ambient = null, current = null, voiceSnd = null;

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(a, seconds) {
    const len = Math.floor(a.sampleRate * seconds);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  /* ---------- AMBIENT (synth υποβρύχιο, χαμηλά κάτω από τη μουσική) ---------- */
  function startAmbient() {
    if (ambient) return;
    const a = ac();
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a, 3);
    src.loop = true;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 460;
    const g = a.createGain();
    g.gain.value = 0.03;
    const lfo = a.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoG = a.createGain();
    lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(lp.frequency);
    src.connect(lp).connect(g).connect(master);
    src.start(); lfo.start();
    ambient = { src, lfo };
  }

  function stopAmbient() {
    if (!ambient) return;
    try { ambient.src.stop(); ambient.lfo.stop(); } catch (e) {}
    ambient = null;
  }

  /* ---------- MUSIC (Phaser, loop, εναλλαγή menu/game) ---------- */
  function playMusic(scene, key, vol = 0.5) {
    if (current && current.key === key && current.isPlaying) return;
    stopMusic();
    if (!scene.cache.audio.exists(key)) return;
    const start = () => {
      if (current) return;
      const s = scene.sound.add(key, { loop: true, volume: vol });
      s.play();
      current = s;
    };
    if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, start);
    else start();
  }

  function stopMusic() {
    if (!current) return;
    try { current.stop(); current.destroy(); } catch (e) {}
    current = null;
  }

  /* ---------- VOICE (ατάκες — μία τη φορά, ολόκληρη) ---------- */
  function voice(scene, keys) {
    if (voiceSnd) return;   // κάποια ατάκα παίζει ήδη → αγνόησε τη νέα
    const key = Array.isArray(keys) ? Phaser.Utils.Array.GetRandom(keys) : keys;
    if (!scene.cache.audio.exists(key)) return;
    const s = scene.sound.add(key, { volume: 1.0 });
    voiceSnd = s;
    const free = () => { try { s.destroy(); } catch (e) {} if (voiceSnd === s) voiceSnd = null; };
    s.once(Phaser.Sound.Events.COMPLETE, free);
    s.once(Phaser.Sound.Events.STOP, () => { if (voiceSnd === s) voiceSnd = null; });
    s.play();
  }

  return {
    unlock() { ac(); },
    startAmbient, stopAmbient,
    playMusic, stopMusic, voice,
    setMute(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; },
    isMuted() { return muted; }
  };
})();
