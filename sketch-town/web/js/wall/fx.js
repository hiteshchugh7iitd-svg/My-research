import * as THREE from 'three';

// GPU point-sprite particle pool, updated on the CPU. Used for thruster trails,
// dragon fire, Merlion water, sparkles and fireworks.
export class Particles {
  constructor(scene, capacity = 6000, { additive = true, sizeScale = 1 } = {}) {
    this.n = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: window.innerHeight * 0.5 * sizeScale } },
      vertexShader: /* glsl */`
        attribute float size; attribute float alpha; attribute vec3 color;
        varying vec3 vColor; varying float vAlpha; uniform float scale;
        void main() {
          vColor = color; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          if (vAlpha * a < 0.01) discard;
          gl_FragColor = vec4(vColor * (0.6 + a), vAlpha * a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(p, v, color, size = 0.6, life = 1, grav = 0, drag = 0) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.n;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.col.set([color.r, color.g, color.b], i * 3);
    this.size[i] = this.size0[i] = size;
    this.life[i] = this.maxLife[i] = life;
    this.alpha[i] = 1;
    this.grav[i] = grav;
    this.drag[i] = drag;
  }

  burst(p, count, color, speed = 6, size = 0.5, life = 1.2, grav = -4) {
    const v = new THREE.Vector3(), c = new THREE.Color();
    for (let k = 0; k < count; k++) {
      v.randomDirection().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      c.copy(color).offsetHSL((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.2);
      this.emit(p, v, c, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), grav, 1.2);
    }
  }

  update(dt) {
    const { pos, vel, life, maxLife, grav, drag, alpha, size, size0 } = this;
    for (let i = 0; i < this.n; i++) {
      if (life[i] <= 0) { if (alpha[i] !== 0) alpha[i] = 0; continue; }
      life[i] -= dt;
      const j = i * 3, k = Math.max(0, 1 - drag[i] * dt);
      vel[j] *= k; vel[j + 1] = vel[j + 1] * k + grav[i] * dt; vel[j + 2] *= k;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      const t = Math.max(0, life[i] / maxLife[i]);
      alpha[i] = t < 0.3 ? t / 0.3 : 1;
      size[i] = size0[i] * (0.4 + 0.6 * t);
    }
    for (const name of ['position', 'color', 'size', 'alpha']) this.geo.attributes[name].needsUpdate = true;
  }

  resize() { this.mat.uniforms.scale.value = window.innerHeight * 0.5; }
}

// Cheap reusable glowing beam (energy blasts, tractor beam edges)
export class Beams {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
  }

  fire(from, to, color = 0x66ffff, width = 0.25, life = 0.45) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const core = new THREE.Mesh(this.geo, mat);
    core.position.copy(from);
    core.lookAt(to);
    core.scale.set(width, width, from.distanceTo(to));
    const glow = new THREE.Mesh(this.geo, mat.clone());
    glow.material.opacity = 0.35;
    glow.scale.set(3, 3, 1);
    core.add(glow);
    this.scene.add(core);
    this.list.push({ mesh: core, life, max: life });
  }

  update(dt) {
    this.list = this.list.filter(b => {
      b.life -= dt;
      const t = Math.max(0, b.life / b.max);
      b.mesh.material.opacity = t;
      b.mesh.children[0].material.opacity = 0.35 * t;
      if (b.life > 0) return true;
      this.scene.remove(b.mesh);
      b.mesh.material.dispose(); b.mesh.children[0].material.dispose();
      return false;
    });
  }
}
