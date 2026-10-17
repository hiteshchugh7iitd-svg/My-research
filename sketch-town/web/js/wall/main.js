import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadTemplates, makeDemoTexture, Bus } from '../common.js';
import { AudioEngine } from '../audio.js';
import { buildWorld } from './world.js';
import { createActor } from './actors.js';
import { UfoFleet } from './ufo.js';
import { Dragon } from './dragon.js';
import { Particles, Beams } from './fx.js';

const LIMITS = { vehicle: 36, building: 30, jet: 10, boat: 10, fish: 14, rocket: 6, heli: 8 };
const HOME = { pos: new THREE.Vector3(0, 42, 102), target: new THREE.Vector3(0, 7, -10) };

const data = await loadTemplates();
const $ = id => document.getElementById(id);

// ------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1236, 0.0028);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 2000);
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.maxPolarAngle = 1.42;
controls.minDistance = 15;
controls.maxDistance = 230;
controls.autoRotateSpeed = 0.35;

const hemi = new THREE.HemisphereLight(0x9fb4ff, 0x2a1d3a, 1.0);
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
const moon = new THREE.DirectionalLight(0xdfe6ff, 1.8);
moon.position.set(-80, 140, 90);
moon.target.position.set(0, 0, -10);
moon.castShadow = true;
moon.shadow.mapSize.set(4096, 4096);
Object.assign(moon.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 400 });
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.04;
scene.add(hemi, ambient, moon, moon.target);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.55, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// --------------------------------------------------------------- app
const app = {
  scene, camera, renderer,
  audio: new AudioEngine(),
  actors: [],
  maxDt: 0.05, // frame-time cap (keeps physics stable after tab switches)
  toast(text, ms = 3500) {
    const t = $('toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(app.toastTimer); app.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  },
  nearestActor(p, kinds) {
    let best = null, d = Infinity;
    for (const a of app.actors) {
      if (!a.active || (kinds && !kinds.includes(a.tpl.kind))) continue;
      const dd = a.root.position.distanceToSquared(p);
      if (dd < d) { d = dd; best = a; }
    }
    return best;
  },
};
// ------------------------------------------- quality / projector brightness
// Classroom PCs vary a lot: start high, drop automatically if the frame rate is low,
// and let the teacher override with [Q] / the operator button. [B] brightens the
// picture for projectors, which wash out dark scenes.
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const QUALITY = [
  { ja: '高', en: 'High', ratio: Math.min(window.devicePixelRatio, 2), shadows: true, map: 4096, bloom: true },
  { ja: '中', en: 'Medium', ratio: 1, shadows: true, map: 2048, bloom: true },
  { ja: '低', en: 'Low', ratio: 0.75, shadows: false, map: 1024, bloom: false },
];
const EXPOSURE = [1.1, 1.4, 1.75];
let qIdx = store.get('st_quality', null);
const autoQuality = qIdx === null;
qIdx ??= 0;
let expIdx = store.get('st_exposure', 0);

function setQuality(i, announce = true) {
  qIdx = (i + QUALITY.length) % QUALITY.length;
  const q = QUALITY[qIdx];
  renderer.setPixelRatio(q.ratio);
  composer.setPixelRatio(q.ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  if (renderer.shadowMap.enabled !== q.shadows || moon.shadow.mapSize.x !== q.map) {
    renderer.shadowMap.enabled = q.shadows;
    moon.shadow.mapSize.set(q.map, q.map);
    moon.shadow.map?.dispose();
    moon.shadow.map = null;
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => (m.needsUpdate = true)); });
  }
  bloom.enabled = q.bloom;
  if (announce) app.toast(`🎛 画質 Quality: ${q.ja} ${q.en}`, 2000);
}
function setExposure(i, announce = true) {
  expIdx = (i + EXPOSURE.length) % EXPOSURE.length;
  renderer.toneMappingExposure = EXPOSURE[expIdx];
  if (announce) app.toast(`☀ 明るさ Brightness ${expIdx + 1}/${EXPOSURE.length}`, 2000);
}

app.world = buildWorld(scene);
app.glow = new Particles(scene, 9000);
app.water = new Particles(scene, 2500, { additive: true });
app.beams = new Beams(scene);
app.ufos = new UfoFleet(app, 3);
app.dragon = new Dragon(app);

// ---------------------------------------------------------- textures
const loader = new THREE.TextureLoader();
function loadTexture(url) {
  return new Promise((res, rej) => loader.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    res(t);
  }, undefined, rej));
}

async function addItem(item, { instant = false } = {}) {
  const tpl = data.byId[item.template];
  if (!tpl) return;
  let texture;
  try {
    if (item.canvas) { texture = new THREE.CanvasTexture(item.canvas); texture.colorSpace = THREE.SRGBColorSpace; }
    else texture = await loadTexture(item.url);
  } catch { console.warn('texture failed', item.url); return; }

  // keep each category under its limit: the oldest drawing says goodbye
  const same = app.actors.filter(a => a.tpl.kind === tpl.kind);
  if (same.length >= LIMITS[tpl.kind]) removeActor(same[0]);

  const actor = createActor(app, item, tpl, texture);
  if (!actor) return;
  app.actors.push(actor);
  if (instant) {
    scene.add(actor.root);
    actor.active = true;
  } else {
    app.ufos.enqueue(actor);
    app.toast(`🛸 あたらしいなかま! ${tpl.name_ja} がやってきた! A new ${tpl.name_en} is arriving!`);
  }
  updateHud();
}

function removeActor(a) {
  app.glow.burst(a.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 60, new THREE.Color(0.8, 0.9, 1), 6, 0.6, 1);
  a.disposed = true;
  a.dispose();
  app.actors.splice(app.actors.indexOf(a), 1);
}

function clearAll() { [...app.actors].forEach(removeActor); updateHud(); }

let demoSeed = 0;
function spawnDemo(n = 6, opts = {}) {
  const order = data.templates.map(t => t.id);
  for (let i = 0; i < n; i++) {
    const tpl = data.byId[order[(demoSeed++) % order.length]];
    const canvas = makeDemoTexture(data.sheet, tpl);
    setTimeout(() => addItem({ id: crypto.randomUUID(), template: tpl.id, canvas, color: '#ff7a59' }, opts), opts.instant ? 0 : i * 900);
  }
}

function updateHud() {
  const count = k => app.actors.filter(a => a.tpl.kind === k).length;
  $('hud').textContent = `スケッチタウン Sketch Town — 🚚 ${count('vehicle')}  🏠 ${count('building')}  ✈️ ${count('jet')}  🚁 ${count('heli')}  🚀 ${count('rocket')}  ⛵ ${count('boat')}  🐟 ${count('fish')}`;
}

// ---------------------------------------------------------- day/night
let nightTarget = 1;
function applyNight(n) {
  app.world.uniforms.uNight.value = n;
  hemi.intensity = THREE.MathUtils.lerp(1.4, 0.8, n);
  ambient.intensity = THREE.MathUtils.lerp(0.5, 0.28, n);
  moon.intensity = THREE.MathUtils.lerp(2.6, 1.35, n);
  moon.color.setHSL(THREE.MathUtils.lerp(0.12, 0.62, n), 0.4, 0.9);
  bloom.strength = THREE.MathUtils.lerp(0.35, 0.85, n);
  scene.fog.color.setHSL(THREE.MathUtils.lerp(0.58, 0.72, n), 0.45, THREE.MathUtils.lerp(0.78, 0.14, n));
  scene.fog.density = THREE.MathUtils.lerp(0.0011, 0.0028, n);
  for (const m of app.world.winMats) m.emissiveIntensity = THREE.MathUtils.lerp(0.15, 0.9, n);
}

// ---------------------------------------------------- pointer / clicks
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null, lastInput = performance.now();

function pick(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = app.actors.filter(a => a.active).map(a => a.root);
  if (app.dragon.active && !app.dragon.dying) targets.push(app.dragon.root);
  const hit = raycaster.intersectObjects(targets, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.actor && !o.userData.dragon) o = o.parent;
  return o ? { actor: o.userData.actor, dragon: !!o.userData.dragon, point: hit.point } : null;
}

function counterAttack(from, point, dmg) {
  app.beams.fire(from, point, 0x7dffff, 0.22);
  app.audio.beam();
  setTimeout(() => app.dragon.damage(dmg, point), 120);
}

renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; lastInput = performance.now(); controls.autoRotate = touring; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  downAt = null;
  const h = pick(e);
  if (!h) return;
  if (h.dragon) {
    // every jet / truck / car nearby fires a counter-defence beam at the touched spot
    const shooters = app.actors.filter(a => a.active && !['building', 'fish'].includes(a.tpl.kind))
      .sort((a, b) => a.root.position.distanceTo(h.point) - b.root.position.distanceTo(h.point)).slice(0, 3);
    if (!shooters.length) counterAttack(camera.position.clone().add(new THREE.Vector3(0, -6, -4)), h.point, 6);
    shooters.forEach((s, i) => setTimeout(() => counterAttack(s.root.position.clone().add(new THREE.Vector3(0, 1.2, 0)), h.point, 4), i * 110));
  } else if (h.actor) {
    h.actor.poke();
    if (app.dragon.active && !app.dragon.dying && !['building', 'fish'].includes(h.actor.tpl.kind)) {
      const from = h.actor.root.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      counterAttack(from, app.dragon.nearestPoint(from), 6);
    }
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (e.buttons) return;
  if (performance.now() - (pick.last || 0) < 80) return;
  pick.last = performance.now();
  renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab';
});

// --------------------------------------------------------- commands
let touring = false;
function command(cmd) {
  switch (cmd.type) {
    case 'dragon': app.dragon.start(); break;
    case 'demo': spawnDemo(cmd.count || 6); break;
    case 'daynight': nightTarget = nightTarget > 0.5 ? 0 : 1; break;
    case 'tour': touring = !touring; controls.autoRotate = touring; break;
    case 'volume': app.audio.setVolume(cmd.value); break;
    case 'clear': clearAll(); break;
    case 'remove': { const a = app.actors.find(x => x.item.id === cmd.id); if (a) removeActor(a); updateHud(); break; }
    case 'home': camera.position.copy(HOME.pos); controls.target.copy(HOME.target); break;
    case 'quality': setQuality(qIdx + 1); store.set('st_quality', qIdx); break;
    case 'brightness': setExposure(expIdx + 1); store.set('st_exposure', expIdx); break;
  }
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'd') command({ type: 'dragon' });
  else if (k === 'n') command({ type: 'daynight' });
  else if (k === 't') command({ type: 'tour' });
  else if (k === 's') command({ type: 'demo', count: 6 });
  else if (k === 'h') command({ type: 'home' });
  else if (k === 'q') command({ type: 'quality' });
  else if (k === 'b') command({ type: 'brightness' });
  else if (k === 'm') app.audio.setVolume(app.audio.volume > 0 ? 0 : 0.7);
  else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

const bus = new Bus(ev => {
  if (ev.type === 'spawn') addItem(ev.item);
  else if (ev.type === 'command') command(ev.command);
});

$('start').addEventListener('click', () => {
  app.audio.start();
  $('start').remove();
  if (!app.actors.length) spawnDemo(6);
  if (autoQuality) watchFps();
});

// measure the frame rate for a few seconds and step quality down if the PC struggles
function watchFps(round = 0) {
  let frames = 0;
  const t0 = performance.now();
  const count = () => {
    frames++;
    if (performance.now() - t0 < 6000) return requestAnimationFrame(count);
    const fps = frames / 6;
    if (fps < 28 && qIdx < QUALITY.length - 1) {
      setQuality(qIdx + 1);
      if (round < 1) setTimeout(() => watchFps(round + 1), 2000);
    }
  };
  requestAnimationFrame(count);
}

// restore the drawings saved on the server so a restart keeps the city
try {
  const gallery = await (await fetch('/api/gallery')).json();
  const keep = [];
  const counts = {};
  for (const it of gallery.reverse()) {
    counts[it.kind] = (counts[it.kind] || 0) + 1;
    if (counts[it.kind] <= LIMITS[it.kind]) keep.push(it);
  }
  for (const it of keep.reverse()) await addItem(it, { instant: true });
} catch { /* no server gallery */ }
updateHud();

// ---------------------------------------------------------------- loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  app.glow.resize(); app.water.resize();
});

const clock = new THREE.Clock();
const spout = { v: new THREE.Vector3(), c: new THREE.Color(0.75, 0.95, 1), next: 0 };
function frame() {
  const dt = Math.min(clock.getDelta(), app.maxDt), t = clock.elapsedTime;
  const n = app.world.uniforms.uNight.value;
  if (Math.abs(n - nightTarget) > 0.001) applyNight(n + Math.sign(nightTarget - n) * Math.min(Math.abs(nightTarget - n), dt / 3));

  // idle: drift the camera slowly so the wall never looks frozen
  if (!touring && performance.now() - lastInput > 60000) controls.autoRotate = true;

  app.world.update(t, dt, camera);
  for (const a of app.actors) a.update(dt, t);
  app.ufos.update(dt, t);
  app.dragon.update(dt);

  // Merlion's continuous water arc
  const m = app.world.merlion;
  for (let i = 0; i < 6; i++) {
    spout.v.copy(m.forward).multiplyScalar(6.5 + Math.random() * 0.8).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 3.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4));
    app.water.emit(m.mouthWorld, spout.v, spout.c, 0.55, 1.75, -9.8, 0.05);
  }
  if (t > spout.next) {
    spout.next = t + 0.9;
    const land = m.mouthWorld.clone().addScaledVector(m.forward, 6.9 * 1.55);
    app.world.addRipple(land.x, land.z);
  }

  app.glow.update(dt);
  app.water.update(dt);
  app.beams.update(dt);
  controls.update();
  composer.render();
  requestAnimationFrame(frame);
}
applyNight(1);
setQuality(qIdx, false);
setExposure(expIdx, false);
frame();
Object.assign(app, { addItem, command, spawnDemo, controls });
window.__sketchTown = app; // handy for debugging from the console
