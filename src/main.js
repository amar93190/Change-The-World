import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './styles/main.css';

import crisesData from './data/crises.json';
import { CRISIS_COUNTRY_IDS } from './data/countryIds.js';
import { createBackground } from './background.js';
import { createGlobe } from './globe.js';
import { createCrisisPoints } from './points.js';
import { createArcs } from './arcs.js';
import { renderCrisis, methodologyHTML } from './panel.js';
import { initIntro } from './intro.js';

// ── Renderer ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x050914, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ── Scène / caméra ─────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 400);
const DEFAULT_CAM = new THREE.Vector3(0, 3.2, 14);
camera.position.copy(DEFAULT_CAM);

// ── Bloom ──────────────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.88, 0.55, 0.16
);
composer.addPass(bloom);

// ── Contrôles ──────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping  = true;
controls.dampingFactor  = 0.06;
controls.enablePan      = false;
controls.minDistance    = 7.5;
controls.maxDistance    = 24;
controls.rotateSpeed    = 0.45;
controls.target.set(0, 0, 0);

// ── Scène ──────────────────────────────────────────────────────────────────
const bg = createBackground();
scene.add(bg.group);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

const globe  = createGlobe();
globeGroup.add(globe.group);

const points = createCrisisPoints(crisesData.crises, globe.radius);
globeGroup.add(points.group);

const arcs = createArcs(crisesData.crises, globe.radius);
globeGroup.add(arcs.group);

if (import.meta.env.DEV) {
  window.__terre = { focusCrisis, resetView, crises: () => points.markers.map((m) => m.crisis) };
}

let autoRotate = true;
let selectedId = null;
let tween      = null;

function startTween(toPos, dur = 1100) {
  tween = { fromPos: camera.position.clone(), toPos: toPos.clone(), start: performance.now(), dur };
}
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── Raycasting ─────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
const tooltip   = document.getElementById('tooltip');

function updatePointer(e) {
  pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}
function pickCrisis() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(points.hitList, false);
  return hits.length ? hits[0].object.userData.crisis : null;
}

window.addEventListener('pointermove', (e) => {
  updatePointer(e);
  const crisis = pickCrisis();
  if (crisis) {
    canvas.style.cursor = 'pointer';
    const col = crisis.severity === 'major' ? '#ff5a3c' : '#35d0e0';
    tooltip.innerHTML = `<span class="tooltip__sev" style="background:${col}"></span>${crisis.name}`;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top  = `${e.clientY}px`;
    tooltip.classList.remove('tooltip--hidden');
  } else {
    canvas.style.cursor = '';
    tooltip.classList.add('tooltip--hidden');
  }
});

let downPos = null;
canvas.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6) return;
  updatePointer(e);
  const crisis = pickCrisis();
  if (crisis) focusCrisis(crisis);
});

// ── Focus / reset ──────────────────────────────────────────────────────────
function focusCrisis(crisis) {
  selectedId  = crisis.id;
  autoRotate  = false;
  points.setActive(crisis.id);
  globe.highlight(CRISIS_COUNTRY_IDS[crisis.id] || []);

  const marker   = points.markers.find((m) => m.crisis.id === crisis.id);
  const worldPos = new THREE.Vector3();
  marker.container.getWorldPosition(worldPos);
  startTween(worldPos.clone().normalize().multiplyScalar(9.5));
  openPanel(crisis);
}
function resetView() {
  selectedId = null;
  closePanel();
  points.resetActive();
  globe.resetHighlight();
  startTween(DEFAULT_CAM);
  setTimeout(() => { autoRotate = true; }, 800);
}

// ── Panneau ────────────────────────────────────────────────────────────────
const panel     = document.getElementById('panel');
const panelBody = document.getElementById('panel-body');
function openPanel(crisis) {
  panelBody.innerHTML = renderCrisis(crisis, crisesData.meta);
  panel.scrollTop = 0;
  panel.classList.remove('panel--hidden');
  panel.setAttribute('aria-hidden', 'false');
}
function closePanel() {
  panel.classList.add('panel--hidden');
  panel.setAttribute('aria-hidden', 'true');
}
document.getElementById('panel-close').addEventListener('click', resetView);

// ── Méthodologie ───────────────────────────────────────────────────────────
const methodModal = document.getElementById('method-modal');
document.getElementById('method-body').innerHTML = methodologyHTML();
document.querySelectorAll('[data-action]').forEach((el) => {
  el.addEventListener('click', () => {
    const a = el.dataset.action;
    if (a === 'reset') resetView();
    if (a === 'method') { methodModal.classList.remove('modal--hidden'); methodModal.setAttribute('aria-hidden', 'false'); }
    if (a === 'close-method') { methodModal.classList.add('modal--hidden'); methodModal.setAttribute('aria-hidden', 'true'); }
  });
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!methodModal.classList.contains('modal--hidden')) methodModal.classList.add('modal--hidden');
    else if (selectedId) resetView();
  }
});

// ── Boucle ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  bg.update(t);
  globe.update(t);
  points.update(t);
  arcs.update(t);
  if (autoRotate) globeGroup.rotation.y += 0.0009;
  if (tween) {
    const p = Math.min(1, (performance.now() - tween.start) / tween.dur);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, easeInOut(p));
    if (p >= 1) tween = null;
  }
  controls.update();
  composer.render();
}
animate();

// ── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth, window.innerHeight);
});

// ── Intro ──────────────────────────────────────────────────────────────────
function revealUI() {
  document.getElementById('hud').classList.remove('hud--hidden');
  document.getElementById('legend').classList.remove('legend--hidden');
}
initIntro(revealUI);
