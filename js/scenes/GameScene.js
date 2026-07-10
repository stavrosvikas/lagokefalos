/* ============================================================
   GAME SCENE — πυρήνας. Όλα τα tunables στο TUNE.
   ============================================================ */
const TUNE = {
  lanes: 6,
  safeMarginPct: 0.14,
  playerSpeed: 420,
  jumpVelocity: -620,
  gravity: 1250,

  // τενεκεδάκια
  fallSpeedStart: 150,
  fallSpeedMax: 340,
  spawnDelayStart: 1300,
  spawnDelayMin: 520,

  // πετονιές (ψάρεμα από πάνω: drop → dwell → reel)
  hookDelayStart: 5200,     // ms ανάμεσα σε πετονιές στην αρχή
  hookDelayMin: 2200,       // στο max δυσκολίας
  hookDropSpeed: 260,
  hookReelSpeed: 200,
  hookDwellMin: 900,        // πόσο "κάθεται" στο βάθος
  hookDwellMax: 2200,
  hookBaitChance: 0.45,
  hookDepthMinPct: 0.42,    // ελάχιστο βάθος-στόχος (% ύψους οθόνης)
  hookDepthMaxPct: 0.8,     // μέχρι κάτω από το ύψος του παίκτη

  rampSeconds: 90,
  comboWindow: 1200,
  comboPoints: { 1: 10, 2: 30, 3: 60 },
  swayAmp: 14,
  swaySpeed: 0.004,

  turtleMinGap: 12000,
  turtleMaxGap: 24000,
  turtleSpeed: 300,
  turtleWarnMs: 1100,
  invulnMs: 1500,
  lives: 4
};

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.deviceMode = this.registry.get('deviceMode') || 'pc';

    this.score = 0;
    this.lives = TUNE.lives;
    this.elapsed = 0;
    this.combo = 0;
    this.lastCatchTime = -99999;
    this.gameEnded = false;

    this.waterY = H * 0.14;
    this.restY = H * 0.72;
    this.seabedY = H * 0.94;

    this.buildBackground();
    this.buildPlayer();
    this.buildHUD();
    this.buildInput();

    this.fallGroup = this.physics.add.group();     // μόνο τενεκεδάκια
    this.physics.add.overlap(this.player, this.fallGroup, (p, can) => this.onCatch(can), null, this);

    this.hooks = [];                               // πετονιές (custom logic)
    this.lineGfx = this.add.graphics().setDepth(4);

    this.turtle = null;
    this.scheduleTurtle();

    this.spawnTimer = this.time.addEvent({
      delay: TUNE.spawnDelayStart, loop: true, callback: () => this.spawnCan()
    });
    this.hookTimer = this.time.addEvent({
      delay: TUNE.hookDelayStart, loop: true, callback: () => this.spawnHook()
    });

    this.time.addEvent({ delay: 900, loop: true, callback: () => this.spawnBubble() });

    // ήχος: ambient υποβρύχιο (μόνο στο παιχνίδι) + μουσική (συνεχής)
    AUDIO.startMusic(this);
    AUDIO.startAmbient(this);
    this.events.once('shutdown', () => AUDIO.stopAmbient());

    UI.muteButton(this, this.W - 36, 84);

    this.cameras.main.fadeIn(400);
  }

  /* ================= BACKGROUND ================= */
  buildBackground() {
    const W = this.W, H = this.H, hy = this.waterY;

    // ── ΟΥΡΑΝΟΣ: gradient αιγαιοπελαγίτικου πρωινού ──
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x86cdee, 0x86cdee, 0xFCEBCB, 0xFCEBCB, 1);
    sky.fillRect(0, 0, W, hy);

    // ήλιος με λάμψη
    const sunX = W * 0.14, sunY = hy * 0.34;
    const glow = this.add.graphics().setDepth(0);
    glow.fillStyle(0xFFF3D0, 0.18); glow.fillCircle(sunX, sunY, 46);
    glow.fillStyle(0xFFF0C4, 0.30); glow.fillCircle(sunX, sunY, 32);
    this.add.circle(sunX, sunY, 20, 0xFFE39A).setDepth(0);

    // ── ΝΗΣΙ ΣΑΝΤΟΡΙΝΗ + ΙΣΤΙΟΦΟΡΟ ──
    this.buildIsland();
    this.buildSailboat();

    // ── ΘΑΛΑΣΣΑ (animated fill στο update) ──
    this.seaGfx = this.add.graphics().setDepth(0);

    // ακτίνες φωτός κάτω από την επιφάνεια
    this.rays = [];
    [0.2, 0.44, 0.68, 0.86].forEach((px, i) => {
      const ray = this.add.triangle(W * px, hy + 8, 0, 0, 150, 0, 105, H * 0.6, 0xFFFFFF, 0.06)
        .setOrigin(0.5, 0).setAngle(7 + i * 3).setDepth(1);
      this.tweens.add({
        targets: ray, alpha: 0.14, duration: 2200 + i * 500,
        yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
      this.rays.push(ray);
    });

    // βάθος: gradient σκοτείνιασμα προς τον πάτο
    const deep = this.add.graphics().setDepth(1);
    deep.fillGradientStyle(0x0a4f8f, 0x0a4f8f, 0x03203c, 0x03203c, 1);
    deep.fillRect(0, H * 0.58, W, H * 0.42);
    deep.setAlpha(0.55);

    // αιωρούμενα σωματίδια (plankton) — ambient «ζωντάνια»
    this.add.particles(0, 0, 'bubble', {
      x: { min: 0, max: W }, y: { min: hy, max: H },
      scale: { min: 0.05, max: 0.16 }, alpha: { start: 0.22, end: 0 },
      lifespan: 7000, speedY: { min: -9, max: -2 }, speedX: { min: -6, max: 6 },
      frequency: 350, quantity: 1, blendMode: 'ADD'
    }).setDepth(2);

    // ── ΒΥΘΟΣ: gradient άμμος με ανώμαλη κορυφή ──
    const sand = this.add.graphics().setDepth(2);
    sand.fillGradientStyle(0xD9BE8A, 0xD9BE8A, 0xBE9E68, 0xBE9E68, 1);
    sand.beginPath();
    sand.moveTo(0, H * 0.94);
    for (let x = 0; x <= W; x += 40) sand.lineTo(x, H * 0.94 - 4 + Math.sin(x * 0.05) * 4);
    sand.lineTo(W, H); sand.lineTo(0, H); sand.closePath(); sand.fillPath();

    // διακοσμητικά βυθού (+ βυθισμένη μπότα & αμφορέας)
    const decor = [
      ['coral',    0.07, -12, 1.1,   0],
      ['shell',    0.17,   8, 0.9,   0],
      ['amphora',  0.30,  -4, 1.0,  -8],
      ['starfish', 0.44,  12, 0.85,  0],
      ['boot',     0.60,  10, 1.05, -16],   // μισοχωμένη στην άμμο
      ['shell',    0.73,   8, 0.8,   0],
      ['coral',    0.86, -12, 1.15,  0],
      ['starfish', 0.95,  10, 0.7,  22]
    ];
    decor.forEach(([key, px, dy, sc, ang]) => {
      this.add.image(W * px, this.seabedY + dy, key).setScale(sc).setAngle(ang).setDepth(2);
    });
  }

  /* ── Νησί τύπου Σαντορίνη: καλντέρα, λευκά σπίτια, μπλε τρούλοι, ανεμόμυλος ── */
  buildIsland() {
    const W = this.W, hy = this.waterY;
    const g = this.add.graphics().setDepth(0);
    // βράχος καλντέρας
    g.fillStyle(0x6b5647, 1);
    g.beginPath();
    g.moveTo(W * 0.60, hy);
    g.lineTo(W * 0.66, hy * 0.50);
    g.lineTo(W * 0.72, hy * 0.62);
    g.lineTo(W * 0.78, hy * 0.34);
    g.lineTo(W * 0.86, hy * 0.55);
    g.lineTo(W * 0.93, hy * 0.42);
    g.lineTo(W * 0.99, hy);
    g.closePath(); g.fillPath();
    g.fillStyle(0x7d6a52, 1);
    g.fillRect(W * 0.60, hy - 6, W * 0.39, 6);   // κορυφογραμμή

    // λευκά κυβικά σπιτάκια
    [[0.66, 0.66], [0.70, 0.60], [0.74, 0.66], [0.77, 0.56],
     [0.80, 0.64], [0.83, 0.58], [0.87, 0.66], [0.90, 0.60]].forEach(([px, py]) => {
      g.fillStyle(0xFFFFFF, 1);
      g.fillRect(W * px, hy * py, 11, 9);
      g.fillStyle(0xE7EDF2, 1);
      g.fillRect(W * px, hy * py + 6, 11, 3);
    });
    // μπλε τρούλοι
    [[0.712, 0.585], [0.845, 0.565], [0.905, 0.585]].forEach(([px, py]) => {
      g.fillStyle(0x2f78c9, 1);
      g.fillCircle(W * px, hy * py, 5);
      g.fillStyle(0xEDEDED, 1);
      g.fillRect(W * px - 1, hy * py - 10, 2, 5);   // σταυρός/κεραία
    });
    // ανεμόμυλος
    const mx = W * 0.635, my = hy * 0.52;
    g.fillStyle(0xF3F0E9, 1);
    g.fillRect(mx - 6, my, 12, 15);
    g.fillStyle(0x5a4632, 1);
    g.fillCircle(mx, my, 7);
    g.lineStyle(2, 0x4a3a29, 1);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.5;
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a) * 11, my + Math.sin(a) * 11); g.strokePath();
    }
  }

  /* ── Ιστιοφόρο που διασχίζει τον ορίζοντα ── */
  buildSailboat() {
    const W = this.W, hy = this.waterY;
    const boat = this.add.container(-40, hy - 4).setDepth(0);
    const g = this.add.graphics();
    g.fillStyle(0x3a4b5c, 1);
    g.fillTriangle(-11, 0, 11, 0, 7, 6);         // κύτος
    g.fillRect(-11, -1, 22, 2);
    g.fillStyle(0xFFFFFF, 1);
    g.fillTriangle(0, -18, 0, -2, 9, -2);        // κύριο πανί
    g.fillStyle(0xF2D06B, 1);
    g.fillTriangle(0, -15, 0, -3, -7, -3);       // μικρό πανί (κίτρινο)
    boat.add(g);
    this.tweens.add({ targets: boat, x: W + 40, duration: 46000, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: boat, angle: 3, y: hy - 8, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  drawSea(time) {
    const g = this.seaGfx;
    const W = this.W, H = this.H;
    g.clear();
    // πίσω layer — πιο ανοιχτό, μεγαλύτερο κύμα
    g.fillStyle(0x2f7fc4, 1);
    this.wavePath(g, this.waterY + 4, 9, 140, time * 0.09);
    // μπροστά layer — κύριο μπλε, αντίθετη φάση
    g.fillStyle(0x0a4f8f, 1);
    this.wavePath(g, this.waterY + 13, 7, 100, -time * 0.12);
    // φωτεινή ζώνη ακριβώς κάτω από την επιφάνεια (fill, όχι stroke)
    g.fillStyle(0x5FA8DC, 0.35);
    g.beginPath();
    g.moveTo(0, this.waterY + 13 + Math.sin((0 - time * 0.12) / 100 * Math.PI * 2) * 7);
    for (let x = 0; x <= W; x += 12) {
      g.lineTo(x, this.waterY + 13 + Math.sin((x - time * 0.12) / 100 * Math.PI * 2) * 7);
    }
    for (let x = W; x >= 0; x -= 12) {
      g.lineTo(x, this.waterY + 34 + Math.sin((x - time * 0.12) / 100 * Math.PI * 2) * 7);
    }
    g.closePath();
    g.fillPath();
  }

  wavePath(g, top, amp, len, phase) {
    g.beginPath();
    g.moveTo(0, this.H);
    g.lineTo(0, top);
    for (let x = 0; x <= this.W; x += 12) {
      g.lineTo(x, top + Math.sin((x + phase) / len * Math.PI * 2) * amp);
    }
    g.lineTo(this.W, this.H);
    g.closePath();
    g.fillPath();
  }

  /* ================= PLAYER ================= */
  buildPlayer() {
    this.player = this.physics.add.image(this.W / 2, this.restY, 'lago');
    this.player.setScale(1.1).setDepth(5);
    this.player.body.setSize(80, 55).setOffset(20, 18);
    this.player.setCollideWorldBounds(true);
    this.player.body.setGravityY(TUNE.gravity);
    this.canJump = true;
    this.tweens.add({
      targets: this.player, scaleY: 1.16, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });
  }

  doJump() {
    if (this.gameEnded || !this.canJump) return;
    this.canJump = false;
    this.player.setVelocityY(TUNE.jumpVelocity);
    SFX.jump();
    this.tweens.add({ targets: this.player, angle: -12, duration: 200, yoyo: true });
  }

  /* ================= HUD ================= */
  buildHUD() {
    // score pill
    const pill = this.add.graphics().setDepth(10);
    pill.fillStyle(0x042c53, 0.55);
    pill.fillRoundedRect(16, 14, 240, 48, 24);
    pill.fillStyle(0xFFFFFF, 0.12);
    pill.fillRoundedRect(20, 17, 232, 20, 12);
    this.scoreText = this.add.text(36, 24, 'SCORE 0', {
      fontFamily: UI.FONT, fontSize: '28px', fontStyle: 'bold',
      color: '#ffffff', shadow: { offsetY: 2, color: '#00000066', blur: 0, fill: true }
    }).setDepth(10);

    // hearts
    this.hearts = [];
    for (let i = 0; i < TUNE.lives; i++) {
      const h = this.add.image(this.W - 34 - i * 42, 38, 'heart').setDepth(10);
      this.tweens.add({
        targets: h, scale: 1.12, duration: 600, yoyo: true, repeat: -1,
        delay: i * 120, ease: 'Sine.inOut'
      });
      this.hearts.push(h);
    }

    this.comboText = this.add.text(this.W / 2, this.H * 0.3, '', {
      fontFamily: UI.FONT, fontSize: '48px', fontStyle: 'bold',
      color: '#FAC775', stroke: '#712B13', strokeThickness: 8,
      shadow: { offsetY: 4, color: '#00000055', blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
  }

  updateHearts() {
    this.hearts.forEach((h, i) => {
      if (i >= this.lives && h.alpha === 1) {
        this.tweens.add({ targets: h, scale: 1.8, alpha: 0.15, angle: 30, duration: 350, ease: 'Back.in' });
      }
    });
  }

  /* ================= INPUT ================= */
  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-UP', () => this.doJump());     // desktop: ΠΑΝΩ βέλος = jump

    this.joyX = 0;
    if (this.deviceMode === 'mobile') {
      this.joystick = nipplejs.create({
        zone: document.getElementById('joystick-zone'),
        mode: 'static',
        position: { left: '80px', bottom: '90px' },
        color: 'white',
        size: 110
      });
      this.joystick.on('move', (evt, data) => { this.joyX = data.vector ? data.vector.x : 0; });
      this.joystick.on('end', () => { this.joyX = 0; });

      const jb = document.getElementById('jump-btn');
      this._jumpHandler = (e) => { e.preventDefault(); this.doJump(); };
      jb.addEventListener('pointerdown', this._jumpHandler);
    }
  }

  cleanupInput() {
    if (this.joystick) { this.joystick.destroy(); this.joystick = null; }
    const jb = document.getElementById('jump-btn');
    if (jb && this._jumpHandler) {
      jb.removeEventListener('pointerdown', this._jumpHandler);
    }
  }

  /* ================= SPAWNING ================= */
  laneX(i) {
    const m = this.W * TUNE.safeMarginPct;
    const band = this.W - m * 2;
    return m + band * (i + 0.5) / TUNE.lanes;
  }

  difficulty() {
    return Phaser.Math.Clamp(this.elapsed / (TUNE.rampSeconds * 1000), 0, 1);
  }

  spawnCan() {
    if (this.gameEnded) return;
    const d = this.difficulty();
    const lane = Phaser.Math.Between(0, TUNE.lanes - 1);
    const x = this.laneX(lane);
    const key = Phaser.Utils.Array.GetRandom(['can_red', 'can_blue', 'can_teal']);
    const can = this.fallGroup.create(x, this.waterY - 30, key);
    can.setDepth(5);
    can.body.setSize(can.width + TUNE.swayAmp * 2, can.height).setOffset(-TUNE.swayAmp, 0);
    can.baseX = x;
    can.swayPhase = Math.random() * Math.PI * 2;
    can.setVelocityY(Phaser.Math.Linear(TUNE.fallSpeedStart, TUNE.fallSpeedMax, d));
    // splash μπαίνοντας στο νερό
    this.splashAt(x, this.waterY);

    this.spawnTimer.delay = Phaser.Math.Linear(TUNE.spawnDelayStart, TUNE.spawnDelayMin, d);
  }

  /* ---- Πετονιά: κατεβαίνει από την επιφάνεια, κάθεται, ανεβαίνει ---- */
  spawnHook() {
    if (this.gameEnded) return;
    const d = this.difficulty();
    const lane = Phaser.Math.Between(0, TUNE.lanes - 1);
    const x = this.laneX(lane);

    const hook = this.physics.add.image(x, this.waterY - 10, 'hook').setDepth(5);
    hook.body.setAllowGravity(false);
    hook.body.setSize(hook.width * 0.72, 40).setOffset(hook.width * 0.14, 20);
    hook.baseX = x;
    hook.state = 'drop';
    hook.targetY = this.H * Phaser.Math.FloatBetween(TUNE.hookDepthMinPct, TUNE.hookDepthMaxPct);
    hook.dwellUntil = 0;
    hook.hasBait = Math.random() < TUNE.hookBaitChance;

    // πραγματικός ήχος πετονιάς (line pull) όσο κατεβαίνει
    if (this.cache.audio.exists('reel')) {
      this.sound.play('reel', { volume: 0.55 });
    } else {
      SFX.reel((hook.targetY - hook.y) / TUNE.hookDropSpeed);   // fallback synth
    }

    if (hook.hasBait) {
      hook.bait = this.add.image(x, hook.y - 4, 'can_red').setScale(0.8).setDepth(5).setAngle(20);
    }

    this.splashAt(x, this.waterY);
    hook.overlap = this.physics.add.overlap(this.player, hook, () => {
      if (!this.gameEnded) this.onHit();
    }, null, this);

    this.hooks.push(hook);
    this.hookTimer.delay = Phaser.Math.Linear(TUNE.hookDelayStart, TUNE.hookDelayMin, d);
  }

  updateHooks(time, delta) {
    const dt = delta / 1000;
    for (let i = this.hooks.length - 1; i >= 0; i--) {
      const h = this.hooks[i];
      if (!h.active) {
        if (h.overlap) this.physics.world.removeCollider(h.overlap);
        this.hooks.splice(i, 1);
        continue;
      }

      // sway
      h.x = h.baseX + Math.sin(time * TUNE.swaySpeed + i) * (TUNE.swayAmp * 0.5);
      h.angle = Math.sin(time * TUNE.swaySpeed + i) * 5;

      if (h.state === 'drop') {
        h.y += TUNE.hookDropSpeed * dt;
        if (h.y >= h.targetY) {
          h.state = 'dwell';
          h.dwellUntil = time + Phaser.Math.Between(TUNE.hookDwellMin, TUNE.hookDwellMax);
        }
      } else if (h.state === 'dwell') {
        h.y = h.targetY + Math.sin(time * 0.006) * 5;   // ελαφρύ bob
        if (time >= h.dwellUntil) h.state = 'reel';
      } else if (h.state === 'reel') {
        h.y -= TUNE.hookReelSpeed * dt;
        if (h.y < this.waterY - 40) {
          this.splashAt(h.baseX, this.waterY);
          if (h.overlap) this.physics.world.removeCollider(h.overlap);
          if (h.bait) h.bait.destroy();
          h.destroy();
          this.hooks.splice(i, 1);
          continue;
        }
      }
      if (h.bait) { h.bait.x = h.x; h.bait.y = h.y - 4; h.bait.angle = 20 + h.angle; }
    }

    // ζωγραφίζουμε τις πετονιές (γραμμή από πάνω από την επιφάνεια ως το αγκίστρι)
    const g = this.lineGfx;
    g.clear();
    g.lineStyle(2.5, 0xEDEDED, 0.9);
    this.hooks.forEach(h => {
      if (!h.active) return;
      g.beginPath();
      g.moveTo(h.baseX, -6);
      g.lineTo(h.x, h.y - 26);
      g.strokePath();
    });
  }

  splashAt(x, y) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0xFFFFFF, 0.8).setDepth(6);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-26, 26),
        y: y - Phaser.Math.Between(8, 26),
        alpha: 0, duration: 420,
        onComplete: () => p.destroy()
      });
    }
  }

  spawnBubble() {
    if (this.gameEnded) return;
    const b = this.add.image(
      Phaser.Math.Between(20, this.W - 20), this.H + 10, 'bubble'
    ).setAlpha(0.6).setScale(Phaser.Math.FloatBetween(0.5, 1.2)).setDepth(3);
    this.tweens.add({
      targets: b, y: this.waterY + 16, x: b.x + Phaser.Math.Between(-40, 40),
      duration: Phaser.Math.Between(4000, 7000),
      onComplete: () => b.destroy()
    });
  }

  /* ================= TURTLE ================= */
  scheduleTurtle() {
    this.time.delayedCall(
      Phaser.Math.Between(TUNE.turtleMinGap, TUNE.turtleMaxGap),
      () => this.turtleWarning()
    );
  }

  turtleWarning() {
    if (this.gameEnded) return;
    SFX.turtleWarn();
    const warn = this.add.text(this.W - 40, this.restY, '!', {
      fontFamily: UI.FONT, fontSize: '56px', fontStyle: 'bold',
      color: '#E24B4A', stroke: '#ffffff', strokeThickness: 8
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: warn, alpha: 0.2, duration: 200, yoyo: true, repeat: 4 });
    this.time.delayedCall(TUNE.turtleWarnMs, () => { warn.destroy(); this.launchTurtle(); });
  }

  launchTurtle() {
    if (this.gameEnded) return;
    this.turtle = this.physics.add.image(this.W + 140, this.restY, 'turtle').setDepth(5);
    this.turtle.setFlipX(true).setScale(1.1);
    // hitbox ΜΟΝΟ στο κάτω μισό (καβούκι) → ένα κανονικό jump την προσπερνά,
    // αλλά αν στέκεσαι στο restY σε χτυπάει κανονικά.
    this.turtle.body.setSize(150, 56).setOffset(30, 64);
    this.turtle.setVelocityX(-TUNE.turtleSpeed);
    this.tweens.add({
      targets: this.turtle, y: this.restY - 12, angle: -3, duration: 650,
      yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });
    this.turtleCollider = this.physics.add.overlap(this.player, this.turtle, () => this.onHit(), null, this);
    // φυσαλίδες πίσω της (wake)
    this.turtleWake = this.time.addEvent({ delay: 180, loop: true, callback: () => {
      if (!this.turtle || !this.turtle.active) return;
      const b = this.add.image(this.turtle.x + 90, this.turtle.y + Phaser.Math.Between(-16, 16), 'bubble')
        .setScale(Phaser.Math.FloatBetween(0.3, 0.7)).setAlpha(0.55).setDepth(4);
      this.tweens.add({ targets: b, y: b.y - 30, alpha: 0, duration: 600, onComplete: () => b.destroy() });
    }});
  }

  /* ================= SCORING / DAMAGE ================= */
  onCatch(can) {
    if (this.gameEnded || !can.active) return;
    const now = this.time.now;
    if (now - this.lastCatchTime <= TUNE.comboWindow) {
      this.combo = Math.min(this.combo + 1, 3);
    } else {
      this.combo = 1;
    }
    this.lastCatchTime = now;

    const pts = TUNE.comboPoints[this.combo] || TUNE.comboPoints[3];
    this.score += pts;
    this.scoreText.setText('SCORE ' + this.score);
    this.tweens.add({ targets: this.scoreText, scale: 1.15, duration: 90, yoyo: true });

    const pop = this.add.text(can.x, can.y - 20, '+' + pts, {
      fontFamily: UI.FONT, fontSize: '28px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#042c53', strokeThickness: 5
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: pop, y: pop.y - 50, alpha: 0, duration: 700, onComplete: () => pop.destroy() });

    if (this.combo >= 2) {
      SFX.combo(this.combo);
      const col = this.combo >= 3 ? '#FF6B3D' : '#FAC775';   // x3 «καυτό» πορτοκαλί
      this.comboText.setColor(col).setText('COMBO x' + this.combo + '!').setAlpha(1).setScale(0.6);
      this.tweens.add({ targets: this.comboText, scale: this.combo >= 3 ? 1.15 : 1, duration: 200, ease: 'Back.out' });
      this.tweens.add({ targets: this.comboText, alpha: 0, delay: 650, duration: 400 });
      if (this.combo >= 3) {
        this.cameras.main.flash(160, 255, 214, 150, false);   // λάμψη στο x3
        if (navigator.vibrate) { try { navigator.vibrate([15, 30, 25]); } catch (e) {} }
      } else if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch (e) {}
      }
    } else {
      SFX.catch();
    }

    this.tweens.add({ targets: this.player, scaleX: 1.25, duration: 90, yoyo: true });
    this.burstAt(can.x, can.y, this.combo >= 2 ? 0xFAC775 : 0xFFFFFF);
    can.destroy();
  }

  /* Sparkle burst σε catch */
  burstAt(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = this.add.star(x, y, 4, 2, 6, color, 1).setDepth(9);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * Phaser.Math.Between(30, 55),
        y: y + Math.sin(a) * Phaser.Math.Between(30, 55),
        angle: 180, alpha: 0, scale: 0.3,
        duration: 420, ease: 'Cubic.out',
        onComplete: () => p.destroy()
      });
    }
  }

  onHit() {
    if (this.invulnerable || this.gameEnded) return;
    SFX.hit();
    if (navigator.vibrate) { try { navigator.vibrate(70); } catch (e) {} }   // haptics σε χτύπημα
    this.lives--;
    this.updateHearts();
    this.combo = 0;

    this.invulnerable = true;
    this.player.setTint(0xE24B4A);
    this.tweens.add({
      targets: this.player, alpha: 0.25, duration: 140, yoyo: true, repeat: 5,
      onComplete: () => {
        this.player.clearTint();
        this.player.setAlpha(1);
        this.invulnerable = false;
      }
    });
    this.cameras.main.shake(180, 0.008);

    if (this.lives <= 0) this.endGame();
  }

  endGame() {
    this.gameEnded = true;
    SFX.gameOver();
    this.physics.pause();
    this.cleanupInput();
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(400, 4, 26, 46);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameOver', { score: this.score }));
    });
  }

  /* ================= UPDATE ================= */
  update(time, delta) {
    if (this.gameEnded) return;
    this.elapsed += delta;
    this.drawSea(time);
    this.updateHooks(time, delta);

    // κίνηση παίκτη
    let dir = 0;
    if (this.cursors.left.isDown) dir = -1;
    else if (this.cursors.right.isDown) dir = 1;
    if (Math.abs(this.joyX) > 0.15) dir = this.joyX;

    this.player.setVelocityX(dir * TUNE.playerSpeed);
    if (dir < -0.1) this.player.setFlipX(true);
    if (dir > 0.1) this.player.setFlipX(false);
    // φυσαλίδες κολύμπι
    if (Math.abs(dir) > 0.3 && time > (this._nextTrail || 0)) {
      this._nextTrail = time + 130;
      const b = this.add.image(
        this.player.x + (this.player.flipX ? 50 : -50),
        this.player.y + Phaser.Math.Between(-10, 10), 'bubble'
      ).setScale(0.35).setAlpha(0.5).setDepth(4);
      this.tweens.add({ targets: b, y: b.y - 20, alpha: 0, duration: 450, onComplete: () => b.destroy() });
    }

    if (!this.canJump) {
      // στον αέρα (jump): βαρύτητα + έλεγχος προσγείωσης
      this.player.body.setGravityY(TUNE.gravity);
      if (this.player.y >= this.restY && this.player.body.velocity.y > 0) {
        this.player.setVelocityY(0);
        this.player.body.setGravityY(0);
        this.canJump = true;
        // squash στην "προσγείωση" + φυσαλίδες
        this.tweens.add({ targets: this.player, scaleY: 0.85, scaleX: 1.25, duration: 90, yoyo: true });
        for (let i = 0; i < 3; i++) {
          const b = this.add.image(this.player.x + Phaser.Math.Between(-20, 20), this.player.y + 24, 'bubble')
            .setScale(0.4).setAlpha(0.6).setDepth(4);
          this.tweens.add({ targets: b, y: b.y - 24, alpha: 0, duration: 400, onComplete: () => b.destroy() });
        }
      }
    } else {
      // ── ΚΟΛΥΜΠΙ: ήπιο float bob + λίκνισμα σώματος (πιο έντονο όταν κινείται) ──
      const moving = Math.abs(dir) > 0.1;
      this.player.body.setGravityY(0);
      this.player.setVelocityY(0);
      this.player.setY(this.restY + Math.sin(time * 0.004) * 7);
      this.player.setAngle(Math.sin(time * (moving ? 0.02 : 0.006)) * (moving ? 7 : 3));
    }

    // sway τενεκεδάκια + βυθός
    this.fallGroup.children.each(obj => {
      if (!obj.active) return;
      obj.x = obj.baseX + Math.sin(time * TUNE.swaySpeed + obj.swayPhase) * TUNE.swayAmp;
      obj.angle = Math.sin(time * TUNE.swaySpeed + obj.swayPhase) * 6;
      if (obj.y > this.seabedY - 10) {
        this.tweens.add({
          targets: obj, alpha: 0, scale: 0.6, duration: 250,
          onComplete: () => obj.destroy()
        });
        obj.body.enable = false;
      }
    });

    if (this.turtle && this.turtle.x < -200) {
      if (this.turtleCollider) { this.physics.world.removeCollider(this.turtleCollider); this.turtleCollider = null; }
      if (this.turtleWake) { this.turtleWake.remove(); this.turtleWake = null; }
      this.turtle.destroy();
      this.turtle = null;
      this.scheduleTurtle();
    }
  }
}
