/* ============================================================
   AUDIO — ambient υποβρύχιο bed + loop μουσική.
   Τώρα: synthesized (WebAudio), δουλεύει χωρίς αρχεία.
   Αντικατάσταση με αρχεία: φόρτωσε στο BootScene.preload
   κλειδιά 'music' ή/και 'ambient' (this.load.audio(...)) και
   το AUDIO τα προτιμά αυτόματα αντί για τον synth. Δες README.
   Mute: γίνεται από UI.muteButton (μαζί με SFX + Phaser sounds).
   ============================================================ */
const AUDIO = (() => {
  let ctx = null, master = null, muted = false;
  let ambient = null, music = null;

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

  /* καφέ-ish θόρυβος (πιο «νερό» από λευκό) */
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

  /* ---------- AMBIENT (υποβρύχιο) ---------- */
  function startAmbient(scene) {
    if (ambient) return;
    if (scene && scene.cache && scene.cache.audio.exists('ambient')) {
      const s = scene.sound.add('ambient', { loop: true, volume: 0.4 });
      s.play();
      ambient = { phaser: s };
      return;
    }
    const a = ac();
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a, 3);
    src.loop = true;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 470;
    const g = a.createGain();
    g.gain.value = 0.05;
    // αργό LFO στο cutoff = «ρεύμα» που πάει κι έρχεται
    const lfo = a.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoG = a.createGain();
    lfoG.gain.value = 170;
    lfo.connect(lfoG).connect(lp.frequency);
    src.connect(lp).connect(g).connect(master);
    src.start(); lfo.start();
    ambient = { src, lfo };
  }

  function stopAmbient() {
    if (!ambient) return;
    if (ambient.phaser) { try { ambient.phaser.stop(); ambient.phaser.destroy(); } catch (e) {} }
    else { try { ambient.src.stop(); ambient.lfo.stop(); } catch (e) {} }
    ambient = null;
  }

  /* ---------- MUSIC (loop pad, Am–F–C–G) ---------- */
  const PROG = [
    [110.00, 261.63, 329.63, 440.00],  // Am
    [ 87.31, 220.00, 261.63, 349.23],  // F
    [130.81, 329.63, 392.00, 523.25],  // C
    [ 98.00, 246.94, 293.66, 392.00]   // G
  ];

  function playChord(a, freqs, dur) {
    const t0 = a.currentTime;
    const cg = a.createGain();
    cg.gain.setValueAtTime(0.0001, t0);
    cg.gain.linearRampToValueAtTime(0.055, t0 + 0.8);      // soft attack
    cg.gain.setValueAtTime(0.055, t0 + dur - 0.9);
    cg.gain.linearRampToValueAtTime(0.0001, t0 + dur);     // release (crossfade)
    cg.connect(master);
    freqs.forEach((f, idx) => {
      const o = a.createOscillator();
      o.type = idx === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const og = a.createGain();
      og.gain.value = idx === 0 ? 0.5 : 0.26;
      o.connect(og).connect(cg);
      o.start(t0); o.stop(t0 + dur + 0.15);
    });
  }

  function startMusic(scene) {
    if (music) return;
    if (scene && scene.cache && scene.cache.audio.exists('music')) {
      const s = scene.sound.add('music', { loop: true, volume: 0.5 });
      s.play();
      music = { phaser: s };
      return;
    }
    const a = ac();
    const dur = 4.2;
    let i = 0;
    music = { synth: true, timer: null };
    const step = () => {
      if (!music) return;
      playChord(a, PROG[i % PROG.length], dur);
      i++;
      music.timer = setTimeout(step, dur * 1000 - 350);   // ελαφρύ overlap
    };
    step();
  }

  function stopMusic() {
    if (!music) return;
    if (music.phaser) { try { music.phaser.stop(); music.phaser.destroy(); } catch (e) {} }
    if (music.timer) clearTimeout(music.timer);
    music = null;
  }

  return {
    unlock() { ac(); },
    startAmbient, stopAmbient,
    startMusic, stopMusic,
    setMute(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; },
    isMuted() { return muted; }
  };
})();
