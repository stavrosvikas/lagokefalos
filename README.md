# LAGOKEFALOS 🐡

Toon arcade catcher μέσα στη θάλασσα.
Zero build step — ανοίγεις το `index.html` και παίζει (καλύτερα με Live Server στο VS Code λόγω του DOM input στο game over).

---

## Game Design (ό,τι έχουμε συμφωνήσει)

**Χαρακτήρας:** Λαγοκέφαλος (silver-cheeked toadfish), toon style.
**Setting:** Μέσα στη θάλασσα, ορατή κυματιστή γραμμή επιφάνειας, ελληνικό νησί τύπου Σαντορίνη στο βάθος, βυθός με κοχύλια/κοράλλια (Bob Sfougarakis vibes).

**Κίνηση:**
- Αριστερά/δεξιά + κάθετο jump/float που σε επαναφέρει στο ίδιο ύψος (restY).
- Όχι δεύτερο jump στον αέρα — ξανακλειδώνει όταν προσγειωθείς.

**Collectables:** Τενεκεδάκια 330ml, 3 σχέδια (`can_red`, `can_blue`, `can_teal`).

**Κίνδυνοι:**
- Πετονιές: ΨΑΡΕΜΑ ΑΠΟ ΠΑΝΩ — η πετονιά κατεβαίνει από την επιφάνεια σε τυχαίο βάθος (drop), κάθεται εκεί για λίγο (dwell), και ανεβαίνει ξανά (reel). Σαν κάποιος να ψαρεύει έξω από το κάδρο. Σκέτο αγκίστρι ή με δόλωμα-τενεκεδάκι. Hitbox ΜΟΝΟ στο αγκίστρι. Η γραμμή ζωγραφίζεται δυναμικά (texture: μόνο `hook`).
- Καρέτα καρέτα (`turtle`) — σπάνια, περνάει οριζόντια στο ύψος του παίκτη, με προειδοποίηση «!» πριν μπει. Την αποφεύγεις με jump.

**Spawning:**
- Lane-based: 6 στήλες. Οπτικό sway (βύθισμα με ταλάντωση) αλλά το hitbox καλύπτει τη στήλη.
- Πλαϊνά safe zones (14% κάθε πλευρά) — εκεί δεν πέφτει τίποτα. Στο mobile εκεί κάθονται joystick/κουμπί.
- Ό,τι φτάσει στον βυθό σβήνει — **χωρίς penalty ζωής**.

**Combo:** Catches μέσα σε παράθυρο 1.2s (ανεξαρτήτως στήλης).
Πόντοι: 1ο = 10, combo x2 = 30, x3+ = 60. Όλα tunable.

**Δυσκολία:** Ramp σε 90s — πιο γρήγορη πτώση, πιο συχνά spawns, περισσότερα αγκίστρια.

**Ζωές:** 4 (καρδιές πάνω δεξιά). Score πάνω αριστερά. Μετά από χτύπημα: 1.5s ανοσία + flash.

**Flow:** Menu (επιλογή PC/Mobile + επεξήγηση controls) → fullscreen → Game → Game Over → nickname → Leaderboard Top 10 → Restart + Share.

**Controls:**
- PC: βέλη ← → για κίνηση + ↑ (πάνω βέλος) για jump/float.
- Mobile: nipplejs joystick κάτω αριστερά (x-axis) + στρογγυλό κουμπί ▲ κάτω δεξιά.
- Landscape παντού· σε portrait βγαίνει overlay «γύρνα τη συσκευή».

**Fullscreen:** Desktop + Android με Fullscreen API στο START. iPhone Safari δεν υποστηρίζει Fullscreen API σε canvas — έχει μπει viewport-fit=cover + minimal-ui trick. Για 100% fullscreen σε iOS ο χρήστης θέλει Add to Home Screen (δεν φτιάχνεται αλλιώς, περιορισμός Apple).

---

## Δομή

```
index.html
css/style.css              — layout, mobile controls, rotate overlay
js/main.js                 — Phaser config, fullscreen, orientation
js/sfx.js                  — short SFX (WebAudio synth) + mute
js/audio.js                — ambient υποβρύχιο + loop μουσική (synth, αντικαθίστανται με αρχεία)
js/ui.js                   — juicy UI helpers (buttons, panels, icons, mute)
assets/reel.wav            — πραγματικός ήχος πετονιάς (line pull)
js/leaderboard.js          — local τώρα, global με 1 αλλαγή
js/scenes/BootScene.js     — procedural placeholder sprites
js/scenes/MenuScene.js
js/scenes/GameScene.js     — gameplay + TUNE (όλα τα tunables)
js/scenes/GameOverScene.js
```

## Tuning

Όλα τα νούμερα του gameplay είναι στο `TUNE` object πάνω-πάνω στο `GameScene.js`: combo window, ταχύτητες, spawn rates, πιθανότητες αγκιστριών, συχνότητα χελώνας, πόντοι. Πείραξε → refresh → δοκίμασε.

## Αντικατάσταση γραφικών (όταν έρθουν τα τελικά)

Τα placeholder sprites φτιάχνονται με κώδικα στο `BootScene.js`. Όταν έχεις PNG:

1. Φτιάξε φάκελο `assets/`
2. Στο `BootScene` πρόσθεσε `preload()`:
   ```js
   preload() {
     this.load.image('lago', 'assets/lago.png');
     this.load.image('can_red', 'assets/can_red.png');
     // κ.ο.κ. — ΙΔΙΑ keys
   }
   ```
3. Σβήσε το αντίστοιχο `make...()` από το `create()`.

Keys: `lago`, `can_red`, `can_blue`, `can_teal`, `hook`, `turtle`, `bubble`, `heart`, `shell`, `coral`, `boot`, `amphora`, `starfish`, `icon_pc`, `icon_mobile`.

## Αντικατάσταση ήχων

**Short SFX** (`js/sfx.js`): synthesized WebAudio. Για αρχεία: φόρτωσέ τα στο `BootScene.preload` (`this.load.audio`) και αντικατέστησε τα σώματα των functions του SFX με `scene.sound.play('key')` — τα ονόματα (`catch`, `combo`, `jump`, `hit`, `splash`, `turtleWarn`, `gameOver`, `start`) μένουν ίδια.

**Πετονιά** (`assets/reel.wav`): πραγματικός ήχος, ήδη ενεργός. Φορτώνεται στο `BootScene.preload` ως `reel` και παίζει στο `spawnHook`.

**Ambient + μουσική** (`js/audio.js`): τώρα synthesized (υποβρύχιο noise bed + loop pad Am–F–C–G). Για **δικά σου αρχεία**, απλά πρόσθεσε στο `BootScene.preload`:
```js
this.load.audio('music', 'assets/music.mp3');     // ή .ogg
this.load.audio('ambient', 'assets/ambient.mp3');
```
Το `AUDIO` τα ανιχνεύει αυτόματα και τα προτιμά αντί για τον synth — **καμία άλλη αλλαγή**. Αν λείπουν, μένει ο synth.

**Mute:** κουμπί 🔊/🔇 σε Menu + Game (πάνω δεξιά). Σιγάζει SFX + ambient + μουσική + reel μαζί, και θυμάται την επιλογή (registry).

**Haptics:** δόνηση σε χτύπημα και σε combo (μόνο mobile, `navigator.vibrate`).

## Leaderboard: local → GLOBAL (για τον συνάδελφο)

Τώρα τρέχει **local** (localStorage). Για global, στο `js/leaderboard.js`, γραμμές 10-11:

```js
mode: 'remote',
remoteUrl: 'https://luben.tv/api/lagokefalos/scores',
```

**Μόνο αυτό.** Το API contract που περιμένει ο κώδικας:
- `GET  {remoteUrl}` → `[{ "name": "XXX", "score": 123 }, ...]` ταξινομημένο desc, top 10
- `POST {remoteUrl}` body `{ "name": "XXX", "score": 123 }` → επιστρέφει το ενημερωμένο top 10

Αν το remote πέσει, κάνει αυτόματα fallback σε local (δεν κρασάρει).
Εναλλακτικά χωρίς backend στο luben.tv: Firebase/Supabase free tier με ίδιο contract.

## Deploy

Static site — ανεβαίνει ως έχει σε GitHub → pull στο `luben.tv/lagokefalos/`. Δεν χρειάζεται build, node, τίποτα.
