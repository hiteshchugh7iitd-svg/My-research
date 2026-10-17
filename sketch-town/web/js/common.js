// Shared helpers for the operator station and the projection wall.

export const BUS_NAME = 'sketch_town_hardware_bus';

export async function loadTemplates() {
  const res = await fetch('/shared/templates.json');
  const data = await res.json();
  data.byId = Object.fromEntries(data.templates.map(t => [t.id, t]));
  return data;
}

// ------------------------------------------------------------ sheet drawing
function pathPoly(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

export function silhouettePath(ctx, tpl) {
  ctx.beginPath();
  for (const part of tpl.parts) {
    part.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  for (const w of tpl.wheels || []) {
    ctx.moveTo(w.c[0] + w.r, w.c[1]);
    ctx.arc(w.c[0], w.c[1], w.r, 0, Math.PI * 2);
  }
}

export function drawOutline(ctx, sheet, tpl, lineScale = 1) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = sheet.stroke * lineScale;
  for (const part of tpl.parts) { pathPoly(ctx, part.poly); ctx.stroke(); }
  for (const w of tpl.wheels || []) {
    ctx.beginPath(); ctx.arc(w.c[0], w.c[1], w.r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w.c[0], w.c[1], w.r * 0.42, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.lineWidth = sheet.stroke * 0.75 * lineScale;
  for (const [x, y, w, h] of tpl.windows || []) ctx.strokeRect(x, y, w, h);
  for (const d of tpl.details || []) {
    if (d.t === 'poly') { pathPoly(ctx, d.pts); ctx.stroke(); }
    else if (d.t === 'line') { pathPoly(ctx, d.pts, false); ctx.stroke(); }
    else if (d.t === 'rect') ctx.strokeRect(...d.r);
    else if (d.t === 'circle') { ctx.beginPath(); ctx.arc(d.c[0], d.c[1], d.r, 0, Math.PI * 2); ctx.stroke(); }
    else if (d.t === 'ellipse') { ctx.beginPath(); ctx.ellipse(d.c[0], d.c[1], d.rx, d.ry, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}

export function drawMarkers(ctx, sheet, tpl) {
  const { w, h } = sheet;
  const { size: s, margin: m, hole } = sheet.fiducial;
  ctx.save();
  ctx.fillStyle = '#000';
  const corners = [[m, m], [w - m - s, m], [w - m - s, h - m - s], [m, h - m - s]];
  corners.forEach(([x, y], i) => {
    ctx.fillRect(x, y, s, s);
    if (i === 0) { // hollow top-left square tells the scanner which way is up
      const hs = s * hole, o = (s - hs) / 2;
      ctx.fillStyle = '#fff'; ctx.fillRect(x + o, y + o, hs, hs); ctx.fillStyle = '#000';
    }
  });
  const c = sheet.code;
  c.xs.forEach((x, i) => {
    const on = (tpl.code >> i) & 1;
    if (on) ctx.fillRect(x - c.size / 2, c.y - c.size / 2, c.size, c.size);
    else { ctx.lineWidth = 3; ctx.strokeRect(x - c.size / 2 + 1.5, c.y - c.size / 2 + 1.5, c.size - 3, c.size - 3); }
  });
  ctx.restore();
}

export function drawLabels(ctx, sheet, tpl) {
  ctx.save();
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif';
  ctx.fillText(`${tpl.name_ja}  ${tpl.name_en}`, sheet.w / 2, 82);
  ctx.font = '28px "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('なまえ Name: ____________', 170, sheet.code.y);
  ctx.textAlign = 'right';
  ctx.fillText('ぬってスキャン! Color & scan!', sheet.w - 170, sheet.code.y);
  ctx.restore();
}

export function drawSheet(ctx, sheet, tpl) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, sheet.w, sheet.h);
  drawMarkers(ctx, sheet, tpl);
  drawLabels(ctx, sheet, tpl);
  drawOutline(ctx, sheet, tpl);
}

// A4 landscape @300dpi printable coloring sheet (geometry identical to the canonical sheet).
export function renderPrintSheet(sheet, tpl) {
  const A4W = 3508, A4H = 2480;
  const cv = document.createElement('canvas');
  cv.width = A4W; cv.height = A4H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, A4W, A4H);
  const k = 2200 / sheet.h;
  ctx.translate((A4W - sheet.w * k) / 2, (A4H - sheet.h * k) / 2);
  ctx.scale(k, k);
  drawSheet(ctx, sheet, tpl);
  return cv;
}

// ------------------------------------------------- demo / sample textures
const CRAYONS = ['#ff4d4d', '#ff9f1c', '#ffd23f', '#3ec300', '#00b4d8', '#3a86ff', '#8338ec', '#ff5fa2', '#06d6a0', '#ff7b00'];

export function crayonPattern(color, alpha = 0.9) {
  const p = document.createElement('canvas');
  p.width = p.height = 48;
  const c = p.getContext('2d');
  c.fillStyle = color;
  for (let i = 0; i < 900; i++) {
    c.globalAlpha = alpha * (0.35 + Math.random() * 0.65);
    c.fillRect(Math.random() * 48, Math.random() * 48, 1 + Math.random() * 2.5, 1 + Math.random() * 1.5);
  }
  return p;
}

export function makeDemoTexture(sheet, tpl, rnd = Math.random) {
  const cv = document.createElement('canvas');
  cv.width = sheet.w; cv.height = sheet.h;
  const ctx = cv.getContext('2d');
  const pick = () => CRAYONS[Math.floor(rnd() * CRAYONS.length)];
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sheet.w, sheet.h);
  for (const part of tpl.parts) {
    pathPoly(ctx, part.poly);
    ctx.fillStyle = part.sail ? '#ffffff' : pick();
    ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = ctx.createPattern(crayonPattern(pick()), 'repeat');
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) { // crayon stripes / dots
      if (rnd() < 0.5) ctx.fillRect(0, 200 + rnd() * 800, sheet.w, 30 + rnd() * 60);
      else { ctx.beginPath(); ctx.arc(300 + rnd() * 1000, 250 + rnd() * 700, 30 + rnd() * 70, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  for (const w of tpl.wheels || []) {
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(w.c[0], w.c[1], w.r, 0, 7); ctx.fill();
    ctx.fillStyle = pick(); ctx.beginPath(); ctx.arc(w.c[0], w.c[1], w.r * 0.42, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#ffe680';
  for (const [x, y, w, h] of tpl.windows || []) ctx.fillRect(x, y, w, h);
  for (const d of tpl.details || []) if (d.t === 'poly') { pathPoly(ctx, d.pts); ctx.fillStyle = '#bfe9ff'; ctx.fill(); }
  drawOutline(ctx, sheet, tpl);
  // alpha-cut to the silhouette, like the scanner pipeline does
  const out = document.createElement('canvas');
  out.width = 1024; out.height = 768;
  const o = out.getContext('2d');
  o.scale(1024 / sheet.w, 768 / sheet.h);
  silhouettePath(o, tpl);
  o.lineWidth = sheet.stroke * 2;
  o.fill(); o.stroke();
  o.globalCompositeOperation = 'source-in';
  o.drawImage(cv, 0, 0);
  return out;
}

// --------------------------------------------------------------- event bus
// Server-Sent Events from the local server, plus a BroadcastChannel so two
// windows of the same browser still talk if the server is briefly unreachable.
export class Bus {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.seen = new Set();
    this.connected = false;
    this.onStatus = () => {};
    try {
      this.bc = new BroadcastChannel(BUS_NAME);
      this.bc.onmessage = e => this.dispatch(e.data);
    } catch { this.bc = null; }
    this.connect();
  }
  connect() {
    this.es = new EventSource('/api/events');
    this.es.onopen = () => { this.connected = true; this.onStatus(true); };
    this.es.onerror = () => { this.connected = false; this.onStatus(false); };
    this.es.onmessage = e => { try { this.dispatch(JSON.parse(e.data)); } catch (err) { console.warn(err); } };
  }
  dispatch(ev) {
    if (!ev) return;
    if (ev.id) {
      if (this.seen.has(ev.id)) return;
      this.seen.add(ev.id);
      if (this.seen.size > 2000) this.seen = new Set([...this.seen].slice(-1000));
    }
    this.onEvent(ev);
  }
  // Send a command to every display. Falls back to the BroadcastChannel when offline.
  async command(cmd) {
    try {
      const r = await fetch('/api/command', { method: 'POST', body: JSON.stringify(cmd) });
      if (!r.ok) throw new Error(r.statusText);
      return await r.json();
    } catch {
      const ev = { type: 'command', command: cmd, id: crypto.randomUUID() };
      this.bc?.postMessage(ev);
      return ev;
    }
  }
  local(ev) { ev.id ||= crypto.randomUUID(); this.bc?.postMessage(ev); }
}
