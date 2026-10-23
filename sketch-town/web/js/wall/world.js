import * as THREE from 'three';

// Singapore "Future World" panorama: cosmic sky, iridescent planet, Singapore Flyer,
// Supertrees, Marina Bay Sands, ArtScience Museum, Merlion Bay and looping highways.
// Camera looks toward -Z; +X is right (harbour side).

const UP = new THREE.Vector3(0, 1, 0);
// seeded random: every screen (projector, laptop, phone) builds the identical city
let seed = 20261023;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rand = (a, b) => a + rnd() * (b - a);

export const BAY_OUTLINE = [[28, -58], [70, -66], [104, -40], [108, 4], [88, 36], [52, 40], [34, 30], [27, 6], [24, -26]];
export const LANDMARKS = [
  { x: 2, z: -30, r: 17 },   // Marina Bay Sands
  { x: 23, z: -6, r: 9 },    // ArtScience Museum
  { x: -62, z: -40, r: 12 }, // Singapore Flyer
  { x: -32, z: -26, r: 13 }, // Supertrees
  { x: 30, z: 24, r: 6 },    // Merlion
];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// =================================================================== sky
function buildSky(scene, uniforms) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`
        varying vec3 vDir; uniform float uTime; uniform float uNight;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        float noise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 nZen = vec3(0.004,0.006,0.03), nHor = vec3(0.13,0.06,0.24);
          vec3 dZen = vec3(0.35,0.62,0.98), dHor = vec3(1.0,0.80,0.86);
          vec3 zen = mix(dZen, nZen, uNight), hor = mix(dHor, nHor, uNight);
          vec3 col = mix(hor, zen, pow(max(h,0.0), 0.55));
          float n = noise(vDir*3.0 + uTime*0.01) * noise(vDir*7.0 - uTime*0.008);
          col += uNight * vec3(0.35,0.12,0.55) * smoothstep(0.15,0.5,n) * (1.0-h) * 0.6;
          col += uNight * vec3(0.05,0.25,0.45) * smoothstep(0.2,0.6,noise(vDir*5.0+3.0)) * h * 0.4;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
  scene.add(sky);

  // twinkling stars
  const N = 4500, pos = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N);
  const v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    v.randomDirection(); v.y = Math.abs(v.y) * 0.95 + 0.03; v.normalize().multiplyScalar(820);
    pos.set([v.x, v.y, v.z], i * 3); ph[i] = Math.random() * 6.28; sz[i] = Math.random() ** 3 * 5 + 1.2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float phase; attribute float sz; uniform float uTime; varying float vA;
      void main(){ vA = 0.55 + 0.45*sin(uTime*2.0 + phase*7.0); gl_PointSize = sz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying float vA; uniform float uNight;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA*uNight;
        gl_FragColor = vec4(vec3(0.85,0.9,1.0)*1.6, a); }`,
  }));
  scene.add(stars);

  // giant translucent iridescent pastel planet dome on the horizon
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(190, 96, 48),
    new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0);
          vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */`
        varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uTime; uniform float uNight;
        vec3 hsv(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); }
        void main(){
          float fr = pow(1.0 - max(dot(vN, vV), 0.0), 2.2);
          float bands = sin(vP.y*0.06 + uTime*0.15) * 0.5 + 0.5;
          float swirl = sin(vP.x*0.03 + vP.z*0.02 + uTime*0.1 + bands*3.0);
          vec3 base = mix(vec3(1.0,0.82,0.93), vec3(0.78,0.9,1.0), bands);
          vec3 irid = hsv(fract(fr*0.8 + swirl*0.12 + uTime*0.02)) * 0.6 + 0.4;
          vec3 col = mix(base, irid, 0.55) * (0.55 + 0.6*fr);
          float a = mix(0.55, 0.42, uNight) + fr*0.5;
          gl_FragColor = vec4(col * mix(1.0, 0.9, uNight), clamp(a,0.0,1.0));
        }`,
    }));
  planet.position.set(60, -95, -470);
  scene.add(planet);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(260, 2.5, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffd6f5, transparent: true, opacity: 0.35 }));
  ring.position.copy(planet.position); ring.rotation.set(1.35, 0.25, 0.1);
  scene.add(ring);
  return { sky, stars, planet, ring };
}

// ================================================================ ground
function buildGround(scene, bayOutline) {
  const tex = canvasTexture(1024, 1024, (c, w, h) => {
    c.fillStyle = '#1c2a40'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,190,255,0.10)'; c.lineWidth = 5;
    for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); }
    for (let i = 0; i < 90; i++) { c.fillStyle = `hsla(${120 + Math.random() * 60},45%,${22 + Math.random() * 12}%,0.55)`; c.fillRect(Math.floor(Math.random() * 16) * 64 + 6, Math.floor(Math.random() * 16) * 64 + 6, 52, 52); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1 / 70, 1 / 70); // shape UVs are world units
  // a hole where the bay is, so fish can swim in a real basin below the water
  const disc = new THREE.Shape().absarc(0, 0, 420, 0, Math.PI * 2, false);
  disc.holes.push(new THREE.Path(bayOutline.slice(0, -1).map(p => new THREE.Vector2(p.x, -p.z)).reverse()));
  const geo = new THREE.ShapeGeometry(disc, 64);
  geo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

// ===================================================================== bay
function buildBay(scene, uniforms) {
  const pts = BAY_OUTLINE.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const outline = curve.getSpacedPoints(120);
  const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, -p.z)));
  const geo = new THREE.ShapeGeometry(shape, 24);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      varying vec3 vW; uniform float uTime; uniform float uNight; uniform vec3 uRipples[8]; uniform vec3 uCam;
      void main(){
        vec2 p = vW.xz; float t = uTime;
        vec2 g = vec2(0.0);
        g += vec2(cos(p.x*0.35+t*1.3), 0.0)*0.35;
        g += vec2(0.0, cos(p.y*0.42-t*1.1))*0.3;
        g += vec2(cos((p.x+p.y)*0.8+t*2.1))*0.18;
        g += vec2(cos((p.x*1.7-p.y*1.3)+t*2.7), sin(p.y*1.9+t*2.3))*0.08;
        for (int i=0;i<8;i++){ vec3 r = uRipples[i]; if (r.z <= 0.0) continue;
          vec2 d = p - r.xy; float dist = length(d); float age = t - r.z;
          float wave = sin(dist*3.0 - age*7.0) * exp(-dist*0.25) * exp(-age*0.6);
          g += normalize(d+1e-4) * wave * 1.4; }
        vec3 n = normalize(vec3(-g.x*0.25, 1.0, -g.y*0.25));
        vec3 v = normalize(uCam - vW);
        float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 deep = mix(vec3(0.05,0.55,0.62), vec3(0.0,0.20,0.30), uNight);
        vec3 shallow = mix(vec3(0.35,0.95,0.88), vec3(0.08,0.62,0.66), uNight);
        vec3 skyc = mix(vec3(1.0,0.85,0.95), vec3(0.45,0.25,0.65), uNight);
        vec3 col = mix(deep, shallow, 0.5 + 0.5*n.x) ;
        col = mix(col, skyc, fr*0.7);
        vec3 l = normalize(vec3(-0.4, 0.8, -0.5));
        float spec = pow(max(dot(reflect(-l, n), v), 0.0), 60.0);
        col += vec3(1.0,0.95,0.85) * spec * 1.4;
        vec2 cell = floor(p*2.0), lp = fract(p*2.0) - 0.5;
        float sparkle = step(0.97, fract(sin(dot(cell, vec2(12.9,78.2))) * 43758.5 + t*0.3)) * smoothstep(0.12, 0.0, length(lp)) * uNight;
        col += vec3(0.6,0.9,1.0) * sparkle * 0.6;
        // see-through: you look into the water from above, the edges mirror the sky
        gl_FragColor = vec4(col, mix(0.3, 0.92, fr));
      }`,
    transparent: true,
  }));
  water.renderOrder = 1;
  water.position.y = 0.06;
  water.receiveShadow = true;
  scene.add(water);
  // basin: sandy floor and walls below the see-through water
  const DEPTH = 5;
  const floorTex = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#2e9c9a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      c.strokeStyle = `rgba(200,255,240,${0.05 + Math.random() * 0.12})`; c.lineWidth = 2 + Math.random() * 3;
      c.beginPath(); const x = Math.random() * w, y = Math.random() * h;
      c.ellipse(x, y, 10 + Math.random() * 30, 6 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2); c.stroke();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(1 / 14, 1 / 14);
  const floorGeo = new THREE.ShapeGeometry(shape, 24);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: floorTex, color: 0xbff7ee, roughness: 0.9, emissive: 0x0a4a4a, emissiveIntensity: 0.5 }));
  floor.position.y = -DEPTH;
  scene.add(floor);
  const wallPos = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b2 = outline[(i + 1) % outline.length];
    wallPos.push(a.x, 0.05, a.z, b2.x, 0.05, b2.z, a.x, -DEPTH, a.z, b2.x, 0.05, b2.z, b2.x, -DEPTH, b2.z, a.x, -DEPTH, a.z);
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
  wallGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: 0x1f6f78, roughness: 0.9, side: THREE.DoubleSide })));

  // white promenade edge
  const edge = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.45, 6, true),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ff, emissive: 0x8899ff, emissiveIntensity: 0.25 }));
  scene.add(edge);
  return { water, curve, outline, depth: DEPTH };
}

// ============================================================== landmarks
function buildFlyer(scene) {
  const g = new THREE.Group();
  g.position.set(-62, 0, -40);
  g.rotation.y = 0.55;
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaabbff, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.4 });
  const R = 16, H = 20;
  for (const z of [-1.4, 1.4]) {
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, Math.hypot(H, 7), 8), white);
      leg.position.set(sx * 3.5, H / 2, z * 1.5);
      leg.rotation.z = sx * Math.atan2(7, H);
      g.add(leg);
    }
  }
  const wheel = new THREE.Group();
  wheel.position.y = H;
  g.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.28, 8, 120), white));
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R - 1.1, 0.12, 6, 120), white));
  const spokePts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    spokePts.push(0, 0, (i % 2 ? 0.6 : -0.6), Math.cos(a) * R, Math.sin(a) * R, 0);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(spokePts, 3));
  wheel.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.8 })));
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 16).rotateX(Math.PI / 2), white));
  const capsules = [];
  const capGeo = new THREE.CapsuleGeometry(0.55, 0.9, 4, 10).rotateZ(Math.PI / 2);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const m = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color().setHSL(i / 28, 0.9, 0.55), emissiveIntensity: 1.6 }));
    m.position.set(Math.cos(a) * (R + 0.9), Math.sin(a) * (R + 0.9), 0);
    wheel.add(m);
    capsules.push(m);
  }
  scene.add(g);
  return {
    update(t) {
      wheel.rotation.z = t * 0.06;
      capsules.forEach((c, i) => {
        c.rotation.z = -wheel.rotation.z; // capsules stay level
        c.material.emissive.setHSL((i / 28 + t * 0.05) % 1, 0.9, 0.55);
      });
    },
  };
}

function buildSupertrees(scene) {
  const trees = [];
  const spots = [[-36, -22, 15], [-28, -30, 12], [-24, -19, 9.5], [-40, -32, 11], [-31, -16, 8], [-21, -28, 10.5], [-44, -24, 8.5]];
  const lights = [];
  for (const [x, z, h] of spots) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const prof = [];
    for (let i = 0; i <= 12; i++) {
      const y = (i / 12) * h;
      const r = 1.1 - 0.75 * Math.sin((i / 12) * Math.PI * 0.5) + (i > 9 ? (i - 9) * 0.5 : 0);
      prof.push(new THREE.Vector2(Math.max(0.3, r), y));
    }
    const trunkGeo = new THREE.LatheGeometry(prof, 14);
    g.add(new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5b2a7a, emissive: 0x7a2bbf, emissiveIntensity: 0.5, roughness: 0.6 })));
    g.add(new THREE.Mesh(trunkGeo, new THREE.MeshBasicMaterial({ color: 0xd28bff, wireframe: true, transparent: true, opacity: 0.35 })));
    const canopyGeo = new THREE.CylinderGeometry(h * 0.33, 1.6, 2.4, 20, 2, true);
    const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({ color: 0x3a1450, emissive: 0xb44bff, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    canopy.position.y = h + 0.8;
    g.add(canopy);
    const wire = new THREE.Mesh(canopyGeo, new THREE.MeshBasicMaterial({ color: 0xffd36b, wireframe: true }));
    wire.position.y = h + 0.8;
    g.add(wire);
    // rim lights
    const n = 24, pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.set([Math.cos(a) * h * 0.33, h + 2, Math.sin(a) * h * 0.33], i * 3); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const lm = new THREE.PointsMaterial({ color: 0xffe08a, size: 0.7, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    g.add(new THREE.Points(lg, lm));
    lights.push({ canopy, lm, phase: Math.random() * 6 });
    scene.add(g);
    trees.push(g);
  }
  // OCBC skyway between the two tallest trees
  const a = new THREE.Vector3(-36, 10, -22), b = new THREE.Vector3(-28, 9, -30);
  const sky = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(8.2), b), 20, 0.25, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd36b, emissiveIntensity: 0.8 }));
  scene.add(sky);
  return {
    update(t) {
      for (const l of lights) {
        const k = 0.5 + 0.5 * Math.sin(t * 1.2 + l.phase);
        l.canopy.material.emissive.setHSL(0.78 - 0.12 * k, 0.9, 0.45);
        l.lm.opacity = 0.5 + 0.5 * k;
      }
    },
  };
}

function windowTexture(cols, rows, base = '#0d1b3a', lit = 0.55) {
  return canvasTexture(256, 512, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const on = Math.random() < lit;
      c.fillStyle = on ? `hsl(${40 + Math.random() * 20},90%,${65 + Math.random() * 20}%)` : '#1c2c55';
      c.fillRect(i * cw + cw * 0.18, j * rh + rh * 0.2, cw * 0.64, rh * 0.6);
    }
  });
}

function buildMBS(scene) {
  const g = new THREE.Group();
  g.position.set(2, 0, -30);
  const tex = windowTexture(10, 48);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xe8eeff, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.4 });
  const winMats = [towerMat];
  const H = 30;
  for (const x of [-11, 0, 11]) {
    for (const s of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.7, H, 6), towerMat);
      slab.position.set(x + s * 1.55, H / 2, 0);
      slab.rotation.z = -s * 0.045;
      slab.castShadow = true;
      g.add(slab);
    }
  }
  // SkyPark: ship-shaped deck spanning the towers with a cantilever
  const sh = new THREE.Shape();
  sh.moveTo(-17, -2.2); sh.lineTo(16, -2.2); sh.quadraticCurveTo(26, -1.5, 27.5, 0); sh.quadraticCurveTo(26, 1.5, 16, 2.2);
  sh.lineTo(-17, 2.2); sh.quadraticCurveTo(-19, 0, -17, -2.2);
  const deckGeo = new THREE.ExtrudeGeometry(sh, { depth: 1.3, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 2 });
  deckGeo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: 0xf5f7ff, emissive: 0x6677cc, emissiveIntensity: 0.35, roughness: 0.4 }));
  deck.position.y = H + 0.2;
  deck.castShadow = true;
  g.add(deck);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 1.4), new THREE.MeshBasicMaterial({ color: 0x5ff3ff }));
  pool.position.set(10, H + 1.75, 0.8);
  g.add(pool);
  for (let i = 0; i < 18; i++) { // rooftop palms
    const tr = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 6), new THREE.MeshStandardMaterial({ color: 0x2fae67, emissive: 0x0f5c35, emissiveIntensity: 0.6 }));
    tr.position.set(-15 + i * 1.7, H + 2.3, -1.2);
    g.add(tr);
  }
  // podium
  const pod = new THREE.Mesh(new THREE.BoxGeometry(34, 3, 9), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, emissive: 0x334488, emissiveIntensity: 0.4 }));
  pod.position.set(0, 1.5, 4);
  pod.receiveShadow = pod.castShadow = true;
  g.add(pod);
  // beacon lasers
  const beams = [];
  for (const x of [-11, 0, 11]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 120, 6, 1, true).translate(0, 60, 0),
      new THREE.MeshBasicMaterial({ color: 0x8be9ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    b.position.set(x, H + 1.6, 0);
    g.add(b);
    beams.push(b);
  }
  scene.add(g);
  return {
    winMats,
    update(t) { beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.4 + i * 2) * 0.5; b.rotation.x = Math.cos(t * 0.3 + i) * 0.3; }); },
  };
}

function buildArtScience(scene) {
  const g = new THREE.Group();
  g.position.set(23, 0, -6);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd6ee, emissiveIntensity: 0.12, roughness: 0.4, side: THREE.DoubleSide });
  const leaf = new THREE.Shape();
  leaf.moveTo(-1.8, 0); leaf.quadraticCurveTo(-2.2, 4, 0, 8); leaf.quadraticCurveTo(2.2, 4, 1.8, 0); leaf.lineTo(-1.8, 0);
  const lengths = [1.0, 0.8, 0.92, 0.7, 0.86, 1.05, 0.78, 0.95, 0.72, 0.88];
  lengths.forEach((L, i) => {
    const geo = new THREE.ExtrudeGeometry(leaf, { depth: 0.35, bevelEnabled: false, curveSegments: 10 });
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, p.getZ(k) + 0.06 * y * y); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    const a = (i / lengths.length) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    m.position.set(0, 1.2, 2.2);
    m.rotation.x = 0.42;
    m.scale.setScalar(L);
    m.castShadow = true;
    holder.add(m);
    g.add(holder);
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 1.4, 24), mat);
  base.position.y = 0.7;
  g.add(base);
  const glow = new THREE.PointLight(0xffb3e6, 8, 14, 2);
  glow.position.y = 3;
  g.add(glow);
  scene.add(g);
  return { update() {} };
}

function buildMerlion(scene) {
  const g = new THREE.Group();
  g.position.set(30, 0, 24);
  g.rotation.y = 2.2; // faces the bay centre (its local +Z)
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f7fb, emissive: 0x99aacc, emissiveIntensity: 0.25, roughness: 0.55 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 1.6, 20), new THREE.MeshStandardMaterial({ color: 0xc9cbd8 }));
  ped.position.y = 0.8;
  g.add(ped);
  // fish body: a curling tube with tapered radius
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.4, -1.6), new THREE.Vector3(0, 3, -0.6), new THREE.Vector3(0, 5.2, 0), new THREE.Vector3(0, 7, 0.2),
  ]);
  const body = new THREE.Mesh(new THREE.TubeGeometry(path, 24, 1.25, 14), white);
  body.castShadow = true;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.4, -1.6), new THREE.Vector3(0.3, 1.8, -3.2), new THREE.Vector3(-0.2, 3.2, -3.9), new THREE.Vector3(0, 4.2, -3.2),
  ]), 20, 0.55, 10), white);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 3), white);
  fin.position.set(0, 4.6, -3.1); fin.rotation.x = -0.6;
  g.add(fin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.45, 24, 18), white);
  head.position.set(0, 8.1, 0.5);
  head.scale.set(1, 1, 1.15);
  g.add(head);
  for (let i = 0; i < 14; i++) { // mane
    const a = (i / 14) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), white);
    m.position.set(Math.cos(a) * 1.35, 8.1 + Math.sin(a) * 1.35, 0.05);
    g.add(m);
  }
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), white);
  snout.position.set(0, 7.7, 1.8);
  g.add(snout);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: 0x223344 }));
  mouth.position.set(0, 7.45, 2.45);
  g.add(mouth);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(s * 0.6, 8.45, 1.75);
    g.add(eye);
  }
  scene.add(g);
  g.updateMatrixWorld(true);
  const mouthWorld = mouth.getWorldPosition(new THREE.Vector3());
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
  return { mouthWorld, forward };
}

// ============================================================== highways
function deckTexture() {
  const t = canvasTexture(256, 512, (c, w, h) => {
    c.fillStyle = '#3fae5e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2f8f4a'; c.fillRect(0, 0, w * 0.08, h); c.fillRect(w * 0.92, 0, w * 0.08, h);
    c.fillStyle = '#ffffff'; c.fillRect(w * 0.1, 0, 6, h); c.fillRect(w * 0.9 - 6, 0, 6, h);
    c.fillStyle = '#fff9c4'; for (let y = 0; y < h; y += 128) c.fillRect(w / 2 - 4, y, 8, 70);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function buildHighway(scene, pts, mats) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), true, 'centripetal');
  const length = curve.getLength();
  const N = Math.ceil(length / 1.0);
  const width = 9, thick = 0.6;
  const frames = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPointAt(t % 1), tan = curve.getTangentAt(t % 1);
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    frames.push({ p, tan, side });
  }
  // deck ribbon: top, bottom and two side walls
  const pos = [], uv = [], idx = [];
  const ring = (f, i) => {
    const hw = width / 2;
    const L = f.p.clone().addScaledVector(f.side, -hw), R = f.p.clone().addScaledVector(f.side, hw);
    const v = (i / N) * length / 6;
    const verts = [[L, 0, 0], [R, 0, 1], [R, -thick, 1], [L, -thick, 0]];
    for (const [q, dy, u] of verts) { pos.push(q.x, q.y + dy, q.z); uv.push(u, v); }
  };
  frames.forEach(ring);
  for (let i = 0; i < N; i++) {
    const a = i * 4, b = (i + 1) * 4;
    const quad = (p0, p1) => idx.push(a + p0, b + p0, a + p1, b + p0, b + p1, a + p1);
    quad(0, 1); quad(1, 2); quad(2, 3); quad(3, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const deck = new THREE.Mesh(geo, mats.deck);
  deck.castShadow = deck.receiveShadow = true;
  scene.add(deck);

  // white guardrails
  for (const s of [-1, 1]) {
    const railPts = frames.slice(0, N).map(f => f.p.clone().addScaledVector(f.side, s * (width / 2 - 0.15)).add(new THREE.Vector3(0, 0.75, 0)));
    const rc = new THREE.CatmullRomCurve3(railPts, true);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(rc, N, 0.1, 6, true), mats.rail));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(rc, N, 0.06, 4, true).translate(0, -0.35, 0), mats.rail));
  }
  // posts, pillars, lamps
  const postGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12).translate(0, 0.4, 0);
  const posts = new THREE.InstancedMesh(postGeo, mats.rail, Math.ceil(N / 2) * 2 + 2);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < N; i += 2) for (const s of [-1, 1]) {
    const f = frames[i];
    m.makeTranslation(f.p.x + f.side.x * s * (width / 2 - 0.15), f.p.y, f.p.z + f.side.z * s * (width / 2 - 0.15));
    posts.setMatrixAt(k++, m);
  }
  posts.count = k;
  scene.add(posts);
  const pillarGeo = new THREE.CylinderGeometry(0.55, 0.75, 1, 12).translate(0, 0.5, 0);
  const lampGeo = new THREE.SphereGeometry(0.28, 10, 8);
  for (let i = 0; i < N; i += 9) {
    const f = frames[i];
    const pil = new THREE.Mesh(pillarGeo, mats.pillar);
    pil.position.set(f.p.x, 0, f.p.z);
    pil.scale.y = Math.max(0.1, f.p.y - thick);
    pil.castShadow = true;
    scene.add(pil);
    if (i % 18 === 0) {
      const lamp = new THREE.Mesh(lampGeo, mats.lamp);
      lamp.position.copy(f.p).addScaledVector(f.side, width / 2 - 0.1).add(new THREE.Vector3(0, 2.4, 0));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5).translate(0, 1.2, 0), mats.rail);
      pole.position.copy(f.p).addScaledVector(f.side, width / 2 - 0.1);
      scene.add(lamp, pole);
    }
  }
  return { curve, length, frames, N, width };
}

// ====================================================== background city
function buildSkyline(scene, mats) {
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const tex = windowTexture(6, 20, '#14244a', 0.45);
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8c6ff, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.5 });
  mats.push(mat);
  const count = 75;
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let n = 0;
  while (n < count) {
    const x = rand(-130, 140), z = rand(-150, -70);
    if (x > 20 && z > -72) continue;
    const h = rand(6, 26) * (Math.abs(x) < 40 ? 0.8 : 1);
    s.set(rand(3, 7), h, rand(3, 7));
    p.set(x, 0, z);
    q.setFromAxisAngle(UP, rand(-0.2, 0.2));
    inst.setMatrixAt(n++, m.compose(p, q, s));
  }
  inst.castShadow = true;
  scene.add(inst);
}

function buildTrees(scene, spots) {
  const cone = new THREE.ConeGeometry(0.9, 2.6, 7).translate(0, 2.0, 0);
  const trunk = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 5).translate(0, 0.4, 0);
  const leaves = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ color: 0x47c46b, emissive: 0x0c4d27, emissiveIntensity: 0.6, roughness: 0.8 }), spots.length);
  const trunks = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x8a5a3c }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z], i) => {
    const sc = rand(0.7, 1.3);
    m.makeScale(sc, sc, sc).setPosition(x, 0, z);
    leaves.setMatrixAt(i, m); trunks.setMatrixAt(i, m);
  });
  leaves.castShadow = true;
  scene.add(leaves, trunks);
}

// ============================================================ the world
export function buildWorld(scene) {
  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 1 },
    uCam: { value: new THREE.Vector3() },
    uRipples: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, -1)) },
  };
  const sky = buildSky(scene, uniforms);
  const bay = buildBay(scene, uniforms);
  buildGround(scene, bay.outline);
  const flyer = buildFlyer(scene);
  const trees = buildSupertrees(scene);
  const mbs = buildMBS(scene);
  const art = buildArtScience(scene);
  const merlion = buildMerlion(scene);

  const mats = {
    deck: new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.7, emissive: 0x0c3a1c, emissiveIntensity: 0.5 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc8d8ff, emissiveIntensity: 0.3 }),
    pillar: new THREE.MeshStandardMaterial({ color: 0xe9ecf7, roughness: 0.6 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff1b0 }),
  };
  const highways = [
    buildHighway(scene, [[-20, 5, -10], [-23, 6, -40], [-6, 8, -52], [16, 8, -52], [27, 7, -38], [13, 6, -18], [9, 5, 4], [-4, 4.5, 11], [-16, 4.5, 4]], mats),
    buildHighway(scene, [[-68, 4.5, 12], [-60, 5, -12], [-46, 8, -6], [-28, 12, 0], [-10, 12.5, 16], [8, 9, 28], [2, 5.5, 40], [-30, 4.5, 36], [-56, 4.5, 30]], mats),
  ];

  const winMats = [...mbs.winMats];
  buildSkyline(scene, winMats);

  // free plots for drawn houses and towers (and decorative trees)
  const samples = highways.flatMap(h => h.frames.filter((_, i) => i % 2 === 0).map(f => f.p));
  const free = (x, z, clear) =>
    !pointInPoly(x, z, BAY_OUTLINE) &&
    LANDMARKS.every(l => Math.hypot(x - l.x, z - l.z) > l.r + clear) &&
    samples.every(p => Math.hypot(x - p.x, z - p.z) > 7 + clear) &&
    BAY_OUTLINE.every(([bx, bz]) => Math.hypot(x - bx, z - bz) > 3);
  const plots = [];
  for (let x = -76; x <= 26; x += 8) for (let z = -48; z <= 44; z += 8) {
    const jx = x + rand(-1.2, 1.2), jz = z + rand(-1.2, 1.2);
    if (free(jx, jz, 1.5)) plots.push({ x: jx, z: jz, used: false, score: -Math.abs(jz - 26) * 0.5 - Math.abs(jx + 12) * 0.35 + rand(0, 10) });
  }
  plots.sort((a, b) => b.score - a.score);
  const treeSpots = [];
  for (let i = 0; i < 260; i++) {
    const x = rand(-90, 26), z = rand(-55, 60);
    if (free(x, z, 0) && plots.every(p => Math.hypot(p.x - x, p.z - z) > 3.2)) treeSpots.push([x, z]);
  }
  buildTrees(scene, treeSpots);

  let rippleIdx = 0;
  return {
    uniforms, highways, plots, bay, merlion, winMats, sky,
    bayCenter: new THREE.Vector3(66, 0, -12),
    addRipple(x, z) {
      uniforms.uRipples.value[rippleIdx].set(x, z, uniforms.uTime.value);
      rippleIdx = (rippleIdx + 1) % 8;
    },
    update(t, dt, camera) {
      uniforms.uTime.value = t;
      uniforms.uCam.value.copy(camera.position);
      flyer.update(t);
      trees.update(t);
      mbs.update(t);
      art.update(t);
    },
  };
}
