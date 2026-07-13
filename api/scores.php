<?php
/**
 * Global leaderboard — https://luben.tv/lagokefalos-summer/api/scores.php
 *
 * Contract is fixed by js/leaderboard.js. Do not change one side without the other:
 *   GET  -> [{ name, score }, ...]  top 10, descending
 *   POST -> { name, score, duration, sig } -> same shape back, updated
 *   sig  = SHA-256("name|score|duration|SALT") hex
 *
 * Storage is SQLite. The DB lives OUTSIDE the docroot on purpose: the docroot is
 * a git checkout that the deploy script wipes with `reset --hard`, and anything
 * inside it is downloadable over HTTP — a scores.db sitting next to index.html
 * would be one GET away from anyone.
 */

declare(strict_types=1);

const DB_PATH  = '/var/lib/lagokefalos/scores.db';

/* NOT a secret and cannot be one: the client computes the same hash from public
   JavaScript, so anyone who opens DevTools can read it. It only stops the lazy
   attack (editing the POST body). The plausibility and rate limits below are the
   real defence. MUST match the salt in js/leaderboard.js. */
const SALT     = 'lbn_lgk_summer_2026_a7f3d9';

/* Spawn rates cap a genuine run near 120 points/sec, so past 130/sec it was not
   played. A run shorter than 3s cannot have scored at all. */
const MAX_PPS  = 130;
const MIN_SEC  = 3;
const MAX_SCORE = 1000000;

const RATE_LIMIT   = 10;   // submissions...
const RATE_WINDOW  = 60;   // ...per this many seconds, per IP

header('Content-Type: application/json; charset=utf-8');

function fail(int $code, string $msg): never {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * luben.tv sits behind Cloudflare and then an Apache reverse proxy, so
 * REMOTE_ADDR is always the proxy. Without CF-Connecting-IP the rate limit would
 * be one global counter shared by the entire internet.
 */
function client_ip(): string {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return (string) $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return trim(explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function db(): PDO {
    try {
        $pdo = new PDO('sqlite:' . DB_PATH, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    } catch (Throwable $e) {
        fail(503, 'leaderboard unavailable');
    }

    // WAL so a read never blocks behind a write; busy_timeout so a concurrent
    // write waits instead of throwing SQLITE_BUSY.
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA busy_timeout = 3000');

    // One row per nickname, holding that nickname's best run. An append-log
    // would let a single player fill all ten slots with the same score.
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS scores (
            name       TEXT PRIMARY KEY,
            score      INTEGER NOT NULL,
            duration   INTEGER NOT NULL,
            ip         TEXT,
            created_at INTEGER NOT NULL
        )'
    );
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_score ON scores (score DESC)');

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS rate (
            ip    TEXT PRIMARY KEY,
            hits  INTEGER NOT NULL,
            until INTEGER NOT NULL
        )'
    );

    return $pdo;
}

function top10(PDO $pdo): array {
    $rows = $pdo->query(
        'SELECT name, score FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
    )->fetchAll(PDO::FETCH_ASSOC);

    return array_map(
        static fn(array $r): array => ['name' => $r['name'], 'score' => (int) $r['score']],
        $rows
    );
}

/** Strip anything that could reach the DOM, then clamp to the client's own limit. */
function sanitize_name(string $raw): string {
    $clean = preg_replace('/[<>&"\'`\\\\]/u', '', $raw) ?? '';
    $clean = trim(preg_replace('/\s+/u', ' ', $clean) ?? '');
    $clean = mb_substr($clean, 0, 12);
    return $clean !== '' ? $clean : 'ΑΝΩΝΥΜΟΣ';
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo    = db();

if ($method === 'GET') {
    echo json_encode(top10($pdo), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    fail(405, 'method not allowed');
}

/* ---------------------------------------------------- POST: submit a score */

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) fail(400, 'bad body');

/* The client signed the name EXACTLY as it sent it. Sanitising before verifying
   would change the string and guarantee a hash mismatch — verify first, clean after. */
$rawName  = (string) ($in['name'] ?? '');
$score    = $in['score'] ?? null;
$duration = $in['duration'] ?? null;
$sig      = (string) ($in['sig'] ?? '');

if ($rawName === '' || !is_numeric($score) || !is_numeric($duration)) fail(400, 'bad payload');

$score    = (int) $score;
$duration = (int) $duration;

if ($score < 0 || $score > MAX_SCORE || $duration < 0) fail(400, 'bad payload');

$expected = hash('sha256', $rawName . '|' . $score . '|' . $duration . '|' . SALT);
if (!hash_equals($expected, $sig)) fail(403, 'bad signature');

// A score can only be as large as the time spent earning it.
if ($score > 0 && ($duration < MIN_SEC || $score > MAX_PPS * $duration)) {
    fail(422, 'implausible score');
}

$ip  = client_ip();
$now = time();

// Rate limit, in the same DB so there is nothing else to install or keep alive.
$pdo->beginTransaction();
try {
    $row = $pdo->prepare('SELECT hits, until FROM rate WHERE ip = ?');
    $row->execute([$ip]);
    $r = $row->fetch(PDO::FETCH_ASSOC);

    if ($r && (int) $r['until'] > $now) {
        if ((int) $r['hits'] >= RATE_LIMIT) {
            $pdo->rollBack();
            fail(429, 'too many submissions');
        }
        $pdo->prepare('UPDATE rate SET hits = hits + 1 WHERE ip = ?')->execute([$ip]);
    } else {
        $pdo->prepare('REPLACE INTO rate (ip, hits, until) VALUES (?, 1, ?)')
            ->execute([$ip, $now + RATE_WINDOW]);
    }

    // Keep only the player's best run: a replayed weaker score must not demote them.
    $pdo->prepare(
        'INSERT INTO scores (name, score, duration, ip, created_at)
         VALUES (:name, :score, :duration, :ip, :now)
         ON CONFLICT(name) DO UPDATE SET
             score      = excluded.score,
             duration   = excluded.duration,
             ip         = excluded.ip,
             created_at = excluded.created_at
         WHERE excluded.score > scores.score'
    )->execute([
        ':name'     => sanitize_name($rawName),
        ':score'    => $score,
        ':duration' => $duration,
        ':ip'       => $ip,
        ':now'      => $now,
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fail(503, 'leaderboard unavailable');
}

echo json_encode(top10($pdo), JSON_UNESCAPED_UNICODE);
