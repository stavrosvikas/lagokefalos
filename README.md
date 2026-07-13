# LAGOKEFALOS 🐡 — Greek Summer

Toon arcade catcher μέσα στο Αιγαίο. Παίζεις έναν λαγοκέφαλο: τρως τενεκεδάκια, χτίζεις combo και αποφεύγεις αγκίστρια και την καρέτα-καρέτα.

**Zero build step** — static site. Ανοίγεις το `index.html` και παίζει.
Για τοπικό development χρησιμοποίησε **Live Server** στο VS Code (χρειάζεται `http://`, όχι `file://`, γιατί φορτώνονται assets και χρησιμοποιείται `crypto.subtle`).

**Live:** https://stavrosvikas.github.io/lagokefalos/

---

## Τεχνολογία

| | |
|---|---|
| Engine | Phaser **3.80.1** (CDN) |
| Mobile joystick | nipplejs **0.10.2** (CDN) |
| Γραμματοσειρά | Fredoka (Google Fonts, με fallback) |
| Build | κανένα — plain JS, φορτώνεται με `<script>` |

---

## Δομή

```
index.html                  — head (GA, OG/Twitter, favicon), DOM shell, script tags
css/style.css               — layout, mobile controls, rotate overlay
js/main.js                  — Phaser config, fullscreen, orientation
js/audio.js                 — μουσική (menu/game), ambient, φωνές-ατάκες, mute
js/sfx.js                   — μικρά synth SFX (jump, hit, turtleWarn, gameOver, start)
js/ui.js                    — UI helpers (κουμπιά, panels, icon cards, keycaps, mute)
js/leaderboard.js           — local τώρα · remote με 2 γραμμές (δες παρακάτω)
js/scenes/BootScene.js      — preload όλων των assets + loading bar
js/scenes/MenuScene.js      — logo, επιλογή συσκευής, controls, START
js/scenes/GameScene.js      — gameplay + TUNE (όλα τα tunables)
js/scenes/GameOverScene.js  — nickname, leaderboard, restart, share
assets/                     — runtime assets (optimized)
```

---

## Gameplay

**Κίνηση:** αριστερά/δεξιά + jump/float που επαναφέρει τον χαρακτήρα στο ίδιο ύψος (`restY`). Όχι δεύτερο άλμα στον αέρα — ξεκλειδώνει όταν «προσγειωθεί».

**Collectables:** τενεκεδάκια, 3 σχέδια (`can_red`, `can_blue`, `can_teal`).

**Κίνδυνοι:**
- **Πετονιές** — ψάρεμα από πάνω: η πετονιά κατεβαίνει από την επιφάνεια σε τυχαίο βάθος (*drop*), κάθεται εκεί λίγο (*dwell*) και ανεβαίνει ξανά (*reel*). Σκέτο αγκίστρι ή με δόλωμα-τενεκεδάκι. **Hitbox μόνο στο αγκίστρι.** Η γραμμή ζωγραφίζεται δυναμικά (το texture είναι μόνο το `hook`).
- **Καρέτα-καρέτα** — σπάνια, περνάει οριζόντια στο ύψος του παίκτη με προειδοποίηση «!» πριν μπει. Το hitbox της είναι **μόνο στο κάτω μισό** (καβούκι), ώστε να την προσπερνάς με ένα κανονικό άλμα.

**Spawning:** lane-based σε 6 στήλες. Οπτικό sway (ταλάντωση) αλλά το hitbox καλύπτει τη στήλη. Πλαϊνά **safe zones 14%** κάθε πλευρά — εκεί δεν πέφτει τίποτα (στο mobile κάθονται joystick/κουμπί). Ό,τι φτάσει στον βυθό σβήνει **χωρίς penalty**.

**Combo:** catches μέσα σε παράθυρο 1.2s. Πόντοι: 1ο = 10, x2 = 30, x3+ = 60.
Στο combo ο λαγοκέφαλος **φουσκώνει** (`lago` → `lago_big`) για ~1.3s.

> ⚠️ Όταν αλλάζει το texture του παίκτη, **πρέπει** να ξαναρυθμίζεται και το hitbox — τα δύο frames έχουν διαφορετικό μέγεθος (440×245 vs 520×392). Γίνεται στο `puff()`.

**Ζωές:** 4 καρδιές (πάνω δεξιά). Μετά από χτύπημα: 1.5s ανοσία + flash.

> ⚠️ Το flag της ανοσίας μηδενίζεται με **timer**, όχι με `onComplete` tween. (Παλιό bug: αν το tween δεν ολοκληρωνόταν, ο παίκτης έμενε **μόνιμα άτρωτος** για όλη την παρτίδα.)

**Δυσκολία:** ramp σε 90s — πιο γρήγορη πτώση, πυκνότερα spawns, περισσότερα αγκίστρια.

**Flow:** Menu (logo → επιλογή συσκευής → controls) → fullscreen → Game → Game Over → nickname → Top 10 → Restart / Share.
Η επιλογή συσκευής **θυμάται** για όλο το session (στο restart πας κατευθείαν στο START).

### Tuning
Όλα τα νούμερα είναι στο `TUNE` object στην κορυφή του `GameScene.js`: ταχύτητες, spawn rates, βάθη πετονιάς, combo window, πόντοι, χελώνα, ζωές. Πείραξε → refresh.

---

## Controls

- **PC:** `←` `→` κίνηση · `↑` jump/float
- **Mobile:** joystick κάτω αριστερά (x-axis) · κουμπί `▲` κάτω δεξιά
- Landscape παντού· σε portrait βγαίνει overlay «γύρνα τη συσκευή» (έλεγχος με `matchMedia`, αξιόπιστο σε iOS).

**Fullscreen:** ο fullscreen target είναι το `#game-shell`, που περιέχει **και** τον canvas **και** τα mobile controls — αλλιώς σε fullscreen κρύβονταν joystick/κουμπί.

**iOS:** το Safari δεν υποστηρίζει Fullscreen API σε canvas. Έχει μπει `viewport-fit=cover` + minimal-ui trick. Για πλήρες fullscreen χρειάζεται *Add to Home Screen* (περιορισμός Apple).

**In-app browsers (Slack/Instagram/Facebook):** μπλοκάρουν fullscreen, δεν κλειδώνουν orientation και κάνουν επιθετικό cache. Δεν λύνεται από τον κώδικα — ιδανικά ο παίκτης ανοίγει το link σε πραγματικό Chrome/Safari.

---

## Assets

Τα runtime assets στο `assets/` είναι **optimized** (trimmed alpha + downscaled + WAV→MP3).
Τα βαριά originals **δεν ανεβαίνουν** στο repo (whitelist στο `.gitignore`) — μένουν τοπικά ως source.

### Εικόνες

| key | αρχείο | μέγεθος | πού |
|---|---|---|---|
| `lago` | lago.png | 440×245 | παίκτης |
| `lago_big` | lagobig.png | 520×392 | παίκτης σε combo |
| `can_red/blue/teal` | can1/2/3.png | ~110×190 | τενεκεδάκια |
| `turtle` | turtle2.png | 480×312 | καρέτα |
| `flamingo` | flamingo.png | 320×296 | φουσκωτό στην επιφάνεια |
| `seabed_img` | seabed.png | 1376×436 | βυθός (full width) |
| `island_img` | island2.png | 780×315 | νησί (δεξιά) |
| `logo` | logo2.png | 900×369 | logo μενού |
| — | og.jpg | 1200×637 | social preview |

**Procedural** (φτιάχνονται με κώδικα στο `BootScene.create()`, δεν έχουν PNG): `hook`, `bubble`, `heart`, `icon_pc`, `icon_mobile`.

### Ήχοι

| key | αρχείο | πότε |
|---|---|---|
| `music_menu` | music_menu.mp3 | loop στα μενού |
| `music_game` | music_game_v02.mp3 | loop στο παιχνίδι |
| `can_open_1/2` | canopen1/2_v02.mp3 | τρώει τενεκεδάκι (τυχαίο) |
| `combo_1/2` | combo01/02.mp3 | μπαίνει σε combo (τυχαίο 50/50) |
| `v_gloiwdhs`, `v_skotwsei` | *_v02.mp3 | **ατάκα** — δάγκωσε πετονιά |
| `v_exorkismo`, `v_xtypima` | .mp3 | **ατάκα** — τον χτύπησε η χελώνα |
| `reel` | reel.wav | η πετονιά κατεβαίνει |

**Ατάκες (voice bus):** παίζει **μία τη φορά**. Αν παίζει ήδη κάποια, η επόμενη **απορρίπτεται** ώστε να ακούγεται ολόκληρη. Επίσης γίνεται **ducking**: η μουσική πέφτει στο ~10% όσο μιλάει η ατάκα και επανέρχεται μετά.

**Mute:** κουμπί 🔊/🔇 σε Menu + Game (πάνω δεξιά). Σιγάζει μουσική + ατάκες + SFX + ambient μαζί, και θυμάται την επιλογή.

**Haptics:** δόνηση σε χτύπημα και σε combo (mobile, `navigator.vibrate`).

### Αντικατάσταση asset
Βάλε το νέο αρχείο στο `assets/`, άλλαξε το path στο `BootScene.preload()` και πρόσθεσέ το στο whitelist του `.gitignore`. **Τα keys μένουν ίδια** → δεν αγγίζεις άλλο κώδικα.

> Αν αλλάξεις μέγεθος εικόνας, τσέκαρε τα `setScale` / `setDisplaySize` / hitboxes στο `GameScene.js` — είναι καλιμπραρισμένα στις παραπάνω διαστάσεις.

---

## Cache-busting

Τα local `js/` και `css/` φορτώνονται με version query: `?v=9`.
**Σε κάθε deploy που αλλάζει JS/CSS, ανέβασε το νούμερο** στο `index.html` — αλλιώς browsers (ειδικά in-app) σερβίρουν παλιό κώδικα.

---

## Analytics & Social

- **Google Analytics** (`G-RBDE1VBYBN`) στο `<head>`.
- **Open Graph / Twitter cards** με `assets/og.jpg` (1200×637) → σωστό preview σε Facebook / Slack / Twitter.

> ⚠️ **Στη μετάβαση σε luben.tv** άλλαξε τα 3 absolute URLs στο `<head>`: `og:url`, `og:image`, `twitter:image`. Υπάρχει comment ακριβώς εκεί.

---

## Leaderboard: local → GLOBAL

Τώρα τρέχει **local** (localStorage, ανά συσκευή). Αν το remote πέσει, γίνεται **αυτόματα fallback σε local** — δεν κρασάρει ποτέ.

### Βήμα 1 — Frontend (2 γραμμές)

Στο `js/leaderboard.js`, στο `CONFIG`:

```js
mode: 'remote',                                        // από 'local'
remoteUrl: 'https://luben.tv/api/lagokefalos/scores',  // το endpoint
```

⚠️ **Άλλαξε ΚΑΙ το `salt`.** Το τωρινό είναι σε δημόσιο repo, άρα άχρηστο. Βάλε νέο μυστικό — **ίδιο σε client και server**.

### Βήμα 2 — Backend contract

**`GET {remoteUrl}`** → top 10, φθίνουσα:
```json
[{ "name": "NIKOS", "score": 320 }, { "name": "MARIA", "score": 280 }]
```

**`POST {remoteUrl}`** → body:
```json
{ "name": "NIKOS", "score": 320, "duration": 47, "sig": "a3f9…" }
```
- `duration` = δευτερόλεπτα παρτίδας
- `sig` = `SHA-256("name|score|duration|SALT")` σε hex

Επιστρέφει το **ενημερωμένο top 10** (ίδιο σχήμα με το GET).

### Anti-cheat — τι πιάνει και τι όχι

Το `salt` είναι **ορατό** σε όποιον ανοίξει το JS. Άρα η υπογραφή κόβει τους casual cheaters (που πειράζουν το POST από DevTools) — **δεν** κόβει κάποιον αποφασισμένο. **Δεν υπάρχει τρόπος να κρυφτεί μυστικό σε client-side κώδικα.**

Η πραγματική άμυνα είναι το **plausibility check** στον server. Οι 4 έλεγχοι:

1. **Υπογραφή** — ξαναϋπολόγισε το hash, απόρριψε αν δεν ταιριάζει.
2. **Plausibility** — τα spawn rates δίνουν στο απόλυτο ακραίο **~120 πόντους/δευτ.** Απόρριψε αν `score > 130 × duration`. (5000 πόντοι σε 10 δευτ. = αδύνατο.)
3. **Rate limit** ανά IP (π.χ. 10 submissions/λεπτό).
4. **Sanitize** το `name` (≤12 χαρακτήρες, χωρίς HTML).

> 🔑 **Κρίσιμο:** ο client στέλνει το όνομα **ήδη καθαρισμένο** (trim, ≤12, αλλιώς `ΑΝΩΝΥΜΟΣ`). Ο server πρέπει να επαληθεύσει το `sig` με το string **ακριβώς όπως το έλαβε** — και μόνο **μετά** να το sanitize για αποθήκευση. Αν το ξανακόψει πριν την επαλήθευση, το hash **δεν θα ταιριάξει ποτέ**.

### Έτοιμο endpoint (PHP)

```sql
CREATE TABLE lagokefalos_scores (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(32) NOT NULL,
  score      INT NOT NULL,
  duration   INT NOT NULL,
  ip         VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_score (score DESC)
);
```

```php
<?php
header('Content-Type: application/json; charset=utf-8');

const SALT    = 'ΒΑΛΕ_ΕΔΩ_ΤΟ_ΝΕΟ_ΜΥΣΤΙΚΟ';  // ΙΔΙΟ με το js/leaderboard.js
const MAX_PPS = 130;                          // μέγιστοι πόντοι ανά δευτερόλεπτο
const MIN_SEC = 3;                            // ελάχιστη ρεαλιστική διάρκεια

$pdo = new PDO('mysql:host=localhost;dbname=DB;charset=utf8mb4', 'USER', 'PASS', [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

function top10(PDO $pdo): array {
  $rows = $pdo->query(
    "SELECT name, score FROM lagokefalos_scores ORDER BY score DESC, created_at ASC LIMIT 10"
  )->fetchAll(PDO::FETCH_ASSOC);
  return array_map(fn($r) => ['name' => $r['name'], 'score' => (int)$r['score']], $rows);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  echo json_encode(top10($pdo), JSON_UNESCAPED_UNICODE);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $in       = json_decode(file_get_contents('php://input'), true) ?: [];
  $name     = (string)($in['name'] ?? '');      // ΟΠΩΣ ΤΟ ΕΛΑΒΕΣ — μην το κόψεις ακόμα
  $score    = (int)($in['score'] ?? -1);
  $duration = (int)($in['duration'] ?? 0);
  $sig      = (string)($in['sig'] ?? '');

  // 1) υπογραφή (πάνω στο ΑΚΑΤΕΡΓΑΣΤΟ name)
  $expected = hash('sha256', "$name|$score|$duration|" . SALT);
  if (!hash_equals($expected, $sig)) {
    http_response_code(400); echo json_encode(['error' => 'bad signature']); exit;
  }

  // 2) plausibility
  if ($score < 0 || $duration < MIN_SEC || $score > MAX_PPS * $duration) {
    http_response_code(400); echo json_encode(['error' => 'implausible score']); exit;
  }

  // 3) rate limit ανά IP
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $q  = $pdo->prepare(
    "SELECT COUNT(*) FROM lagokefalos_scores
     WHERE ip = ? AND created_at > (NOW() - INTERVAL 1 MINUTE)"
  );
  $q->execute([$ip]);
  if ((int)$q->fetchColumn() >= 10) {
    http_response_code(429); echo json_encode(['error' => 'rate limit']); exit;
  }

  // 4) ΤΩΡΑ sanitize για αποθήκευση
  $safe = mb_substr(strip_tags(trim($name)), 0, 12, 'UTF-8');
  if ($safe === '') $safe = 'ΑΝΩΝΥΜΟΣ';

  $pdo->prepare(
    "INSERT INTO lagokefalos_scores (name, score, duration, ip) VALUES (?, ?, ?, ?)"
  )->execute([$safe, $score, $duration, $ip]);

  echo json_encode(top10($pdo), JSON_UNESCAPED_UNICODE);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
```

**CORS:** αν το παιχνίδι σερβίρεται από `luben.tv/lagokefalos/` και το API από `luben.tv/api/…` → **ίδιο origin, δεν χρειάζεται τίποτα**. Σε άλλο domain θέλει `Access-Control-Allow-Origin`.

---

## Deploy

Static site — ανεβαίνει **ως έχει**. Χωρίς build, χωρίς node, χωρίς dependencies.

- **Τώρα:** GitHub Pages (branch `main`, root) → https://stavrosvikas.github.io/lagokefalos/
- **Τελικό:** pull στο `luben.tv/lagokefalos/`

**Checklist πριν το luben.tv:**
- [ ] `mode: 'remote'` + `remoteUrl` στο `js/leaderboard.js`
- [ ] Νέο `salt` (ίδιο σε client + server)
- [ ] Endpoint με τους 4 ελέγχους
- [ ] `og:url` / `og:image` / `twitter:image` → luben.tv
- [ ] Bump `?v=` στο `index.html`
