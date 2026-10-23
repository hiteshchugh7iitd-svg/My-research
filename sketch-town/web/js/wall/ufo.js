import * as THREE from 'three';

// UFO tractor-beam delivery: fly in, beam down, lower the spinning drawing, fly away.

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,250,170,0.95)');
  grd.addColorStop(0.7, 'rgba(255,230,90,0.35)');
  grd.addColorStop(1, 'rgba(255,220,60,0.08)');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildSaucer() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16), new THREE.MeshStandardMaterial({ color: 0xd9e2f2, metalness: 0.85, roughness: 0.25, emissive: 0x334466, emissiveIntensity: 0.4 }));
  hull.scale.set(4.2, 0.9, 4.2);
  g.add(hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8ff7ff, transparent: true, opacity: 0.6, emissive: 0x2bd8ff, emissiveIntensity: 0.8, roughness: 0.1 }));
  dome.position.y = 0.5;
  g.add(dome);
  const lights = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    l.position.set(Math.cos(a) * 3.7, -0.1, Math.sin(a) * 3.7);
    g.add(l);
    lights.push(l);
  }
  const under = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
  under.rotation.x = Math.PI / 2;
  under.position.y = -0.85;
  g.add(under);
  g.traverse(o => { o.castShadow = true; });
  return { g, lights };
}

class UFO {
  constructor(app) {
    this.app = app;
    const { g, lights } = buildSaucer();
    this.mesh = g; this.lights = lights;
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 5.5, 1, 32, 1, true), this.beamMat);
    this.rings = [0, 1, 2].map(() => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      r.rotation.x = Math.PI / 2;
      return r;
    });
    this.busy = false;
  }

  deliver(actor, done) {
    this.busy = true;
    this.actor = actor;
    this.done = done;
    const land = actor.landing();
    this.land = land;
    this.hover = land.clone().add(new THREE.Vector3(0, 13, 0));
    const side = Math.random() < 0.5 ? -1 : 1;
    this.from = new THREE.Vector3(side * 140, 70, -80 + Math.random() * 60);
    this.to = new THREE.Vector3(-side * 140, 80, -120);
    this.phase = 'in'; this.t = 0;
    this.app.scene.add(this.mesh, this.beam, ...this.rings);
    this.mesh.position.copy(this.from);
    actor.root.visible = false;
    this.app.scene.add(actor.root);
    this.app.audio.ufo(2.6);
  }

  update(dt, time) {
    if (!this.busy) return;
    this.t += dt;
    this.mesh.rotation.y += dt * 2.5;
    this.lights.forEach((l, i) => l.material.color.setHSL((i / 14 + time * 0.5) % 1, 1, 0.65));
    const a = this.actor;
    const dur = { in: 2.6, beam: 0.5, lower: 2.6, off: 0.5, out: 2.2 }[this.phase];
    const k = Math.min(1, this.t / dur);
    const wobble = Math.sin(time * 3) * 0.3;

    if (this.phase === 'in') {
      this.mesh.position.lerpVectors(this.from, this.hover, ease(k));
      this.mesh.rotation.z = (1 - k) * 0.3;
    } else {
      this.mesh.position.copy(this.hover).y += wobble;
    }
    if (this.phase === 'beam' || this.phase === 'lower' || this.phase === 'off') {
      const h = this.hover.y - this.land.y;
      this.beam.position.set(this.hover.x, this.land.y + h / 2, this.hover.z);
      this.beam.scale.set(1, h, 1);
      this.beamMat.opacity = this.phase === 'beam' ? k * 0.9 : this.phase === 'off' ? (1 - k) * 0.9 : 0.75 + Math.sin(time * 20) * 0.1;
      this.rings.forEach((r, i) => {
        const f = ((time * 0.6 + i / 3) % 1);
        r.visible = this.phase === 'lower';
        r.position.set(this.hover.x, this.hover.y - f * h, this.hover.z);
        r.scale.setScalar(1.2 + f * 4.3);
        r.material.opacity = 1 - f;
      });
      if (Math.random() < 0.6) {
        const p = new THREE.Vector3(this.hover.x + (Math.random() - 0.5) * 6, this.land.y + Math.random() * h, this.hover.z + (Math.random() - 0.5) * 6);
        this.app.glow.emit(p, new THREE.Vector3(0, 1.5, 0), new THREE.Color(1, 0.95, 0.5), 0.4, 1.2);
      }
    } else {
      this.beamMat.opacity = 0;
      this.rings.forEach(r => (r.visible = false));
    }
    if (this.phase === 'lower') {
      a.root.visible = true;
      a.root.position.lerpVectors(this.hover.clone().add(new THREE.Vector3(0, -1.5, 0)), this.land, ease(k));
      a.parts.body.rotation.y = (1 - ease(k)) * Math.PI * 6;
      a.parts.body.scale.setScalar(0.3 + 0.7 * ease(k));
    }
    if (this.phase === 'out') {
      this.mesh.position.lerpVectors(this.hover, this.to, ease(k));
    }

    if (k >= 1) {
      this.t = 0;
      if (this.phase === 'in') { this.phase = 'beam'; this.app.onArrive?.(a); }
      else if (this.phase === 'beam') this.phase = 'lower';
      else if (this.phase === 'lower') {
        this.phase = 'off';
        a.parts.body.rotation.y = 0;
        a.parts.body.scale.setScalar(1);
        a.active = true;
        this.app.glow.burst(this.land.clone().add(new THREE.Vector3(0, 1, 0)), 80, new THREE.Color(1, 0.85, 0.4), 7, 0.6, 1.2);
        this.app.audio.chime();
        if (a.tpl.kind === 'boat') this.app.world.addRipple(this.land.x, this.land.z);
      } else if (this.phase === 'off') this.phase = 'out';
      else {
        this.busy = false;
        this.app.scene.remove(this.mesh, this.beam, ...this.rings);
        this.done?.();
      }
    }
  }
}

export class UfoFleet {
  constructor(app, size = 3) {
    this.app = app;
    this.ufos = Array.from({ length: size }, () => new UFO(app));
    this.queue = [];
  }
  enqueue(actor) { this.queue.push(actor); this.pump(); }
  pump() {
    for (const u of this.ufos) {
      if (!this.queue.length) return;
      if (!u.busy) {
        const a = this.queue.shift();
        if (a.disposed) continue;
        u.deliver(a, () => this.pump());
      }
    }
  }
  update(dt, t) { for (const u of this.ufos) u.update(dt, t); }
}
