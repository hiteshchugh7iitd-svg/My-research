import * as THREE from 'three';

// 2D drawing -> 3D paper-craft mesh. Each template part polygon is extruded and the
// scanned texture is projected onto it (front, back and the edge walls), so the
// child's colours wrap the whole model and nothing outside the silhouette exists.

const SHEET_W = 1600, SHEET_H = 1200;
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

function bounds(tpl) {
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const add = (x, y) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
  tpl.parts.forEach(p => p.poly.forEach(([x, y]) => add(x, y)));
  (tpl.wheels || []).forEach(w => { add(w.c[0] - w.r, w.c[1] + w.r); add(w.c[0] + w.r, w.c[1] - w.r); });
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// Paper-craft material: lit like paper, with a little self-glow so drawings read at night.
function paperMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.16,
    roughness: 0.85, metalness: 0, alphaTest: 0.35, side: THREE.DoubleSide,
  });
}

function extrudePart(poly, depth, k, b, bend = 0) {
  // page px -> model units: x right, y up, origin at bottom-centre of the drawing
  const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2((x - b.cx) * k, (b.maxY - y) * k)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth * k, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 4,
  });
  geo.translate(0, 0, -depth * k / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  const xs = poly.map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i) / k + b.cx, py = b.maxY - p.getY(i) / k;
    uv.setXY(i, px / SHEET_W, 1 - py / SHEET_H);
    if (bend) { const t = (px - x0) / (x1 - x0 || 1); p.setZ(i, p.getZ(i) + bend * Math.sin(Math.PI * t)); } // billowing sail
  }
  geo.computeVertexNormals();
  return geo;
}

function wheelMesh(w, k, b, texture, thickness) {
  const r = w.r * k;
  const geo = new THREE.CylinderGeometry(r, r, thickness, 24, 1);
  geo.rotateX(Math.PI / 2);
  // map both caps onto the wheel circle in the drawing
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const px = w.c[0] + p.getX(i) / k, py = w.c[1] - p.getY(i) / k;
    uv.setXY(i, px / SHEET_W, 1 - py / SHEET_H);
  }
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.2 }));
  m.castShadow = true;
  return m;
}

export function buildModel(tpl, texture, color = '#ff6060') {
  const b = bounds(tpl);
  const k = tpl.unitsPer1000px / 1000;
  const mat = paperMaterial(texture);
  const root = new THREE.Group();       // positioned by behaviours
  const body = new THREE.Group();       // local animation (hop, spin, sway)
  root.add(body);
  const parts = { root, body, wheels: [], windows: [], sails: [] };

  let model = new THREE.Group();
  for (const part of tpl.parts) {
    const geo = extrudePart(part.poly, part.depth, k, b, part.sail ? 0.6 : 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    model.add(mesh);
    if (part.sail) parts.sails.push(mesh);
  }
  const maxDepth = Math.max(...tpl.parts.map(p => p.depth)) * k;

  if (tpl.kind === 'vehicle') {
    for (const w of tpl.wheels) for (const s of [-1, 1]) {
      const wm = wheelMesh(w, k, b, texture, 0.32);
      const pivot = new THREE.Group();
      pivot.position.set((w.c[0] - b.cx) * k, (b.maxY - w.c[1]) * k, s * (maxDepth / 2 + 0.17));
      pivot.add(wm);
      model.add(pivot);
      parts.wheels.push({ pivot, r: w.r * k });
    }
    // headlights
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }));
    for (const s of [-1, 1]) {
      const h = hl.clone();
      h.position.set((b.maxX - b.cx) * k, (b.maxY - (b.minY * 0.3 + b.maxY * 0.7)) * k, s * maxDepth * 0.3);
      model.add(h);
    }
    // vehicles drive along +X (drawn facing right)
  }

  if (tpl.kind === 'building') {
    // emissive glowing windows on both faces
    const winMat = new THREE.MeshBasicMaterial({ map: texture, color: 0xffd98a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [x, y, w, h] of tpl.windows) for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(w * k, h * k);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / SHEET_W, 1 - (y + (1 - uv.getY(i)) * h) / SHEET_H);
      const m = new THREE.Mesh(g, winMat.clone());
      m.position.set((x + w / 2 - b.cx) * k, (b.maxY - y - h / 2) * k, s * (maxDepth / 2 + 0.05));
      if (s < 0) m.rotation.y = Math.PI;
      model.add(m);
      parts.windows.push(m);
    }
  }

  if (tpl.kind === 'boat' && tpl.mast) {
    const m = tpl.mast;
    const h = (m.bottom - m.top) * k;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a3c }));
    mast.position.set((m.x - b.cx) * k, (b.maxY - m.bottom) * k + h / 2, 0);
    model.add(mast);
  }

  if (tpl.kind === 'heli' && tpl.rotor) {
    const r = tpl.rotor;
    const bladeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0.2 });
    const rotor = new THREE.Group();
    rotor.position.set((r.mast[0] - b.cx) * k, (b.maxY - r.y) * k, 0);
    const len = (r.x1 - r.x0) * k;
    for (const a of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.22), bladeMat);
      blade.rotation.y = a;
      rotor.add(blade);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, (r.mast[1] - r.y) * k, 6), bladeMat);
    mast.position.y = -(r.mast[1] - r.y) * k / 2;
    rotor.add(mast);
    model.add(rotor);
    const tail = new THREE.Group();
    tail.position.set((r.tail.c[0] - b.cx) * k, (b.maxY - r.tail.c[1]) * k, maxDepth / 2 + 0.08);
    tail.add(new THREE.Mesh(new THREE.BoxGeometry(r.tail.r * 2 * k, 0.12, 0.04), bladeMat));
    model.add(tail);
    parts.rotor = rotor;
    parts.tailRotor = tail;
  }

  if (tpl.kind === 'rocket') parts.exhaust = new THREE.Vector3(0, 0, 0); // bottom-centre of the drawing

  if (tpl.kind === 'jet') {
    // drawn as a top view with the nose up the page: lay it flat, nose toward +X
    const fin = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1.1, 0, 0), new THREE.Vector3(-1.2, 0.9, 0),
    ]), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
    fin.geometry.computeVertexNormals();
    fin.castShadow = true;
    const flat = new THREE.Group();
    model.rotation.x = -Math.PI / 2;    // page-up becomes -Z
    flat.add(model);
    flat.rotation.y = -Math.PI / 2;     // -Z becomes +X
    const jet = new THREE.Group();
    jet.add(flat);
    // centre the jet on its own middle so it banks around its centre of mass
    const h = (b.maxY - b.minY) * k;
    flat.position.x = -h / 2;
    fin.position.set(-h / 2 + 1.35, 0.02, 0);
    jet.add(fin);
    parts.exhaust = new THREE.Vector3(-h / 2, 0, 0);
    model = jet;
  }

  body.add(model);
  parts.size = { w: (b.maxX - b.minX) * k, h: (b.maxY - b.minY) * k, d: maxDepth };
  return parts;
}

// ============================================================ behaviours
class Actor {
  constructor(app, item, tpl, parts) {
    Object.assign(this, { app, item, tpl, parts });
    this.root = parts.root;
    this.root.traverse(o => { o.userData.actor = this; });
    this.age = 0;
    this.hop = 0; this.hopV = 0; this.spin = 0; this.boost = 0;
    this.active = false; // false while the UFO is still lowering it
  }
  poke() {
    this.hopV = 7; this.spin = Math.PI * 2; this.boost = 3;
    this.app.audio.note();
  }
  animatePoke(dt) {
    if (this.hop > 0 || this.hopV > 0) { this.hopV -= 20 * dt; this.hop = Math.max(0, this.hop + this.hopV * dt); if (this.hop === 0) this.hopV = 0; }
    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 9);
    this.boost = Math.max(0, this.boost - dt);
    this.parts.body.position.y = this.hop;
    this.parts.body.rotation.y = this.spin;
  }
  // position where the UFO should place the model
  landing() { return this.root.position.clone(); }
  dispose() {
    this.app.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
}

export class Vehicle extends Actor {
  constructor(app, item, tpl, parts) {
    super(app, item, tpl, parts);
    const hw = app.world.highways;
    this.road = hw[Math.floor(Math.random() * hw.length)];
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.lane = this.dir * 1.55;
    this.speed = 5 + Math.random() * 3;
    this.s = Math.random() * this.road.length;
    this.place(0);
  }
  frameAt(s) {
    const r = this.road, f = (((s / r.length) % 1) + 1) % 1 * r.N;
    const i = Math.floor(f), t = f - i, a = r.frames[i], b = r.frames[Math.min(i + 1, r.N)];
    return { p: a.p.clone().lerp(b.p, t), tan: a.tan.clone().lerp(b.tan, t).normalize(), side: a.side.clone().lerp(b.side, t).normalize() };
  }
  place(dt) {
    const f = this.frameAt(this.s);
    const ahead = this.frameAt(this.s + this.dir * 3);
    const fwd = f.tan.clone().multiplyScalar(this.dir);
    this.root.position.copy(f.p).addScaledVector(f.side, this.lane);
    // bank into curves: signed horizontal turn rate
    const turn = new THREE.Vector3().crossVectors(fwd, ahead.tan.clone().multiplyScalar(this.dir)).y;
    const target = THREE.MathUtils.clamp(-turn * 2.5, -0.35, 0.35);
    this.bank = THREE.MathUtils.lerp(this.bank || 0, target, Math.min(1, dt * 3));
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    tmpM.makeBasis(fwd, up, right);
    this.root.quaternion.setFromRotationMatrix(tmpM);
    tmpQ.setFromAxisAngle(fwd, this.bank);
    this.root.quaternion.premultiply(tmpQ);
  }
  update(dt) {
    if (!this.active) return;
    const v = this.speed * (this.boost > 0 ? 2.2 : 1) * (this.scared > 0 ? 1.6 : 1);
    this.scared = Math.max(0, (this.scared || 0) - dt);
    this.s += this.dir * v * dt;
    for (const w of this.parts.wheels) w.pivot.rotation.z -= (v * dt) / w.r;
    this.place(dt);
    this.animatePoke(dt);
  }
  landing() { return this.root.position.clone(); }
}

export class Building extends Actor {
  constructor(app, item, tpl, parts, plot) {
    super(app, item, tpl, parts);
    this.plot = plot;
    this.root.position.set(plot.x, 0, plot.z);
    this.root.rotation.y = Math.atan2(app.camera.position.x - plot.x, app.camera.position.z - plot.z) * 0.6;
    this.phase = Math.random() * 6;
    this.flash = 0;
  }
  poke() {
    super.poke();
    this.hopV = 4; this.spin = 0; this.flash = 1.5;
  }
  update(dt, t) {
    if (!this.active) return;
    // gentle sway and bounce, like paper standing in a breeze
    const s = 1 + Math.sin(t * 2 + this.phase) * 0.025;
    this.parts.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    this.parts.body.rotation.z = Math.sin(t * 1.3 + this.phase) * 0.025;
    this.flash = Math.max(0, this.flash - dt);
    const night = this.app.world.uniforms.uNight.value;
    for (const w of this.parts.windows) w.material.opacity = 0.15 + 0.4 * night + Math.sin(this.flash * 12) * this.flash * 0.4;
    this.animatePoke(dt);
  }
  dispose() { this.plot.used = false; super.dispose(); }
}

export class Jet extends Actor {
  constructor(app, item, tpl, parts) {
    super(app, item, tpl, parts);
    this.cx = -20 + Math.random() * 40;
    this.cz = -14 + Math.random() * 28;
    this.alt = 18 + Math.random() * 12;
    this.ax = 45 + Math.random() * 25;
    this.az = 22 + Math.random() * 12;
    this.t = Math.random() * Math.PI * 2;
    this.rate = 0.11 + Math.random() * 0.05;
    this.color = new THREE.Color().setHSL(0.02 + Math.random() * 0.1, 1, 0.55);
    this.place(0.016);
  }
  pathAt(t) { // figure-8 (lemniscate of Gerono) with altitude waves
    return new THREE.Vector3(this.cx + this.ax * Math.sin(t), this.alt + Math.sin(t * 2) * 4, this.cz + this.az * Math.sin(t) * Math.cos(t) * 2);
  }
  place(dt) {
    const p = this.pathAt(this.t), q = this.pathAt(this.t + 0.02);
    const fwd = q.clone().sub(p).normalize();
    const prev = this.fwd || fwd;
    const turn = new THREE.Vector3().crossVectors(prev, fwd).y / Math.max(dt, 1e-3);
    this.fwd = fwd;
    this.bank = THREE.MathUtils.lerp(this.bank || 0, THREE.MathUtils.clamp(-turn * 0.5, -1.0, 1.0), Math.min(1, dt * 2));
    this.root.position.copy(p);
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    tmpM.makeBasis(fwd, up, right);
    this.root.quaternion.setFromRotationMatrix(tmpM);
    this.root.quaternion.premultiply(tmpQ.setFromAxisAngle(fwd, this.bank));
  }
  update(dt) {
    if (!this.active) return;
    this.t += this.rate * dt * (this.boost > 0 ? 2.5 : 1);
    this.place(dt);
    this.animatePoke(dt);
    // red/gold thruster trail
    const ex = this.parts.root.localToWorld(tmpV.copy(this.parts.exhaust));
    const back = this.fwd.clone().multiplyScalar(-4);
    for (let i = 0; i < 3; i++) {
      const c = Math.random() < 0.5 ? this.color : new THREE.Color(1, 0.8, 0.25);
      back.x += (Math.random() - 0.5); back.y += (Math.random() - 0.5); back.z += (Math.random() - 0.5);
      this.app.glow.emit(ex, back, c, 0.7 + Math.random() * 0.5, 0.9, 0, 0.5);
    }
  }
  poke() { super.poke(); this.app.audio.horn(); }
}

export class Boat extends Actor {
  constructor(app, item, tpl, parts) {
    super(app, item, tpl, parts);
    const c = app.world.bayCenter;
    this.cx = c.x + (Math.random() - 0.5) * 16;
    this.cz = c.z + (Math.random() - 0.5) * 24;
    this.r = 5 + Math.random() * 18;
    this.a = Math.random() * Math.PI * 2;
    this.rate = (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.04);
    this.phase = Math.random() * 6;
    this.place(0, 0);
  }
  place(t) {
    const x = this.cx + Math.cos(this.a) * this.r, z = this.cz + Math.sin(this.a) * this.r;
    this.root.position.set(x, 0.05 + Math.sin(t * 1.6 + this.phase) * 0.18, z);
    const heading = Math.atan2(-Math.cos(this.a) * Math.sign(this.rate), -Math.sin(this.a) * Math.sign(this.rate));
    this.root.rotation.set(Math.sin(t * 1.3 + this.phase) * 0.06, heading, Math.sin(t * 1.1 + this.phase) * 0.08);
  }
  update(dt, t) {
    if (!this.active) return;
    this.a += this.rate * dt * (this.boost > 0 ? 3 : 1);
    this.place(t);
    for (const s of this.parts.sails) s.scale.z = 1 + Math.sin(t * 2 + this.phase) * 0.25;
    this.animatePoke(dt);
    if (Math.random() < dt * 0.6) this.app.world.addRipple(this.root.position.x, this.root.position.z);
  }
}

// Fish swim around Merlion Bay with a wagging tail and sometimes leap out with a splash.
export class Fish extends Actor {
  constructor(app, item, tpl, parts) {
    super(app, item, tpl, parts);
    const c = app.world.bayCenter;
    this.cx = c.x + (Math.random() - 0.5) * 18;
    this.cz = c.z + (Math.random() - 0.5) * 26;
    this.r = 6 + Math.random() * 14;
    this.a = Math.random() * Math.PI * 2;
    this.rate = (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.08);
    this.phase = Math.random() * 6;
    this.jump = -1;
    this.nextJump = 3 + Math.random() * 8;
    this.place(0);
  }
  place(t) {
    const sg = Math.sign(this.rate);
    const x = this.cx + Math.cos(this.a) * this.r, z = this.cz + Math.sin(this.a) * this.r;
    let y = -0.12 * this.parts.size.h + Math.sin(t * 2 + this.phase) * 0.1; // belly just under the surface
    let pitch = 0;
    if (this.jump >= 0) {
      const j = this.jump;                     // 0..1 arc
      y += Math.sin(Math.PI * j) * 4.5;
      pitch = (0.5 - j) * 1.6;
    }
    this.root.position.set(x, y, z);
    const heading = Math.atan2(-Math.cos(this.a) * sg, -Math.sin(this.a) * sg);
    this.root.rotation.set(0, heading, pitch, 'YZX');
  }
  update(dt, t) {
    if (!this.active) return;
    this.a += this.rate * dt * (this.boost > 0 ? 3 : 1);
    this.nextJump -= dt;
    if (this.jump < 0 && this.nextJump <= 0) { this.jump = 0; this.splash(); }
    if (this.jump >= 0) {
      this.jump += dt / 1.3;
      if (this.jump >= 1) { this.jump = -1; this.nextJump = 6 + Math.random() * 10; this.splash(); }
    }
    this.place(t);
    this.animatePoke(dt);
    this.parts.body.rotation.y += Math.sin(t * 8 + this.phase) * 0.18; // tail wag
  }
  splash() {
    const p = this.root.position;
    this.app.world.addRipple(p.x, p.z);
    for (let i = 0; i < 40; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4);
      this.app.water.emit(new THREE.Vector3(p.x, 0.2, p.z), v, new THREE.Color(0.75, 0.95, 1), 0.5, 1.1, -9.8, 0.2);
    }
  }
  poke() { super.poke(); if (this.jump < 0) { this.jump = 0; this.splash(); } }
}

// Rockets corkscrew slowly around the skyline, tilted into their flight, with a flame trail.
export class Rocket extends Actor {
  constructor(app, item, tpl, parts) {
    super(app, item, tpl, parts);
    this.cx = -10 + Math.random() * 20;
    this.cz = -20 + Math.random() * 15;
    this.R = 35 + Math.random() * 25;
    this.t = Math.random() * Math.PI * 2;
    this.rate = 0.07 + Math.random() * 0.04;
    this.base = 26 + Math.random() * 12;
    this.place();
  }
  pathAt(t) { return new THREE.Vector3(this.cx + Math.cos(t) * this.R, this.base + Math.sin(t * 3) * 8, this.cz + Math.sin(t) * this.R * 0.6); }
  place() {
    const p = this.pathAt(this.t), q = this.pathAt(this.t + 0.01);
    const v = q.sub(p).normalize();
    this.dir = v;
    this.root.position.copy(p);
    // stay mostly upright, lean 35° toward the direction of travel
    const lean = new THREE.Vector3(v.x, 0, v.z).normalize().multiplyScalar(0.7).add(UP).normalize();
    this.root.quaternion.setFromUnitVectors(UP, lean);
  }
  update(dt) {
    if (!this.active) return;
    this.t += this.rate * dt * (this.boost > 0 ? 3 : 1);
    this.place();
    this.animatePoke(dt);
    this.roll = (this.roll || 0) + dt * 1.5;
    this.parts.body.rotation.y += this.roll; // slow roll shows off both sides
    const ex = this.root.localToWorld(tmpV.copy(this.parts.exhaust));
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this.root.quaternion).multiplyScalar(6);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Color().setHSL(0.03 + Math.random() * 0.12, 1, 0.55);
      const v = down.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1.2));
      this.app.glow.emit(ex, v, c, 0.9 + Math.random() * 0.8, 0.8, 0, 0.6);
    }
  }
}

// Helicopters patrol over the city in slow circles, nose slightly down, rotors spinning.
export class Heli extends Actor {
  constructor(app, item, tpl, parts) {
    super(app, item, tpl, parts);
    this.cx = -45 + Math.random() * 65;
    this.cz = -20 + Math.random() * 45;
    this.R = 10 + Math.random() * 12;
    this.t = Math.random() * Math.PI * 2;
    this.rate = (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.08);
    this.alt = 13 + Math.random() * 8;
    this.place(0);
  }
  place(time) {
    const x = this.cx + Math.cos(this.t) * this.R, z = this.cz + Math.sin(this.t) * this.R;
    this.root.position.set(x, this.alt + Math.sin(time * 1.3 + this.cx) * 0.6, z);
    const sg = Math.sign(this.rate);
    const heading = Math.atan2(-Math.cos(this.t) * sg, -Math.sin(this.t) * sg);
    this.root.rotation.set(sg * 0.12, heading, -0.12, 'YXZ'); // bank into the turn, nose down
  }
  update(dt, time) {
    if (!this.active) return;
    this.t += this.rate * dt * (this.boost > 0 ? 3 : 1);
    this.place(time);
    if (this.parts.rotor) this.parts.rotor.rotation.y += dt * 25;
    if (this.parts.tailRotor) this.parts.tailRotor.rotation.z += dt * 30;
    this.animatePoke(dt);
  }
}

export function createActor(app, item, tpl, texture) {
  const parts = buildModel(tpl, texture, item.color);
  if (tpl.kind === 'vehicle') return new Vehicle(app, item, tpl, parts);
  if (tpl.kind === 'jet') return new Jet(app, item, tpl, parts);
  if (tpl.kind === 'boat') return new Boat(app, item, tpl, parts);
  if (tpl.kind === 'fish') return new Fish(app, item, tpl, parts);
  if (tpl.kind === 'rocket') return new Rocket(app, item, tpl, parts);
  if (tpl.kind === 'heli') return new Heli(app, item, tpl, parts);
  // big drawings (schools, towers) need more room: keep clear of neighbouring buildings
  const r = Math.max(parts.size.w, parts.size.d) / 2;
  const used = app.world.plots.filter(p => p.used);
  const plot = app.world.plots.find(p => !p.used && used.every(u => Math.hypot(u.x - p.x, u.z - p.z) > (r + u.r) * 0.9));
  if (!plot) return null;
  plot.used = true;
  plot.r = r;
  return new Building(app, item, tpl, parts, plot);
}
