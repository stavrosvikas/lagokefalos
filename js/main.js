/* ============================================================
   MAIN — Phaser config + fullscreen + rotate handling.
   Landscape παντού: 1280x720 base, FIT scaling.
   ============================================================ */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#0a4f8f',
  dom: { createContainer: true },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // fullscreen σε όλο το shell (canvas + mobile controls). Element, όχι string.
    fullscreenTarget: document.getElementById('game-shell')
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);

/* ---- Fullscreen (καλείται με user gesture από το START) ----
   Desktop + Android: Fullscreen API.
   iPhone Safari: ΔΕΝ υποστηρίζει Fullscreen API σε canvas —
   κάνουμε ό,τι γίνεται: viewport-fit=cover + scroll trick.
   Πλήρες fullscreen σε iOS μόνο μέσω "Add to Home Screen". */
function goFullscreen(scene) {
  try {
    if (scene.scale.fullscreen.available && !scene.scale.isFullscreen) {
      scene.scale.startFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) { /* iOS: σιωπηλά συνεχίζουμε */ }
  // iOS minimal-ui nudge
  setTimeout(() => window.scrollTo(0, 1), 300);
}

/* ---- Rotate overlay: μόνο σε touch συσκευές σε portrait ----
   matchMedia αντί για innerHeight/innerWidth (αξιόπιστο σε iOS Safari). */
function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}
function checkOrientation() {
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  document.body.classList.toggle('needs-rotate', isTouchDevice() && isPortrait);
}
const orientationMQ = window.matchMedia('(orientation: portrait)');
if (orientationMQ.addEventListener) orientationMQ.addEventListener('change', checkOrientation);
else if (orientationMQ.addListener) orientationMQ.addListener(checkOrientation);   // παλιά iOS
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => { checkOrientation(); setTimeout(checkOrientation, 300); });
checkOrientation();
