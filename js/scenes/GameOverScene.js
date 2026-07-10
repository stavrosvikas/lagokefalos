/* ============================================================
   GAME OVER — nickname, leaderboard, restart, share.
   ============================================================ */
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.finalScore = data.score || 0; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#0a4f8f');
    this.cameras.main.fadeIn(400);
    document.getElementById('mobile-controls').classList.add('hidden');

    // βυθισμένο ψαράκι για συναίσθημα
    const fish = this.add.image(W * 0.12, H * 0.8, 'lago').setScale(1.2).setAngle(160).setAlpha(0.5);
    this.tweens.add({ targets: fish, y: fish.y + 16, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const t = this.add.text(W / 2, H * 0.1, 'GAME OVER', {
      fontFamily: UI.FONT, fontSize: '60px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#a32d2d', strokeThickness: 12,
      shadow: { offsetY: 6, color: '#501313', blur: 0, fill: true }
    }).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: 'Back.out' });

    this.add.text(W / 2, H * 0.2, 'SCORE: ' + this.finalScore, {
      fontFamily: UI.FONT, fontSize: '38px', fontStyle: 'bold', color: '#FAC775',
      shadow: { offsetY: 3, color: '#00000066', blur: 0, fill: true }
    }).setOrigin(0.5);

    // Nickname input
    this.nameEntered = false;
    this.nameInput = this.add.dom(W / 2, H * 0.31).createFromHTML(`
      <div style="display:flex;gap:10px;">
        <input id="nick" type="text" maxlength="12" placeholder="Το nickname σου"
          style="font-size:20px;padding:12px 16px;border-radius:14px;border:3px solid #378ADD;
                 outline:none;width:230px;font-family:'Fredoka','Trebuchet MS',sans-serif;text-align:center;
                 box-shadow:0 5px 0 #185FA5;">
        <button id="save-btn"
          style="font-size:20px;padding:12px 20px;border-radius:14px;border:none;
                 background:#1D9E75;color:#fff;font-weight:bold;cursor:pointer;
                 box-shadow:0 5px 0 #085041;">OK</button>
      </div>
    `);
    this.nameInput.addListener('click');
    this.nameInput.on('click', (e) => { if (e.target.id === 'save-btn') this.submitScore(); });
    const nickEl = document.getElementById('nick');
    nickEl.focus();
    nickEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitScore();
      e.stopPropagation();
    });

    // Leaderboard panel (στήλες στοιχισμένες — κάθε σειρά ξεχωριστά στοιχεία)
    this.justName = null;      // το nickname που μόλις καταχωρήθηκε (για highlight)
    this.lbCX = W / 2;
    this.lbCY = H * 0.62;
    UI.panel(this, this.lbCX, this.lbCY, 520, 320, 0xFFFFFF, 0.97);
    this.add.text(this.lbCX, this.lbCY - 130, 'TOP 10', {
      fontFamily: UI.FONT, fontSize: '26px', fontStyle: 'bold', color: '#1b3550'
    }).setOrigin(0.5);
    this.lbRows = [];
    this.renderBoard();

    UI.button(this, W / 2 - 140, H * 0.92, 240, 58, '↻  RESTART', 0x378ADD, () => {
      this.cameras.main.fadeOut(300, 10, 79, 143);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    }, 24);
    UI.button(this, W / 2 + 140, H * 0.92, 240, 58, '➦  SHARE', 0x1D9E75, () => this.share(), 24);
  }

  async submitScore() {
    if (this.nameEntered) return;
    const raw = document.getElementById('nick').value;
    // ίδιο clean με το Leaderboard.submit ώστε να ταιριάξει το highlight
    this.justName = String(raw).trim().slice(0, 12) || 'ΑΝΩΝΥΜΟΣ';
    this.nameEntered = true;
    await Leaderboard.submit(this.justName, this.finalScore);
    this.nameInput.setVisible(false);
    this.renderBoard();
  }

  async renderBoard() {
    const list = await Leaderboard.top();

    // καθάρισε τις προηγούμενες σειρές
    this.lbRows.forEach(o => o.destroy());
    this.lbRows = [];

    if (!list.length) {
      const empty = this.add.text(this.lbCX, this.lbCY, 'Κανένα score ακόμα —\nγίνε ο πρώτος! 🐡', {
        fontFamily: UI.FONT, fontSize: '22px', color: '#5a7086', align: 'center', lineSpacing: 8
      }).setOrigin(0.5).setDepth(6);
      this.lbRows.push(empty);
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const y0 = this.lbCY - 92;
    const step = 21;
    const xRank = this.lbCX - 212;
    const xName = this.lbCX - 168;
    const xScore = this.lbCX + 214;
    let highlighted = false;

    list.forEach((e, i) => {
      const y = y0 + i * step;
      const mine = !highlighted && this.justName !== null &&
                   e.name === this.justName && e.score === this.finalScore;
      if (mine) highlighted = true;

      // pill πίσω από τη δική σου εγγραφή
      if (mine) {
        const hl = this.add.graphics().setDepth(5);
        hl.fillStyle(0xFAC775, 0.55);
        hl.fillRoundedRect(this.lbCX - 236, y - 11, 472, 22, 9);
        this.lbRows.push(hl);
      }

      const isTop3 = i < 3;
      const color = mine ? '#7a3e00' : (isTop3 ? '#1b3550' : '#42566b');
      const rankTxt = isTop3 ? medals[i] : (i + 1) + '.';

      const rank = this.add.text(xRank, y, rankTxt, {
        fontFamily: UI.FONT, fontSize: isTop3 ? '20px' : '17px',
        fontStyle: 'bold', color
      }).setOrigin(0, 0.5).setDepth(6);

      const name = this.add.text(xName, y, e.name, {
        fontFamily: UI.FONT, fontSize: '18px',
        fontStyle: mine ? 'bold' : 'normal', color
      }).setOrigin(0, 0.5).setDepth(6);

      const score = this.add.text(xScore, y, String(e.score), {
        fontFamily: UI.FONT, fontSize: '18px', fontStyle: 'bold', color
      }).setOrigin(1, 0.5).setDepth(6);

      this.lbRows.push(rank, name, score);
    });
  }

  share() {
    const url = window.location.href.split('?')[0];
    const text = `Έπιασα ${this.finalScore} πόντους στο LAGOKEFALOS! Μπορείς να με περάσεις; 🐡`;
    if (navigator.share) {
      navigator.share({ title: 'Lagokefalos', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + ' ' + url).then(() => {
        const t = this.add.text(this.scale.width / 2, this.scale.height * 0.84, 'Αντιγράφηκε!', {
          fontFamily: UI.FONT, fontSize: '20px', color: '#9FE1CB'
        }).setOrigin(0.5);
        this.time.delayedCall(1500, () => t.destroy());
      });
    }
  }
}
