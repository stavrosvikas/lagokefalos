/* ============================================================
   BOOT SCENE — placeholder sprites με κώδικα.
   Αντικατάσταση με τελικά PNG: δες ASSETS.md (ίδια keys).
   ============================================================ */
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // loading indicator (φορτώνουμε ~6MB audio/images)
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#0a4f8f');
    this.add.text(W / 2, H / 2 - 24, 'Λαγοκέφαλος', {
      fontFamily: 'Fredoka, Trebuchet MS, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);
    const bar = this.add.graphics();
    this.load.on('progress', (p) => {
      bar.clear();
      bar.fillStyle(0xffffff, 0.25); bar.fillRoundedRect(W / 2 - 150, H / 2 + 20, 300, 12, 6);
      bar.fillStyle(0x1D9E75, 1);   bar.fillRoundedRect(W / 2 - 150, H / 2 + 20, 300 * p, 12, 6);
    });

    // ── Εικόνες (optimized: trimmed + downscaled από τα originals σου) ──
    this.load.image('lago',       'assets/lago.png');
    this.load.image('lago_big',   'assets/lagobig.png');
    this.load.image('can_red',    'assets/can1.png');
    this.load.image('can_blue',   'assets/can2.png');
    this.load.image('can_teal',   'assets/can3.png');
    this.load.image('turtle',     'assets/turtle2.png');
    this.load.image('flamingo',   'assets/flamingo.png');
    this.load.image('seabed_img', 'assets/seabed.png');
    this.load.image('island_img', 'assets/island2.png');
    this.load.image('logo',       'assets/logo2.png');
    // ── Ήχοι ──
    this.load.audio('reel',        'assets/reel.wav');
    this.load.audio('can_open_1',  'assets/canopen1_v02.mp3');
    this.load.audio('can_open_2',  'assets/canopen2_v02.mp3');
    this.load.audio('combo_1',     'assets/combo01.mp3');        // combo: παίζει τυχαία 1 από τα 2
    this.load.audio('combo_2',     'assets/combo02.mp3');
    this.load.audio('v_gloiwdhs',  'assets/v_gloiwdhs_v02.mp3'); // ατάκα δαγκώματος πετονιάς
    this.load.audio('v_skotwsei',  'assets/v_skotwsei_v02.mp3');
    this.load.audio('v_exorkismo', 'assets/v_exorkismo_v02.mp3');// ατάκα χτυπήματος χελώνας
    this.load.audio('v_xtypima',   'assets/v_xtypima.mp3');
    this.load.audio('music_menu',  'assets/music_menu.mp3');
    this.load.audio('music_game',  'assets/music_game_v02.mp3');
  }

  create() {
    // Μόνο τα procedural που ΔΕΝ έχουν PNG: αγκίστρι, φυσαλίδα, καρδιά, icons.
    this.makeHook();
    this.makeBubble();
    this.makeHeart();
    this.makeIcons();
    this.startWhenReady();
  }

  /* Ξεκίνα το Menu αφού φορτώσει η γραμματοσειρά (αλλιώς τα text
     ρεντάρουν με fallback). Fail-safe timeout να μην κολλήσει ποτέ. */
  startWhenReady() {
    let started = false;
    const go = () => { if (started) return; started = true; this.scene.start('Menu'); };
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('700 40px "Fredoka"'),
        document.fonts.load('500 24px "Fredoka"')
      ]).then(go).catch(go);
      this.time.delayedCall(1500, go);
    } else {
      go();
    }
  }

  /* ---- Λαγοκέφαλος (toon puffer) ---- */
  makeLagokefalos() {
    const g = this.add.graphics();
    g.fillStyle(0xC9D6A3, 1);
    g.fillEllipse(60, 45, 96, 66);
    g.fillStyle(0xEFE8D0, 1);
    g.fillEllipse(60, 58, 80, 38);
    g.fillStyle(0xB5C48E, 1);
    g.fillTriangle(8, 45, -14, 26, -14, 64);
    g.fillStyle(0xD8DDE4, 1);
    g.fillEllipse(88, 50, 26, 20);
    g.fillStyle(0x8FA06B, 1);
    [[38, 24], [58, 20], [78, 26], [50, 34], [70, 34]].forEach(([x, y]) => g.fillCircle(x, y, 4));
    g.fillStyle(0xFFFFFF, 1); g.fillCircle(88, 36, 11);
    g.fillStyle(0x222222, 1); g.fillCircle(91, 37, 5);
    g.fillStyle(0x7A6A55, 1); g.fillEllipse(104, 52, 14, 12);
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(99, 47, 5, 6);
    g.fillRect(105, 47, 5, 6);
    g.fillStyle(0xB5C48E, 1);
    g.fillTriangle(52, 52, 68, 52, 58, 68);
    g.generateTexture('lago', 120, 90);
    g.destroy();
  }

  /* ---- Τενεκεδάκια 330ml — 3 σχέδια ---- */
  makeCans() {
    const designs = [
      { key: 'can_red',  body: 0xE24B4A, band: 0xFFFFFF },
      { key: 'can_blue', body: 0x378ADD, band: 0xFAC775 },
      { key: 'can_teal', body: 0x1D9E75, band: 0xEFEFEF }
    ];
    designs.forEach(d => {
      const g = this.add.graphics();
      g.fillStyle(d.body, 1);
      g.fillRoundedRect(4, 6, 32, 48, 6);
      g.fillStyle(d.band, 1);
      g.fillRect(4, 22, 32, 12);
      g.fillStyle(0xC9CDD3, 1);
      g.fillRoundedRect(2, 0, 36, 8, 3);
      g.fillRoundedRect(2, 52, 36, 8, 3);
      g.fillStyle(0xFFFFFF, 0.35);
      g.fillRect(8, 8, 5, 44);
      g.generateTexture(d.key, 40, 60);
      g.destroy();
    });
  }

  /* ---- Αγκίστρι ΜΟΝΟ (η πετονιά ζωγραφίζεται δυναμικά) ---- */
  makeHook() {
    const g = this.add.graphics();
    g.fillStyle(0xE8E8E8, 1);
    g.fillCircle(22, 6, 5);                    // δαχτυλίδι δεσίματος
    g.lineStyle(6, 0xB9BEC7, 1);
    g.beginPath(); g.moveTo(22, 8); g.lineTo(22, 30); g.strokePath();
    g.beginPath();
    g.arc(22, 42, 15, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(140), false);
    g.strokePath();
    g.fillStyle(0xB9BEC7, 1);
    g.fillTriangle(33, 51, 42, 44, 38, 56);    // μύτη
    g.generateTexture('hook', 48, 62);
    g.destroy();
  }

  /* ---- Καρέτα καρέτα — ΜΕΓΑΛΗ ---- */
  makeTurtle() {
    const g = this.add.graphics();
    const k = 1.6;
    g.fillStyle(0x7BA05B, 1);
    g.fillEllipse(36*k, 18*k, 34*k, 14*k);
    g.fillEllipse(36*k, 66*k, 34*k, 14*k);
    g.fillEllipse(88*k, 22*k, 26*k, 12*k);
    g.fillEllipse(88*k, 62*k, 26*k, 12*k);
    g.fillStyle(0x8B5E34, 1);
    g.fillEllipse(62*k, 42*k, 84*k, 52*k);
    g.fillStyle(0xA9743F, 1);
    g.fillEllipse(62*k, 42*k, 64*k, 38*k);
    g.lineStyle(4, 0x8B5E34, 1);
    g.strokeEllipse(62*k, 42*k, 40*k, 22*k);
    g.beginPath(); g.moveTo(42*k, 42*k); g.lineTo(82*k, 42*k); g.strokePath();
    g.fillStyle(0xFFFFFF, 0.25);
    g.fillEllipse(50*k, 32*k, 30*k, 12*k);
    g.fillStyle(0x9DBB78, 1);
    g.fillEllipse(112*k, 42*k, 28*k, 22*k);
    g.fillStyle(0xFFFFFF, 1); g.fillCircle(119*k, 37*k, 6);
    g.fillStyle(0x222222, 1); g.fillCircle(120*k, 38*k, 3.5);
    g.generateTexture('turtle', Math.ceil(130*k), Math.ceil(84*k));
    g.destroy();
  }

  makeBubble() {
    const g = this.add.graphics();
    g.lineStyle(2, 0xFFFFFF, 0.7);
    g.strokeCircle(10, 10, 8);
    g.fillStyle(0xFFFFFF, 0.35);
    g.fillCircle(7, 7, 2.5);
    g.generateTexture('bubble', 20, 20);
    g.destroy();
  }

  /* ---- Βυθός: κοχύλι + κοράλλι ---- */
  makeDecor() {
    const g = this.add.graphics();
    g.fillStyle(0xF0997B, 1);
    g.slice(30, 34, 26, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    g.fillPath();
    g.lineStyle(2, 0xD85A30, 1);
    [-16, -8, 0, 8, 16].forEach(dx => {
      g.beginPath(); g.moveTo(30, 34); g.lineTo(30 + dx, 12); g.strokePath();
    });
    g.generateTexture('shell', 60, 40);
    g.destroy();

    const g2 = this.add.graphics();
    g2.fillStyle(0xED93B1, 1);
    g2.fillRoundedRect(22, 20, 12, 50, 6);
    g2.fillRoundedRect(6, 34, 12, 36, 6);
    g2.fillRoundedRect(38, 30, 12, 40, 6);
    g2.fillStyle(0xD4537E, 1);
    g2.fillCircle(28, 18, 7); g2.fillCircle(12, 32, 6); g2.fillCircle(44, 28, 6);
    g2.generateTexture('coral', 56, 72);
    g2.destroy();
  }

  /* ---- Καρδιά για το HUD ---- */
  makeHeart() {
    const g = this.add.graphics();
    g.fillStyle(0xE24B4A, 1);
    g.fillCircle(11, 11, 9);
    g.fillCircle(25, 11, 9);
    g.fillTriangle(3, 15, 33, 15, 18, 33);
    g.fillStyle(0xFFFFFF, 0.4);
    g.fillCircle(9, 9, 3.5);
    g.generateTexture('heart', 36, 36);
    g.destroy();
  }

  /* ---- Βυθισμένα αντικείμενα βυθού: μπότα, αμφορέας, αστερίας ---- */
  makeSeabedProps() {
    // Βυθισμένη μπότα
    const b = this.add.graphics();
    b.fillStyle(0x3f5a63, 1);
    b.fillRoundedRect(8, 2, 20, 40, 6);    // καλάμι
    b.fillRoundedRect(8, 30, 44, 20, 8);   // πέλμα/μύτη
    b.fillStyle(0x2c4149, 1);
    b.fillRoundedRect(6, 46, 50, 9, 4);    // σόλα
    b.fillStyle(0x557079, 1);
    b.fillRect(12, 6, 5, 28);              // highlight
    b.fillStyle(0x314851, 1);
    b.fillRect(8, 20, 20, 3);              // δίπλωμα
    b.fillStyle(0x4f9f6a, 0.85);           // φύκια πάνω της
    b.fillCircle(16, 4, 3); b.fillCircle(45, 32, 3); b.fillCircle(24, 40, 2.5);
    b.generateTexture('boot', 60, 58);
    b.destroy();

    // Αμφορέας (αιγαιοπελαγίτικος βυθός)
    const a = this.add.graphics();
    a.fillStyle(0xB07A46, 1);
    a.fillEllipse(24, 36, 34, 42);         // σώμα
    a.fillRect(19, 6, 10, 14);             // λαιμός
    a.fillEllipse(24, 6, 16, 8);           // στόμιο
    a.lineStyle(4, 0xB07A46, 1);           // χερούλια
    a.beginPath(); a.arc(13, 16, 7, Phaser.Math.DegToRad(40), Phaser.Math.DegToRad(300), false); a.strokePath();
    a.beginPath(); a.arc(35, 16, 7, Phaser.Math.DegToRad(-120), Phaser.Math.DegToRad(140), false); a.strokePath();
    a.fillStyle(0x8A5C31, 0.5);
    a.fillRect(10, 34, 28, 3);             // ρίγα
    a.fillStyle(0xC98F55, 0.6);
    a.fillEllipse(18, 28, 8, 16);          // highlight
    a.generateTexture('amphora', 48, 62);
    a.destroy();

    // Αστερίας
    const s = this.add.graphics();
    const cx = 22, cy = 22, R = 20, r = 8, pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? R : r;
      pts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
    }
    s.fillStyle(0xE79A3C, 1);
    s.fillPoints(pts, true);
    s.fillStyle(0xD07E2A, 1);
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / 5;
      s.fillCircle(cx + Math.cos(ang) * 10, cy + Math.sin(ang) * 10, 2);
    }
    s.fillStyle(0xF3B968, 0.85);
    s.fillCircle(cx, cy, 4);
    s.generateTexture('starfish', 44, 44);
    s.destroy();
  }

  /* ---- UI icons: PC + Mobile ---- */
  makeIcons() {
    // PC: οθόνη + βάση + πληκτρολόγιο
    const g = this.add.graphics();
    g.fillStyle(0x2b3a4d, 1);
    g.fillRoundedRect(8, 4, 104, 66, 10);
    g.fillStyle(0x9fdcff, 1);
    g.fillRoundedRect(15, 11, 90, 52, 6);
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(20, 58, 48, 16, 66, 16);
    g.fillStyle(0x2b3a4d, 1);
    g.fillRect(52, 70, 16, 10);
    g.fillRoundedRect(34, 80, 52, 8, 4);
    g.fillStyle(0x44586f, 1);
    g.fillRoundedRect(14, 92, 92, 22, 6);
    g.fillStyle(0x9fb4cc, 1);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++)
      g.fillRoundedRect(19 + c * 12.5, 96 + r * 9, 9, 6, 2);
    g.generateTexture('icon_pc', 120, 118);
    g.destroy();

    // Mobile: κινητό σε landscape
    const g2 = this.add.graphics();
    g2.fillStyle(0x2b3a4d, 1);
    g2.fillRoundedRect(4, 24, 112, 62, 14);
    g2.fillStyle(0x9fdcff, 1);
    g2.fillRoundedRect(16, 30, 88, 50, 8);
    g2.fillStyle(0xffffff, 0.5);
    g2.fillTriangle(22, 74, 50, 36, 68, 36);
    g2.fillStyle(0xffffff, 1);
    g2.fillCircle(110 - 3.5, 55, 4);
    g2.generateTexture('icon_mobile', 120, 110);
    g2.destroy();
  }
}
