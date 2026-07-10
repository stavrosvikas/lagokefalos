/* ============================================================
   UI HELPERS — juicy κουμπιά & panels με βάθος/σκιά/bounce.
   Κοινά για Menu + GameOver.
   ============================================================ */
const UI = {
  FONT: '"Fredoka", "Trebuchet MS", sans-serif',

  /* Στρογγυλεμένο panel με σκιά + highlight */
  panel(scene, x, y, w, h, color = 0xFFFFFF, alpha = 1) {
    const c = scene.add.container(x, y);
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillRoundedRect(-w / 2 + 6, -h / 2 + 10, w, h, 22);
    const bg = scene.add.graphics();
    bg.fillStyle(color, alpha);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    bg.fillStyle(0xFFFFFF, 0.35);
    bg.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h * 0.28, 14);
    c.add([shadow, bg]);
    return c;
  },

  /* Juicy button: σκιά, χρώμα, highlight, bounce σε hover/press */
  button(scene, x, y, w, h, label, color, cb, fontSize = 26) {
    const c = scene.add.container(x, y);
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(28).color;

    const shadow = scene.add.graphics();
    shadow.fillStyle(dark, 1);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, h / 2.6);

    const face = scene.add.graphics();
    face.fillStyle(color, 1);
    face.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2.6);
    face.fillStyle(0xFFFFFF, 0.3);
    face.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.42, h / 3.2);

    const t = scene.add.text(0, -2, label, {
      fontFamily: UI.FONT, fontSize: fontSize + 'px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#00000030', strokeThickness: 0,
      shadow: { offsetY: 2, color: '#00000055', blur: 0, fill: true }
    }).setOrigin(0.5);

    c.add([shadow, face, t]);
    c.setSize(w, h + 8);
    const hit = scene.add.zone(x, y, w, h + 8).setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.06, duration: 120, ease: 'Back.out' }));
    hit.on('pointerout',  () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
    hit.on('pointerdown', () => {
      scene.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true, onComplete: cb });
    });
    c.hit = hit;
    c.label = t;
    return c;
  },

  /* Επιλέξιμη icon-κάρτα (για PC/Mobile) */
  iconCard(scene, x, y, iconKey, caption, cb) {
    const w = 220, h = 230;
    const c = scene.add.container(x, y);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillRoundedRect(-w / 2 + 5, -h / 2 + 10, w, h, 26);

    const bg = scene.add.graphics();
    bg.fillStyle(0xFFFFFF, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    bg.fillStyle(0xE9F6FF, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h * 0.55, 26);
    bg.fillRect(-w / 2, -h / 2 + h * 0.3, w, h * 0.25);

    const icon = scene.add.image(0, -h * 0.16, iconKey).setScale(1.15);
    const cap = scene.add.text(0, h * 0.3, caption, {
      fontFamily: UI.FONT, fontSize: '26px', fontStyle: 'bold', color: '#1b3550'
    }).setOrigin(0.5);

    c.add([shadow, bg, icon, cap]);
    const hit = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });

    scene.tweens.add({ targets: icon, y: icon.y - 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    hit.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.05, angle: 1.2, duration: 140, ease: 'Back.out' }));
    hit.on('pointerout',  () => scene.tweens.add({ targets: c, scale: 1, angle: 0, duration: 140 }));
    hit.on('pointerdown', () => {
      scene.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true, onComplete: cb });
    });
    c.hit = hit;
    return c;
  },

  /* Κουμπί σίγασης — ελέγχει SFX + AUDIO + Phaser sounds μαζί.
     Η επιλογή θυμάται μέσω registry ('muted') σε όλες τις σκηνές. */
  muteButton(scene, x, y) {
    const apply = (m) => {
      SFX.setMute(m);
      AUDIO.setMute(m);
      scene.sound.mute = m;      // Phaser sounds (π.χ. reel WAV)
    };
    let m = scene.registry.get('muted') || false;
    apply(m);
    const t = scene.add.text(x, y, m ? '🔇' : '🔊', {
      fontFamily: UI.FONT, fontSize: '28px'
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    t.on('pointerdown', (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      m = !m;
      scene.registry.set('muted', m);
      apply(m);
      t.setText(m ? '🔇' : '🔊');
      scene.tweens.add({ targets: t, scale: 0.8, duration: 80, yoyo: true });
    });
    return t;
  },

  /* Keycap (πλήκτρο) για την οθόνη controls */
  keycap(scene, x, y, w, label) {
    const h = 54;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(0xB9C4D2, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 10);
    g.fillStyle(0xF4F8FC, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h - 4, 10);
    const t = scene.add.text(0, -3, label, {
      fontFamily: UI.FONT, fontSize: '24px', fontStyle: 'bold', color: '#33475c'
    }).setOrigin(0.5);
    c.add([g, t]);
    return c;
  }
};
