/* ============================================================
   MENU — 2 βήματα:
   Βήμα 1: ΜΟΝΟ επιλογή συσκευής (icon cards).
   Βήμα 2: panel με τα controls (keycaps/joystick) + START.
   ============================================================ */
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.buildBackdrop();

    // Logo με bounce-in (logo2 = 900x369)
    const logoScale = 560 / 900;
    this.title = this.add.image(W / 2, H * 0.17, 'logo').setScale(0);
    this.tweens.add({ targets: this.title, scale: logoScale, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: this.title, y: H * 0.17 - 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // μουσική μενού (sailor loop) — ξεκινά μόλις ξεκλειδώσει ο ήχος
    AUDIO.playMusic(this, 'music_menu', 0.45);

    this._starting = false;   // reset: η σκηνή επαναχρησιμοποιείται σε RESTART

    this.step1 = this.add.container(0, 0);
    this.step2 = this.add.container(0, 0);
    this.buildStep1();

    const savedMode = this.registry.get('deviceMode');
    if (savedMode) {
      // ήδη διάλεξε συσκευή σε αυτό το session → κατευθείαν στα controls/START
      this.deviceMode = savedMode;
      this.step1.setVisible(false);
      this.buildStep2();
    } else {
      this.step2.setVisible(false);
    }

    UI.muteButton(this, W - 40, 40);

    this.cameras.main.fadeIn(500);

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.step2.visible) this.startGame();
    });
  }

  buildBackdrop() {
    const W = this.W, H = this.H;
    this.add.rectangle(W / 2, H * 0.09, W, H * 0.18, 0xBEE3F5);
    this.add.circle(W * 0.1, H * 0.06, 30, 0xFAC775);
    this.seaGfx = this.add.graphics();
    // ψαράκι διακοσμητικό
    const fish = this.add.image(W * 0.9, H * 0.8, 'lago').setScale(0.42).setAngle(-6);
    this.tweens.add({ targets: fish, y: fish.y - 20, angle: 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // φυσαλίδες
    this.time.addEvent({ delay: 700, loop: true, callback: () => {
      const b = this.add.image(Phaser.Math.Between(30, W - 30), H + 10, 'bubble')
        .setAlpha(0.5).setScale(Phaser.Math.FloatBetween(0.5, 1.1));
      this.tweens.add({ targets: b, y: H * 0.2, duration: Phaser.Math.Between(4000, 7000), onComplete: () => b.destroy() });
    }});
  }

  buildStep1() {
    const W = this.W, H = this.H;
    const q = this.add.text(W / 2, H * 0.33, 'Πού παίζεις;', {
      fontFamily: UI.FONT, fontSize: '30px', fontStyle: 'bold',
      color: '#ffffff', shadow: { offsetY: 3, color: '#04345c', blur: 0, fill: true }
    }).setOrigin(0.5);

    const cardPC = UI.iconCard(this, W / 2 - 150, H * 0.6, 'icon_pc', 'PC / Laptop', () => this.chooseDevice('pc'));
    const cardMob = UI.iconCard(this, W / 2 + 150, H * 0.6, 'icon_mobile', 'Mobile', () => this.chooseDevice('mobile'));
    this.step1.add([q, cardPC, cardMob]);
    this.step1.hits = [cardPC.hit, cardMob.hit];
  }

  chooseDevice(mode) {
    this.deviceMode = mode;
    this.registry.set('deviceMode', mode);   // θυμήσου την επιλογή για το υπόλοιπο session
    SFX.unlock();
    AUDIO.unlock();
    this.step1.hits.forEach(h => h.disableInteractive());
    this.tweens.add({
      targets: this.step1, alpha: 0, y: -30, duration: 250,
      onComplete: () => { this.step1.setVisible(false); this.buildStep2(); }
    });
  }

  buildStep2() {
    const W = this.W, H = this.H;
    this.step2.removeAll(true);
    this.step2.setVisible(true).setAlpha(0).setY(30);

    const panel = UI.panel(this, W / 2, H * 0.56, 560, 300, 0xFFFFFF, 0.97);
    const header = this.add.text(W / 2, H * 0.56 - 118, 'CONTROLS', {
      fontFamily: UI.FONT, fontSize: '26px', fontStyle: 'bold', color: '#1b3550'
    }).setOrigin(0.5);
    this.step2.add([panel, header]);

    const cy = H * 0.56 - 40;
    if (this.deviceMode === 'pc') {
      this.step2.add([
        UI.keycap(this, W / 2 - 150, cy, 60, '←'),
        UI.keycap(this, W / 2 - 84, cy, 60, '→'),
        this.add.text(W / 2 - 117, cy + 48, 'κίνηση', { fontFamily: UI.FONT, fontSize: '18px', color: '#5a7086' }).setOrigin(0.5),
        UI.keycap(this, W / 2 + 120, cy, 60, '↑'),
        this.add.text(W / 2 + 120, cy + 48, 'jump / float', { fontFamily: UI.FONT, fontSize: '18px', color: '#5a7086' }).setOrigin(0.5)
      ]);
    } else {
      // joystick preview
      const jg = this.add.graphics();
      jg.fillStyle(0xB9C4D2, 0.6); jg.fillCircle(W / 2 - 150, cy, 44);
      jg.fillStyle(0x44586f, 1);   jg.fillCircle(W / 2 - 150, cy, 24);
      jg.fillStyle(0xFFFFFF, 0.35); jg.fillCircle(W / 2 - 156, cy - 7, 8);
      // jump button preview
      jg.fillStyle(0x1D9E75, 1);   jg.fillCircle(W / 2 + 150, cy, 36);
      jg.fillStyle(0xFFFFFF, 0.3); jg.fillCircle(W / 2 + 150, cy - 8, 20);
      const arrow = this.add.text(W / 2 + 150, cy - 2, '▲', { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
      this.step2.add([
        jg, arrow,
        this.add.text(W / 2 - 150, cy + 62, 'joystick: κίνηση', { fontFamily: UI.FONT, fontSize: '18px', color: '#5a7086' }).setOrigin(0.5),
        this.add.text(W / 2 + 150, cy + 62, 'jump / float', { fontFamily: UI.FONT, fontSize: '18px', color: '#5a7086' }).setOrigin(0.5)
      ]);
    }

    const start = UI.button(this, W / 2, H * 0.56 + 92, 260, 62, '▶  START', 0x1D9E75, () => this.startGame(), 28);
    const back = this.add.text(W / 2, H * 0.93, '← αλλαγή συσκευής', {
      fontFamily: UI.FONT, fontSize: '18px', color: '#cde8ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      this.step2.setVisible(false);
      this.step1.setVisible(true).setAlpha(1).setY(0);
      this.step1.hits.forEach(h => h.setInteractive({ useHandCursor: true }));
    });
    this.step2.add([start, back]);

    this.tweens.add({ targets: this.step2, alpha: 1, y: 0, duration: 300, ease: 'Back.out' });
  }

  startGame() {
    if (this._starting) return;
    this._starting = true;
    SFX.start();
    goFullscreen(this);
    this.registry.set('deviceMode', this.deviceMode);
    if (this.deviceMode === 'mobile') {
      document.getElementById('mobile-controls').classList.remove('hidden');
    }
    this.cameras.main.fadeOut(300, 6, 44, 83);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  update(time) {
    // κυματιστή θάλασσα menu (γεμάτο fill, χωρίς stroke)
    const W = this.W, H = this.H, top = H * 0.18;
    const g = this.seaGfx;
    g.clear();
    g.fillStyle(0x2f7fc4, 1);
    this.wavePath(g, top + 6, 8, 130, time * 0.10, W, H);
    g.fillStyle(0x0a4f8f, 1);
    this.wavePath(g, top + 14, 7, 95, -time * 0.13, W, H);
  }

  wavePath(g, top, amp, len, phase, W, H) {
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, top);
    for (let x = 0; x <= W; x += 12) {
      g.lineTo(x, top + Math.sin((x + phase) / len * Math.PI * 2) * amp);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fillPath();
  }
}
