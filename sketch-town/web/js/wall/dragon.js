import * as THREE from 'three';

// Articulated cerulean-blue dragon with a yellow underbelly, horns and flapping wings.
// It swoops over the city breathing fire; kids tap it (or tap jets/trucks) to fire
// energy beams until its HP reaches zero.

const BLUE = new THREE.Color(0x1f7bff), BELLY = new THREE.Color(0xffd23f);
const SEGMENTS = 26, SIZE = 1.9;

function twoToneSphere() {
  const g = new THREE.SphereGeometry(1, 20, 14);
  const n = g.attributes.normal, colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < n.count; i++) {
    const y = n.getY(i);
    c.copy(BLUE).lerp(BELLY, THREE.MathUtils.smoothstep(-y, 0.05, 0.45));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

function wingGeometry(side) {
  // membrane fan: root at origin, 4 finger tips
  const tips = [[1.5, 0.4, 6.5], [0.2, 0.1, 7.8], [-1.4, -0.1, 6.6], [-3, -0.2, 4.2]];
  const pos = [];
  const root = [0, 0, 0], elbow = [1.0, 0.6, 3.0];
  let prev = root;
  for (const t of tips) { pos.push(...elbow, ...prev, ...t); prev = t; }
  pos.push(...elbow, ...prev, -3.2, 0, 0.6);
  const g = new THREE.BufferGeometry();
  // stored as [chord, height, span]; output with the span along ±X (outward from the body)
  const out = [];
  for (let i = 0; i < pos.length; i += 3) out.push(pos[i + 2] * side, pos[i + 1], pos[i]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

export class Dragon {
  constructor(app) {
    this.app = app;
    this.root = new THREE.Group();
    this.root.userData.dragon = true;
    this.active = false;
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0, emissive: 0x0a2a66, emissiveIntensity: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8a5a00, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.35 });
    this.gold = gold;
    const sphere = twoToneSphere();
    const spikeGeo = new THREE.ConeGeometry(0.28, 0.9, 5);

    this.segs = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const s = new THREE.Group();
      const t = i / (SEGMENTS - 1);
      const r = SIZE * 1.25 * (1 - t * 0.82) * (i < 3 ? 0.85 + i * 0.05 : 1);
      const ball = new THREE.Mesh(sphere, this.mat);
      ball.scale.set(r, r * 0.95, r * 1.25);
      ball.castShadow = true;
      s.add(ball);
      if (i % 2 === 0 && i > 1) {
        const sp = new THREE.Mesh(spikeGeo, gold);
        sp.position.y = r * 0.95; sp.rotation.x = -0.5; sp.scale.setScalar(0.6 + r * 0.6);
        s.add(sp);
      }
      if (i === 6 || i === 15) { // little legs with claws
        for (const sd of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.9, 3, 6), this.mat);
          leg.position.set(sd * r * 0.8, -r * 0.8, 0); leg.rotation.z = sd * 0.5; leg.scale.setScalar(SIZE);
          s.add(leg);
        }
      }
      if (i === SEGMENTS - 1) { // tail fin
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 4), gold);
        fin.rotation.x = -Math.PI / 2; fin.position.z = -SIZE; fin.scale.set(SIZE, SIZE, 0.3 * SIZE);
        s.add(fin);
      }
      this.root.add(s);
      const prev = this.segs[i - 1];
      this.segs.push({ g: s, r, dist: (prev ? prev.dist : 0) + Math.max(0.5, r * 1.15) + (i === 0 ? SIZE : 0) });
    }

    // head
    const head = new THREE.Group();
    const skull = new THREE.Mesh(sphere, this.mat); skull.scale.set(1.25, 1.0, 1.5); head.add(skull);
    const snout = new THREE.Mesh(sphere, this.mat); snout.scale.set(0.85, 0.6, 1.2); snout.position.set(0, -0.1, 1.5); head.add(snout);
    this.jaw = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: BELLY, emissive: 0x664400, emissiveIntensity: 0.5 }));
    this.jaw.scale.set(0.75, 0.3, 1.2); this.jaw.position.set(0, -0.55, 1.3);
    head.add(this.jaw);
    for (const sd of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2.0, 8), gold);
      horn.position.set(sd * 0.65, 1.1, -0.6); horn.rotation.set(-0.9, 0, sd * -0.35);
      head.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff27a }));
      eye.position.set(sd * 0.75, 0.35, 0.9);
      head.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      pupil.position.set(sd * 0.92, 0.38, 1.08);
      head.add(pupil);
      const whisker = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(sd * 0.5, -0.2, 2.3), new THREE.Vector3(sd * 1.6, -0.1, 2.0), new THREE.Vector3(sd * 2.6, -0.6, 0.8), new THREE.Vector3(sd * 3.0, -1.4, -0.4),
      ]), 16, 0.05, 4), gold);
      head.add(whisker);
    }
    this.mouth = new THREE.Object3D(); this.mouth.position.set(0, -0.4, 2.6); head.add(this.mouth);
    head.scale.setScalar(1.35 * SIZE);
    this.head = head;
    this.root.add(head);

    // wings attached to segment 3
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x5fb4ff, emissive: 0x1f5cff, emissiveIntensity: 0.6, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
    this.wings = [-1, 1].map(sd => {
      const w = new THREE.Mesh(wingGeometry(sd), wingMat);
      const pivot = new THREE.Group();
      pivot.add(w);
      pivot.position.set(0, 0.8 * SIZE, 0);
      pivot.scale.setScalar(SIZE);
      this.segs[3].g.add(pivot);
      return { pivot, sd };
    });
    this.root.traverse(o => { o.userData.dragon = true; });
    this.root.visible = false;
    app.scene.add(this.root);

    this.trail = [];
    this.hpEl = document.getElementById('hp');
    this.hpBar = document.getElementById('hpBar');
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.dying = 0;
    this.hp = this.maxHp = 100;
    this.t = 0;
    this.fireTimer = 4;
    this.breath = 0;
    this.lastHit = 0;
    this.pos = new THREE.Vector3(-170, 70, -160);
    this.vel = new THREE.Vector3(1, 0, 0.3);
    this.trail = [];
    for (let i = 0; i < SEGMENTS * 8; i++) this.trail.push({ p: this.pos.clone().add(new THREE.Vector3(-i * 0.3, 0, 0)) });
    this.segs.forEach(s => s.g.scale.setScalar(1));
    this.head.visible = true;
    this.root.visible = true;
    this.app.audio.setMode('battle');
    this.app.audio.roar();
    this.updateHp();
    this.hpEl.classList.add('show');
    this.app.toast('🐉 ドラゴンがきた! みんなでタッチしてまもろう!  Dragon attack! Tap it to defend the city!', 5000);
  }

  target(t) {
    const w = 0.22;
    const R = 46 + Math.sin(t * 0.13) * 10;
    const dive = Math.max(0, Math.sin(t * 0.5)) ** 6;
    return new THREE.Vector3(Math.cos(t * w) * R, 22 + Math.sin(t * w * 2.3) * 7 - dive * 12, -12 + Math.sin(t * w) * R * 0.6);
  }

  updateHp() {
    this.hpBar.style.width = `${Math.max(0, (this.hp / this.maxHp) * 100)}%`;
  }

  damage(n, at) {
    if (!this.active || this.dying) return;
    this.hp -= n;
    this.lastHit = this.t;
    this.flash = 0.25;
    this.app.audio.hit();
    this.app.glow.burst(at, 40, new THREE.Color(0.5, 1, 1), 8, 0.6, 0.8, 0);
    this.updateHp();
    if (this.hp <= 0) this.defeat();
  }

  nearestPoint(p) {
    let best = this.head.position, d = Infinity;
    for (const s of this.segs) { const dd = s.g.position.distanceToSquared(p); if (dd < d) { d = dd; best = s.g.position; } }
    return best.clone();
  }

  defeat() {
    this.dying = 0.001;
    this.app.audio.fanfare();
    this.app.audio.setMode('calm');
    this.hpEl.classList.remove('show');
    this.app.toast('🎉 やったね! まちをまもったよ!  You saved the city!', 5000);
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const app = this.app;

    if (this.dying) {
      // burst into fireworks, segment by segment from the tail
      this.dying += dt;
      const n = Math.floor(this.dying * 12);
      this.segs.forEach((s, i) => {
        const k = SEGMENTS - 1 - i;
        if (k < n && s.g.scale.x > 0.01) {
          app.glow.burst(s.g.position, 50, new THREE.Color().setHSL(Math.random(), 1, 0.6), 10, 0.8, 1.6, -3);
          s.g.scale.setScalar(0.001);
        }
      });
      if (n > SEGMENTS && this.head.visible) {
        app.glow.burst(this.head.position, 200, new THREE.Color(1, 0.9, 0.4), 16, 1, 2, -3);
        this.head.visible = false;
      }
      if (this.dying > 4) { this.active = false; this.root.visible = false; }
      return;
    }

    // steer the head toward the swooping path
    const goal = this.t < 8 ? this.target(0).lerp(this.pos, Math.max(0, 1 - this.t / 8) * 0.5) : this.target(this.t);
    const desired = goal.sub(this.pos).normalize().multiplyScalar(this.t < 8 ? 26 : 17);
    this.vel.lerp(desired, Math.min(1, dt * 1.6));
    this.pos.addScaledVector(this.vel, dt);
    this.trail.unshift({ p: this.pos.clone() });
    if (this.trail.length > 600) this.trail.length = 600;

    // head orientation
    const fwd = this.vel.clone().normalize();
    this.head.position.copy(this.pos);
    this.head.lookAt(this.pos.clone().add(fwd));

    // body segments follow the head's trail at fixed arc-length spacing
    let acc = 0, ti = 0;
    for (let i = 0; i < SEGMENTS; i++) {
      const want = this.segs[i].dist;
      while (ti < this.trail.length - 1 && acc < want) { acc += this.trail[ti].p.distanceTo(this.trail[ti + 1].p); ti++; }
      const s = this.segs[i].g;
      s.position.copy(this.trail[ti].p);
      s.position.y += Math.sin(this.t * 4 - i * 0.5) * 0.25 * (i / SEGMENTS);
      const ahead = i === 0 ? this.head.position : this.segs[i - 1].g.position;
      s.lookAt(ahead);
    }

    // wing flap
    for (const w of this.wings) w.pivot.rotation.z = w.sd * (Math.sin(this.t * 5) * 0.7 + 0.15);

    // hit flash
    this.flash = Math.max(0, (this.flash || 0) - dt);
    this.mat.emissive.setRGB(0.04 + this.flash * 3, 0.16 + this.flash * 3, 0.4 + this.flash * 3);

    // fire breath
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.t > 8) {
      this.breath = 1.8;
      this.fireTimer = 5 + Math.random() * 3;
      this.victim = app.nearestActor(this.pos.clone().addScaledVector(fwd, 20));
      app.audio.fire(1.8);
      app.audio.roar();
    }
    if (this.breath > 0) {
      this.breath -= dt;
      this.jaw.position.y = -0.85;
      const m = this.mouth.getWorldPosition(new THREE.Vector3());
      const aim = this.victim ? this.victim.root.position.clone().sub(m).normalize() : fwd.clone().add(new THREE.Vector3(0, -0.6, 0)).normalize();
      for (let i = 0; i < 14; i++) {
        const v = aim.clone().multiplyScalar(22 + Math.random() * 8).add(new THREE.Vector3().randomDirection().multiplyScalar(3));
        const c = new THREE.Color().setHSL(0.02 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.2);
        app.glow.emit(m, v, c, 1.4 + Math.random(), 0.9, -2, 0.8);
      }
      if (this.victim && this.breath < 1.0 && !this.victim.scared) {
        this.victim.scared = 2.5;
        this.victim.hopV = 6; this.victim.spin = Math.PI * 2;
      }
    } else this.jaw.position.y = -0.55;

    // give up and fly away if nobody fights back for a long time
    if (this.t - this.lastHit > 120 && this.t > 120) this.defeat();
  }
}
