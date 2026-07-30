const TARGET = 305_000_000; // OCHA 2024

function formatFr(n) {
  return Math.round(n)
    .toLocaleString('fr-FR')
    .replace(/ /g, ' '); // espace fine (déjà correct en fr-FR)
}

export function initIntro(onEnter) {
  const intro    = document.getElementById('intro');
  const btn      = document.getElementById('enter-btn');
  const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    // Mode sans animation : tout visible immédiatement
    document.querySelectorAll('.iline, .intro__sep, .intro__ctr, .intro__ctr-sub, .intro__ctr-src')
      .forEach(el => el.classList.add('is-vis'));
    document.getElementById('counter-value').textContent = formatFr(TARGET);
    showBtn();
    return;
  }

  // ── Timeline ─────────────────────────────────────────────────────────
  //  t=0     : fond + blur visibles, tout masqué
  //  0.8s    : ligne 0 wipe
  //  1.6s    : ligne 1 wipe (punch)
  //  2.5s    : séparateur se trace
  //  3.1s    : glitch line 0 + effet chromatique
  //  3.9s    : glitch line 1 + effet chromatique
  //  4.7s    : glitch line 2 + effet chromatique
  //  5.8s    : pause (respiration)
  //  6.2s    : compteur apparaît et commence à monter (2.2s)
  //  8.0s    : sous-titre + source apparaissent
  //  8.8s    : bouton pulse

  const T = [
    [800,  () => wipe('iline-0')],
    [1600, () => wipe('iline-1')],
    [2500, () => revealSep()],
    [3100, () => glitch('ig-0')],
    [3900, () => glitch('ig-1')],
    [4700, () => glitch('ig-2')],
    [6200, () => startCounter(2200)],
    [8000, () => revealSub()],
    [8800, () => showBtn()],
  ];

  T.forEach(([delay, fn]) => setTimeout(fn, delay));

  // ── Fonctions ─────────────────────────────────────────────────────────

  function wipe(id) {
    document.getElementById(id)?.classList.add('is-vis');
  }

  function revealSep() {
    document.getElementById('i-sep')?.classList.add('is-vis');
  }

  function glitch(id) {
    const el = document.getElementById(id);
    if (!el) return;
    // wipe d'abord
    el.classList.add('is-vis');
    // puis chromatique sur le em après que la ligne soit visible
    setTimeout(() => {
      const em = el.querySelector('em');
      if (!em) return;
      em.classList.remove('glitch');
      // forcer un reflow pour relancer l'animation
      void em.offsetWidth;
      em.classList.add('glitch');
    }, 280); // légèrement après le wipe
  }

  function startCounter(duration) {
    const ctr    = document.getElementById('i-ctr');
    const numEl  = document.getElementById('counter-value');
    if (!ctr || !numEl) return;

    ctr.classList.add('is-vis');

    const start = performance.now();
    function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      numEl.textContent = formatFr(TARGET * ease(t));
      if (t < 1) requestAnimationFrame(tick);
      else numEl.textContent = formatFr(TARGET);
    }
    requestAnimationFrame(tick);
  }

  function revealSub() {
    document.getElementById('i-sub')?.classList.add('is-vis');
    document.querySelector('.intro__ctr-src')?.classList.add('is-vis');
  }

  function showBtn() {
    btn.disabled = false;
    btn.classList.add('is-vis');
  }

  // ── Entrée ────────────────────────────────────────────────────────────

  let entered = false;
  function enter() {
    if (entered || btn.disabled) return;
    entered = true;
    intro.classList.add('intro--gone');
    // supprimer du flux après la transition pour libérer le GPU
    intro.addEventListener('transitionend', () => {
      intro.style.display = 'none';
    }, { once: true });
    onEnter();
  }

  btn.addEventListener('click', enter);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btn.disabled) enter();
  });
}
